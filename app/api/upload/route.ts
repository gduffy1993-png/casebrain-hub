import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { extractCaseFacts, summariseDocument } from "@/lib/ai";
import { redact } from "@/lib/redact";
import { appendAuditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import {
  detectRiskFlags,
  storeRiskFlags,
  notifyHighSeverityFlags,
} from "@/lib/risk";
import { extractEntitiesFromText } from "@/lib/knowledge";

export const runtime = "nodejs";

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
const MAX_UPLOAD_BYTES = env.FILE_UPLOAD_MAX_MB * 1024 * 1024;

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`upload:${userId}`, { limit: 10, windowMs: 60_000 });

  const formData = await request.formData();
  const files = formData.getAll("files").filter(isFile);
  const caseTitle =
    (formData.get("caseTitle") as string | null)?.trim() ?? undefined;

  if (!files.length) {
    return NextResponse.json(
      { error: "No files provided" },
      { status: 400 },
    );
  }

  if (!caseTitle) {
    return NextResponse.json(
      { error: "Case title is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: existingCase } = await supabase
    .from("cases")
    .select("id")
    .eq("org_id", orgId)
    .eq("title", caseTitle)
    .maybeSingle();

  let caseId = existingCase?.id;

  if (!caseId) {
    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        org_id: orgId,
        title: caseTitle,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (caseError || !newCase) {
      return NextResponse.json(
        { error: "Failed to create case" },
        { status: 500 },
      );
    }

    caseId = newCase.id;
  }

  const documentIds: string[] = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `${file.name} exceeds ${env.FILE_UPLOAD_MAX_MB}MB limit`,
        },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract text with error handling for corrupted PDFs
    let text: string;
    let extractionError: string | null = null;
    try {
      text = await extractTextFromFile(file, buffer);
    } catch (error) {
      console.error(`[upload] Failed to extract text from ${file.name}`, error);
      extractionError = error instanceof Error ? error.message : "Unknown extraction error";
      
      // For PDFs, try to continue with empty text (file will still be stored)
      if (file.type === "application/pdf") {
        text = `[PDF extraction failed: ${extractionError}. File stored but text extraction unavailable. Please re-upload a valid PDF or use OCR if needed.]`;
      } else {
        // For other file types, return error
        return NextResponse.json(
          {
            error: `Failed to extract text from ${file.name}: ${extractionError}`,
            suggestion: file.type === "application/pdf"
              ? "The PDF may be corrupted or password-protected. Try re-saving it or removing password protection."
              : "Please check the file format and try again.",
          },
          { status: 400 },
        );
      }
    }
    
    const { redactedText, map: redactionMap } = redact(
      text,
      env.REDACTION_SECRET,
    );
    
    // Only attempt AI extraction if we have valid text (not an error message)
    let extracted;
    let summary: string | null = null;
    let enrichedExtraction;
    
    if (extractionError) {
      // Create minimal extraction for corrupted files
      extracted = {
        summary: `Document uploaded but text extraction failed: ${extractionError}`,
        parties: [],
        dates: [],
        amounts: [],
        keyIssues: [],
        timeline: [],
      };
      summary = null;
      enrichedExtraction = {
        ...extracted,
        aiSummary: null,
        extractionError,
      };
    } else {
      try {
        extracted = await extractCaseFacts({
          documentText: redactedText,
          documentName: file.name,
          orgId,
        });
        const summaryResult = await summariseDocument(redactedText);
        summary = summaryResult.summary;
        enrichedExtraction = {
          ...extracted,
          aiSummary: summary,
        };
      } catch (error) {
        console.error(`[upload] Failed to extract case facts from ${file.name}`, error);
        // Fallback extraction
        extracted = {
          summary: `Document uploaded but AI extraction encountered an error.`,
          parties: [],
          dates: [],
          amounts: [],
          keyIssues: [],
          timeline: [],
        };
        summary = null;
        enrichedExtraction = {
          ...extracted,
          aiSummary: null,
          extractionError: error instanceof Error ? error.message : "AI extraction failed",
        };
      }
    }

    const storagePath = `${orgId}/${caseId}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json(
        { error: "Failed to store file" },
        { status: 500 },
      );
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        case_id: caseId,
        org_id: orgId,
        name: file.name,
        type: file.type,
        storage_url: `${STORAGE_BUCKET}/${storagePath}`,
        extracted_json: enrichedExtraction,
        uploaded_by: userId,
        redaction_map: redactionMap,
      })
      .select("id")
      .maybeSingle();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Failed to index document" },
        { status: 500 },
      );
    }

    documentIds.push(document.id);

    // Fetch case record for practice area before risk detection
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .maybeSingle();

    const riskCandidates = detectRiskFlags({
      orgId,
      caseId,
      sourceType: "document",
      sourceId: document.id,
      documentName: file.name,
      text: redactedText,
      extractedFacts: {
        practiceArea: caseRecord?.practice_area,
        housingMeta: extracted.housingMeta
          ? {
              hhsrs_category_1_hazards: extracted.housingMeta.hhsrsHazards?.filter((h) =>
                ["damp", "mould", "structural"].includes(h.toLowerCase()),
              ),
              hhsrs_category_2_hazards: extracted.housingMeta.hhsrsHazards?.filter(
                (h) => !["damp", "mould", "structural"].includes(h.toLowerCase()),
              ),
              unfit_for_habitation: extracted.housingMeta.unfitForHabitation ?? false,
              tenant_vulnerability: extracted.housingMeta.tenantVulnerability ?? [],
            }
          : undefined,
        dates: extracted.dates,
        timeline: extracted.timeline,
      },
    });

    let storedRiskFlags = [];
    if (riskCandidates.length) {
      storedRiskFlags = await storeRiskFlags(supabase, riskCandidates);
      await notifyHighSeverityFlags(storedRiskFlags, userId);
    }

    await extractEntitiesFromText({
      client: supabase,
      orgId,
      caseId,
      text: redactedText,
    });

    // Update case summary only if we have a valid summary
    if (summary) {
      await supabase
        .from("cases")
        .update({
          summary: summary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);
    }

    // If this is a PI case and we have piMeta, upsert to pi_cases
    if (
      caseRecord &&
      (caseRecord.practice_area === "pi" ||
        caseRecord.practice_area === "clinical_negligence") &&
      extracted.piMeta
    ) {
      const piMeta = extracted.piMeta;
      await supabase.from("pi_cases").upsert(
        {
          id: caseId,
          org_id: orgId,
          case_type:
            caseRecord.practice_area === "clinical_negligence"
              ? "clinical_negligence"
              : "pi",
          oic_track: piMeta.oicTrack ?? null,
          injury_summary: piMeta.injurySummary ?? null,
          whiplash_tariff_band: piMeta.whiplashTariffBand ?? null,
          prognosis_months_min: piMeta.prognosisMonthsMin ?? null,
          prognosis_months_max: piMeta.prognosisMonthsMax ?? null,
          psych_injury: piMeta.psychInjury ?? null,
          treatment_recommended: piMeta.treatmentRecommended ?? null,
          medco_reference: piMeta.medcoReference ?? null,
          liability_stance: piMeta.liabilityStance ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    }

    // If this is a housing disrepair case and we have housingMeta, upsert to housing_cases (only if extraction succeeded)
    if (
      !extractionError &&
      caseRecord &&
      caseRecord.practice_area === "housing_disrepair" &&
      extracted.housingMeta
    ) {
      const housingMeta = extracted.housingMeta;
      const firstReportDate = housingMeta.propertyDefects?.[0]?.firstReported
        ? new Date(housingMeta.propertyDefects[0].firstReported)
        : null;

      await supabase.from("housing_cases").upsert(
        {
          id: caseId,
          org_id: orgId,
          tenant_vulnerability: housingMeta.tenantVulnerability ?? [],
          first_report_date: firstReportDate?.toISOString().split("T")[0] ?? null,
          repair_attempts_count: housingMeta.repairAttempts ?? 0,
          no_access_days_total: housingMeta.noAccessDays ?? 0,
          unfit_for_habitation: housingMeta.unfitForHabitation ?? false,
          hhsrs_category_1_hazards: housingMeta.hhsrsHazards ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      // Save defects
      if (housingMeta.propertyDefects) {
        for (const defect of housingMeta.propertyDefects) {
          await supabase.from("housing_defects").insert({
            case_id: caseId,
            org_id: orgId,
            defect_type: defect.type,
            location: defect.location ?? null,
            severity: defect.severity ?? null,
            first_reported_date: defect.firstReported
              ? new Date(defect.firstReported).toISOString().split("T")[0]
              : null,
            hhsrs_category: housingMeta.hhsrsHazards?.includes(defect.type)
              ? "category_1"
              : "none",
          });
        }
      }

      // Save landlord responses
      if (housingMeta.landlordResponses) {
        for (const response of housingMeta.landlordResponses) {
          await supabase.from("housing_landlord_responses").insert({
            case_id: caseId,
            org_id: orgId,
            response_date: new Date(response.date).toISOString().split("T")[0],
            response_type: response.type,
            response_text: response.text ?? null,
          });
        }
      }
    }

    await appendAuditLog({
      caseId,
      userId,
      action: "document_uploaded",
      details: {
        documentId: document.id,
        name: file.name,
        type: file.type,
        redactions: redactionMap.length,
        riskFlags: storedRiskFlags.length,
      },
    });
  }

  return NextResponse.json({ caseId, documentIds }, { status: 201 });
}

async function extractTextFromFile(file: File, buffer: Buffer): Promise<string> {
  if (file.type === "application/pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer, {
        // Options to handle corrupted PDFs more gracefully
        max: 0, // Parse all pages
      });
      return result.text || "";
    } catch (error) {
      // Re-throw with more context
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}. The PDF may be corrupted, password-protected, or use an unsupported format.`,
      );
    }
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (error) {
      throw new Error(
        `DOCX parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // For plain text files, try UTF-8 first, then fallback to latin1
  try {
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("latin1");
  }
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File;
}

