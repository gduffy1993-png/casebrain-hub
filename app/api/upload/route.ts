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
import { canUploadPDF, canCreateCase, recordPDFUpload, recordCaseChange } from "@/lib/paywall-bridge";

export const runtime = "nodejs";

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
const MAX_UPLOAD_BYTES = env.FILE_UPLOAD_MAX_MB * 1024 * 1024;

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`upload:${userId}`, { limit: 10, windowMs: 60_000 });

  // PAYWALL: Check if user can upload PDFs
  const uploadCheck = await canUploadPDF();
  if (!uploadCheck.allowed) {
    return NextResponse.json(
      {
        error: uploadCheck.error,
        limit: uploadCheck.limit,
        plan: uploadCheck.plan,
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter(isFile);
  const caseTitle =
    (formData.get("caseTitle") as string | null)?.trim() ?? undefined;
  const practiceArea =
    (formData.get("practiceArea") as string | null)?.trim() ?? "other_litigation";

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

  const { data: existingCase, error: caseLookupError } = await supabase
    .from("cases")
    .select("id, title")
    .eq("org_id", orgId)
    .eq("title", caseTitle)
    .maybeSingle();

  if (caseLookupError) {
    console.error("[upload] Error looking up case:", caseLookupError);
    return NextResponse.json(
      { error: "Failed to lookup case", details: caseLookupError.message },
      { status: 500 },
    );
  }

  let caseId = existingCase?.id;
  let isNewCase = false;

  if (!caseId) {
    // PAYWALL: Check if user can create a new case
    const caseCheck = await canCreateCase();
    if (!caseCheck.allowed) {
      return NextResponse.json(
        {
          error: caseCheck.error,
          limit: caseCheck.limit,
          plan: caseCheck.plan,
        },
        { status: 403 },
      );
    }

    console.log(`[upload] Creating new case: "${caseTitle}" for org ${orgId}`);
    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        org_id: orgId,
        title: caseTitle,
        created_by: userId,
        practice_area: practiceArea,
      })
      .select("id")
      .maybeSingle();

    if (caseError || !newCase) {
      console.error("[upload] Failed to create case:", caseError);
      return NextResponse.json(
        { error: "Failed to create case", details: caseError?.message },
        { status: 500 },
      );
    }

    caseId = newCase.id;
    isNewCase = true;
    console.log(`[upload] Created new case with ID: ${caseId}`);
  } else {
    console.log(`[upload] Using existing case ID: ${caseId} for "${caseTitle}"`);
  }

  const documentIds: string[] = [];
  const skippedFiles: string[] = [];

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

    // Check for duplicate file (same name in same case)
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id, name")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .eq("name", file.name)
      .maybeSingle();

    if (existingDoc) {
      console.log(`[upload] Duplicate file detected: ${file.name} - skipping upload`);
      skippedFiles.push(file.name);
      // Skip this file but continue with others
      continue;
    }

    const storagePath = `${orgId}/${caseId}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error(`[upload] Storage error for ${file.name}:`, storageError);
      return NextResponse.json(
        { error: `Failed to store file: ${file.name}` },
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
      .select("id, name, case_id, org_id")
      .maybeSingle();

    if (docError) {
      console.error(`[upload] Failed to insert document ${file.name}:`, docError);
      return NextResponse.json(
        { error: `Failed to index document: ${file.name}`, details: docError.message },
        { status: 500 },
      );
    }

    if (!document) {
      console.error(`[upload] Document insert returned no data for ${file.name}`);
      return NextResponse.json(
        { error: `Failed to index document: ${file.name} - no data returned` },
        { status: 500 },
      );
    }

    console.log(`[upload] Successfully inserted document: ${file.name} (ID: ${document.id}, Case: ${document.case_id}, Org: ${document.org_id})`);
    documentIds.push(document.id);

    // Auto-run bundle analysis for PDFs (Phase A)
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const { summariseBundlePhaseA } = await import("@/lib/bundle-navigator");
        // Extract page count from text (look for "Page X of Y" patterns)
        const pageCountMatch = text.match(/(?:page|p\.?)\s*(\d+)\s*(?:of|\/)\s*(\d+)/i) ||
          text.match(/page\s+(\d+)/gi);
        const pageCount = pageCountMatch 
          ? (pageCountMatch[0].match(/\d+/g)?.[1] ? parseInt(pageCountMatch[0].match(/\d+/g)![1]) : undefined)
          : undefined;
        
        await summariseBundlePhaseA({
          caseId,
          orgId,
          bundleId: document.id,
          bundleName: file.name,
          textContent: text.substring(0, 50000), // Limit to first 50k chars for Phase A
          pageCount,
        });
      } catch (bundleError) {
        console.error(`[upload] Failed to run bundle analysis for ${file.name}:`, bundleError);
        // Don't fail the upload if bundle analysis fails
      }
    }

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
      (caseRecord.practice_area === "personal_injury" ||
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

    // If this is a housing disrepair case, upsert to housing_cases
    // Try to extract from housingMeta first, then fall back to inferring from extracted text
    if (
      caseRecord &&
      caseRecord.practice_area === "housing_disrepair"
    ) {
      let housingMeta = extracted.housingMeta;
      let firstReportDate: Date | null = null;
      let landlordType: string | null = null;
      let tenantVulnerability: string[] = [];
      let hhsrsCategory1Hazards: string[] = [];

      // If we have housingMeta, use it
      if (housingMeta) {
        firstReportDate = housingMeta.propertyDefects?.[0]?.firstReported
          ? new Date(housingMeta.propertyDefects[0].firstReported)
          : null;
        tenantVulnerability = housingMeta.tenantVulnerability ?? [];
        hhsrsCategory1Hazards = housingMeta.hhsrsHazards ?? [];
      }

      // Infer from extracted text if housingMeta is missing
      if (!housingMeta && !extractionError && extracted.summary) {
        const textLower = (extracted.summary + " " + extracted.keyIssues.join(" ") + " " + extracted.timeline.map(t => t.description).join(" ")).toLowerCase();
        
        // Detect social landlord from text
        if (textLower.includes("metropolitan") || 
            textLower.includes("thames valley") ||
            textLower.includes("housing association") ||
            textLower.includes("council") ||
            textLower.includes("social housing") ||
            textLower.includes("social landlord")) {
          landlordType = "social";
        }

        // Extract first report date from timeline
        const firstReportEvent = extracted.timeline.find(t => 
          t.label.toLowerCase().includes("initial report") ||
          t.label.toLowerCase().includes("first report") ||
          t.label.toLowerCase().includes("first complaint")
        );
        if (firstReportEvent) {
          try {
            firstReportDate = new Date(firstReportEvent.date);
          } catch {
            // Invalid date, ignore
          }
        }

        // Detect tenant vulnerability from text
        if (textLower.includes("child") || textLower.includes("2-year-old") || textLower.includes("daughter")) {
          tenantVulnerability.push("Child under 5");
        }
        if (textLower.includes("asthma") || textLower.includes("respiratory") || textLower.includes("health")) {
          tenantVulnerability.push("Health symptoms");
        }

        // Detect Category 1 hazard
        if (textLower.includes("category 1") || textLower.includes("cat 1") || textLower.includes("severe")) {
          hhsrsCategory1Hazards.push("damp");
          hhsrsCategory1Hazards.push("mould");
        }
      }

      // Also check landlord name from parties
      const landlordParty = extracted.parties?.find(p => 
        p.role === "defendant" || 
        p.role === "opponent" ||
        p.name.toLowerCase().includes("housing") ||
        p.name.toLowerCase().includes("landlord")
      );
      if (landlordParty && !landlordType) {
        const landlordNameLower = landlordParty.name.toLowerCase();
        if (landlordNameLower.includes("metropolitan") ||
            landlordNameLower.includes("thames valley") ||
            landlordNameLower.includes("housing association") ||
            landlordNameLower.includes("council")) {
          landlordType = "social";
        }
      }

      await supabase.from("housing_cases").upsert(
        {
          id: caseId,
          org_id: orgId,
          tenant_vulnerability: tenantVulnerability,
          first_report_date: firstReportDate?.toISOString().split("T")[0] ?? null,
          landlord_type: landlordType,
          repair_attempts_count: housingMeta?.repairAttempts ?? 0,
          no_access_days_total: housingMeta?.noAccessDays ?? 0,
          unfit_for_habitation: housingMeta?.unfitForHabitation ?? false,
          hhsrs_category_1_hazards: hhsrsCategory1Hazards,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      // Save defects (only if we have housingMeta with defects)
      if (housingMeta?.propertyDefects && housingMeta.propertyDefects.length > 0) {
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
            hhsrs_category: hhsrsCategory1Hazards.includes(defect.type)
              ? "category_1"
              : "none",
          });
        }
      } else if (!extractionError && extracted.summary) {
        // Infer defects from extracted text if housingMeta is missing
        const textLower = extracted.summary.toLowerCase();
        const defects: Array<{ type: string; location?: string; severity?: string }> = [];
        
        if (textLower.includes("damp") || textLower.includes("mould")) {
          defects.push({ type: "mould", severity: "severe" });
        }
        if (textLower.includes("leak")) {
          defects.push({ type: "leak", severity: "medium" });
        }
        
        for (const defect of defects) {
          await supabase.from("housing_defects").insert({
            case_id: caseId,
            org_id: orgId,
            defect_type: defect.type,
            location: defect.location ?? null,
            severity: defect.severity ?? null,
            first_reported_date: firstReportDate?.toISOString().split("T")[0] ?? null,
            hhsrs_category: hhsrsCategory1Hazards.includes(defect.type) ? "category_1" : "none",
          });
        }
      }

      // Save landlord responses (only if we have housingMeta)
      if (housingMeta?.landlordResponses && housingMeta.landlordResponses.length > 0) {
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
      eventType: "UPLOAD_COMPLETED",
      meta: {
        documentId: document.id,
        name: file.name,
        type: file.type,
        redactions: redactionMap.length,
        riskFlags: storedRiskFlags.length,
      },
    });
  }

  // PAYWALL: Record usage after successful upload
  try {
    await recordPDFUpload();
    if (isNewCase) {
      await recordCaseChange();
    }
  } catch (usageError) {
    console.error("[upload] Failed to record usage:", usageError);
    // Don't fail the upload if usage recording fails
  }

  console.log(`[upload] Upload complete. Case: ${caseId}, Documents: ${documentIds.length}, Skipped: ${skippedFiles.length}`);
  
  return NextResponse.json({ 
    caseId, 
    documentIds,
    skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
    message: skippedFiles.length > 0 
      ? `${skippedFiles.length} duplicate file(s) skipped: ${skippedFiles.join(", ")}`
      : undefined,
    success: true,
    uploadedCount: documentIds.length
  }, { status: 201 });
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

