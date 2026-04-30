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
import { paywallGuard } from "@/lib/paywall/guard";
import { incrementUsage } from "@/lib/paywall/usage";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getTrialStatus } from "@/lib/paywall/trialLimits";
import { trialLimit402Body } from "@/lib/paywall/trialLimit402";
import { extractCriminalCaseMeta, persistCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import { normalizePracticeArea } from "@/lib/types/casebrain";
import { expandZipsToFolderCaseGroups } from "@/lib/upload/zip-to-case-groups";

export const runtime = "nodejs";

type UploadJob = { caseId: string; files: File[] };

async function createCaseForUpload(params: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  orgId: string;
  userId: string;
  email: string | null;
  title: string;
  practiceArea: ReturnType<typeof normalizePracticeArea>;
}): Promise<{ ok: true; caseId: string } | { ok: false; response: NextResponse }> {
  const { supabase, orgId, userId, email, title, practiceArea } = params;
  try {
    const trialStatus = await getTrialStatus({
      supabase,
      orgId,
      userId,
      email,
    });
    if (trialStatus.isBlocked && trialStatus.reason === "CASE_LIMIT") {
      return {
        ok: false,
        response: NextResponse.json(
          trialLimit402Body("CASE_LIMIT", trialStatus),
          { status: 402 },
        ),
      };
    }
  } catch (trialError) {
    console.error("[upload] Trial status check failed, allowing case creation:", trialError);
  }

  const { data: newCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      org_id: orgId,
      title,
      created_by: userId,
      practice_area: practiceArea,
    })
    .select("id")
    .maybeSingle();

  if (caseError || !newCase) {
    console.error("[upload] Failed to create case:", caseError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Failed to create case", details: caseError?.message },
        { status: 500 },
      ),
    };
  }

  if (practiceArea === "criminal") {
    try {
      await supabase.from("criminal_cases").upsert(
        { id: newCase.id, org_id: orgId },
        { onConflict: "id" },
      );
    } catch (e) {
      console.warn("[upload] criminal_cases upsert failed (non-fatal):", e);
    }
  }

  return { ok: true, caseId: newCase.id };
}

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
const MAX_UPLOAD_BYTES = env.FILE_UPLOAD_MAX_MB * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 20;

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  
  // Get user object to check email
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Extract email from user object
  const email = 
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    null;

  // ============================================
  // BULLETPROOF OWNER CHECK - FIRST THING
  // ============================================
  const { isOwnerUser } = await import("@/lib/paywall/owner");
  const isOwner = isOwnerUser({ userId, email });
  
  console.log("[upload] 🔍 OWNER CHECK:", { userId, email, isOwner });
  
  let paywallOrgId: string;
  
  if (isOwner) {
    console.log(`[upload] ✅✅✅ OWNER BYPASS - userId: ${userId}, email: ${email} - SKIPPING ALL PAYWALL`);
    // Skip paywall guard entirely for owners
    const org = await getOrCreateOrganisationForUser(user);
    paywallOrgId = org.id;
  } else {
    assertRateLimit(`upload:${userId}`, { limit: 10, windowMs: 60_000 });
    const guard = await paywallGuard("upload");
    if (!guard.allowed) {
      return guard.response!;
    }
    paywallOrgId = guard.orgId!;
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter(isFile);
  const caseTitle =
    (formData.get("caseTitle") as string | null)?.trim() ?? undefined;
  const practiceArea =
    (formData.get("practiceArea") as string | null)?.trim() ?? "other_litigation";
  const normalizedProvidedPracticeArea = normalizePracticeArea(practiceArea);
  const providedCaseId = (formData.get("caseId") as string | null)?.trim() ?? undefined;
  const uploadModeRaw = (formData.get("uploadMode") as string | null)?.trim() ?? "single_case";
  const uploadModeParsed =
    uploadModeRaw === "one_case_per_file" || uploadModeRaw === "zip_by_folder"
      ? uploadModeRaw
      : "single_case";
  const effectiveUploadMode = providedCaseId ? "single_case" : uploadModeParsed;
  const titlePrefix = caseTitle?.trim() || "Import";

  if (!files.length) {
    return NextResponse.json(
      { error: "No files provided" },
      { status: 400 },
    );
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many files provided (max ${MAX_FILES_PER_REQUEST} per upload).` },
      { status: 400 },
    );
  }

  if (!providedCaseId && effectiveUploadMode === "single_case" && !caseTitle?.trim()) {
    return NextResponse.json(
      { error: "Case title or case ID is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  let jobs: UploadJob[];

  if (providedCaseId) {
    // Verify the case exists and belongs to this org
    const { data: existingCase, error: caseLookupError } = await supabase
      .from("cases")
      .select("id, title")
      .eq("id", providedCaseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseLookupError) {
      console.error("[upload] Error looking up provided case:", caseLookupError);
      return NextResponse.json(
        { error: "Failed to lookup case", details: caseLookupError.message },
        { status: 500 },
      );
    }

    if (!existingCase) {
      return NextResponse.json(
        { error: "Case not found or access denied" },
        { status: 404 },
      );
    }

    console.log(`[upload] Using provided case ID: ${existingCase.id} for "${existingCase.title}"`);
    jobs = [{ caseId: existingCase.id, files }];
  } else if (effectiveUploadMode === "zip_by_folder") {
    const zips = files.filter((f) => f.name.toLowerCase().endsWith(".zip"));
    const nonZip = files.filter((f) => !f.name.toLowerCase().endsWith(".zip"));
    if (!zips.length) {
      return NextResponse.json(
        { error: "Zip folder mode needs at least one .zip file." },
        { status: 400 },
      );
    }
    let groups;
    try {
      groups = await expandZipsToFolderCaseGroups(zips, titlePrefix);
    } catch (e) {
      console.error("[upload] Zip expand failed:", e);
      return NextResponse.json(
        {
          error: "Could not read zip file(s).",
          details: e instanceof Error ? e.message : String(e),
        },
        { status: 400 },
      );
    }
    if (!groups.length) {
      return NextResponse.json(
        { error: "No PDF, DOCX, or TXT files found inside the zip(s)." },
        { status: 400 },
      );
    }
    jobs = [];
    for (const g of groups) {
      const cre = await createCaseForUpload({
        supabase,
        orgId,
        userId,
        email,
        title: g.caseTitle,
        practiceArea: normalizedProvidedPracticeArea,
      });
      if (!cre.ok) return cre.response;
      jobs.push({ caseId: cre.caseId, files: g.files });
    }
    if (nonZip.length) {
      const cre = await createCaseForUpload({
        supabase,
        orgId,
        userId,
        email,
        title: `${titlePrefix} — (files outside zip)`,
        practiceArea: normalizedProvidedPracticeArea,
      });
      if (!cre.ok) return cre.response;
      jobs.push({ caseId: cre.caseId, files: nonZip });
    }
  } else if (effectiveUploadMode === "one_case_per_file") {
    const nonZip = files.filter((f) => !f.name.toLowerCase().endsWith(".zip"));
    if (!nonZip.length) {
      return NextResponse.json(
        {
          error:
            "One-case-per-file mode needs PDF, DOCX, or TXT files. For zips with folders, use Zip (folder = case) mode.",
        },
        { status: 400 },
      );
    }
    jobs = [];
    for (const file of nonZip) {
      const stem = file.name.replace(/\.[^/.]+$/, "") || file.name;
      const cre = await createCaseForUpload({
        supabase,
        orgId,
        userId,
        email,
        title: `${titlePrefix} — ${stem}`,
        practiceArea: normalizedProvidedPracticeArea,
      });
      if (!cre.ok) return cre.response;
      jobs.push({ caseId: cre.caseId, files: [file] });
    }
  } else {
    let singleCaseId: string | undefined;
    const { data: titleMatchCase, error: caseLookupError } = await supabase
      .from("cases")
      .select("id, title")
      .eq("org_id", orgId)
      .eq("title", caseTitle!)
      .maybeSingle();

    if (caseLookupError) {
      console.error("[upload] Error looking up case:", caseLookupError);
      return NextResponse.json(
        { error: "Failed to lookup case", details: caseLookupError.message },
        { status: 500 },
      );
    }

    singleCaseId = titleMatchCase?.id;

    if (!singleCaseId) {
      const cre = await createCaseForUpload({
        supabase,
        orgId,
        userId,
        email,
        title: caseTitle!,
        practiceArea: normalizedProvidedPracticeArea,
      });
      if (!cre.ok) return cre.response;
      singleCaseId = cre.caseId;
      console.log(`[upload] Created new case with ID: ${singleCaseId}`);
    } else {
      console.log(`[upload] Using existing case ID: ${singleCaseId} for "${caseTitle}"`);
    }

    jobs = [{ caseId: singleCaseId, files }];
  }

  try {
    const trialStatusDoc = await getTrialStatus({
      supabase,
      orgId,
      userId,
      email,
    });

    if (trialStatusDoc.isBlocked && trialStatusDoc.reason === "DOC_LIMIT") {
      return NextResponse.json(
        trialLimit402Body("DOC_LIMIT", trialStatusDoc),
        { status: 402 },
      );
    }
  } catch (trialError) {
    console.error("[upload] Trial status check failed, allowing document upload:", trialError);
  }

  const documentIds: string[] = [];
  const skippedFiles: string[] = [];

  for (const job of jobs) {
    const caseId = job.caseId;

    const { data: caseRow } = await supabase
      .from("cases")
      .select("org_id")
      .eq("id", caseId)
      .maybeSingle();
    const documentOrgId = (caseRow?.org_id as string) ?? orgId;

    const { data: resolvedCaseForArea } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    const storedPracticeAreaRaw = (resolvedCaseForArea?.practice_area ?? null) as string | null;
    let resolvedPracticeArea = normalizePracticeArea(storedPracticeAreaRaw ?? practiceArea);

    if (
      normalizedProvidedPracticeArea === "criminal" &&
      resolvedPracticeArea !== "criminal" &&
      (!storedPracticeAreaRaw || normalizePracticeArea(storedPracticeAreaRaw) === "other_litigation")
    ) {
      console.error("[upload] practice_area mismatch: selected criminal but stored is not criminal. Repairing.", {
        caseId,
        storedPracticeAreaRaw,
        selected: practiceArea,
      });
      try {
        await supabase
          .from("cases")
          .update({ practice_area: "criminal" } as any)
          .eq("id", caseId)
          .eq("org_id", orgId);
        resolvedPracticeArea = "criminal";
      } catch (e) {
        // Non-fatal: continue with resolvedPracticeArea
      }
    }

    for (const file of job.files) {
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
        const [extractedResult, summaryResult] = await Promise.all([
          extractCaseFacts({
            documentText: redactedText,
            documentName: file.name,
            orgId,
          }),
          summariseDocument(redactedText),
        ]);
        extracted = extractedResult;
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
      .eq("org_id", documentOrgId)
      .eq("name", file.name)
      .maybeSingle();

    if (existingDoc) {
      console.log(`[upload] Duplicate file detected: ${file.name} - skipping upload`);
      skippedFiles.push(file.name);
      // Skip this file but continue with others
      continue;
    }

    const storagePath = `${documentOrgId}/${caseId}/${Date.now()}-${file.name}`;
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

    // TEMPORARY DEBUG: Log text extraction before insert
    const textLength = typeof redactedText === "string" ? redactedText.length : 0;
    console.log(`[upload] DEBUG: About to insert document: ${file.name}`);
    console.log(`[upload] DEBUG:   - caseId=${caseId}, documentOrgId=${documentOrgId}`);
    console.log(`[upload] DEBUG:   - redactedText length=${textLength}`);
    console.log(`[upload] DEBUG:   - redactedText type=${typeof redactedText}`);
    console.log(`[upload] DEBUG:   - redactedText preview (first 200 chars): ${typeof redactedText === "string" ? redactedText.substring(0, 200).replace(/\n/g, " ") : "[NOT STRING]"}`);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        case_id: caseId,
        org_id: documentOrgId,
        name: file.name,
        type: file.type,
        storage_url: `${STORAGE_BUCKET}/${storagePath}`,
        raw_text: redactedText,
        extracted_text: redactedText,
        extracted_json: enrichedExtraction,
        uploaded_by: userId,
        redaction_map: redactionMap,
      })
      .select("id, name, case_id, org_id, raw_text")
      .maybeSingle();
    
    // TEMPORARY DEBUG: Verify what was actually stored
    if (document) {
      const storedRawText = (document as any).raw_text;
      const storedTextLength = typeof storedRawText === "string" ? storedRawText.length : (storedRawText ? String(storedRawText).length : 0);
      console.log(`[upload] DEBUG: Document inserted successfully: docId=${document.id}`);
      console.log(`[upload] DEBUG:   - stored raw_text length=${storedTextLength}`);
      console.log(`[upload] DEBUG:   - stored raw_text type=${typeof storedRawText}`);
      if (storedTextLength !== textLength) {
        console.warn(`[upload] DEBUG: WARNING - Text length mismatch! Inserted ${textLength} chars but stored ${storedTextLength} chars`);
      }
    }

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
        
        // Non-blocking: keep upload fast; bundle summary can complete in background.
        void summariseBundlePhaseA({
          caseId,
          orgId,
          bundleId: document.id,
          bundleName: file.name,
          textContent: text.substring(0, 50000), // Limit to first 50k chars for Phase A
          pageCount,
        }).catch((bundleError) => {
          console.error(`[upload] Failed to run bundle analysis for ${file.name}:`, bundleError);
        });
      } catch (bundleError) {
        console.error(`[upload] Failed to run bundle analysis for ${file.name}:`, bundleError);
        // Don't fail the upload if bundle analysis fails
      }
    }

    // Criminal structured extraction (deterministic): run after text extraction and document insert
    if (resolvedPracticeArea === "criminal") {
      try {
        const meta = extractCriminalCaseMeta({
          text: redactedText,
          documentName: file.name,
        });
        await persistCriminalCaseMeta({
          supabase,
          caseId,
          orgId,
          meta,
          sourceDocumentId: document.id,
          sourceDocumentName: file.name,
        });
      } catch (criminalExtractError) {
        console.error("[upload] Criminal structured extractor failed (non-fatal):", criminalExtractError);
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

    const riskFlagCount = riskCandidates.length;
    if (riskCandidates.length) {
      // Non-blocking: persist/notify risk flags in background to reduce upload latency.
      void (async () => {
        try {
          const storedRiskFlags = await storeRiskFlags(supabase, riskCandidates);
          await notifyHighSeverityFlags(storedRiskFlags, userId);
        } catch (riskError) {
          console.error("[upload] Risk flag persistence failed (non-fatal):", riskError);
        }
      })();
    }

    // Non-blocking: entity indexing is useful but should not delay upload completion.
    void extractEntitiesFromText({
      client: supabase,
      orgId,
      caseId,
      text: redactedText,
    }).catch((entityError) => {
      console.error("[upload] Entity extraction failed (non-fatal):", entityError);
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

    // Heavy case enrichment writes run in background so upload returns faster.
    void (async () => {
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
          riskFlags: riskFlagCount,
        },
      });
    })().catch((enrichmentError) => {
      console.error("[upload] Background enrichment failed (non-fatal):", enrichmentError);
    });

    // If this is a criminal case and we have criminalMeta, process it
    if (
      caseRecord &&
      caseRecord.practice_area === "criminal" &&
      (enrichedExtraction as any).criminalMeta
    ) {
      try {
        // Trigger criminal case processing (async, don't wait)
        // Use Vercel URL if available, otherwise construct from request
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                       process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                       "http://localhost:3000";
        
        fetch(`${baseUrl}/api/criminal/${caseId}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch((err) => {
          console.error("[upload] Failed to trigger criminal processing:", err);
          // Don't fail upload if criminal processing fails - it's async/fire-and-forget
        });
      } catch (criminalError) {
        console.error("[upload] Error triggering criminal processing:", criminalError);
        // Don't fail upload if criminal processing fails
      }
    }

    }
  }

  const primaryCaseId = jobs[0]?.caseId;
  const distinctCaseIds = [...new Set(jobs.map((j) => j.caseId))];

  // PAYWALL: Increment usage after successful upload
  // NOTE: DO NOT increment usage for owners (they bypass limits)
  try {
    // Only increment usage if user is NOT an owner
    if (paywallOrgId && !isOwner) {
      await incrementUsage({ orgId: paywallOrgId, feature: "upload" });
    } else if (isOwner) {
      console.log(`[upload] ✅ Owner bypass - skipping usage increment for userId: ${userId}, email: ${email}`);
    }
  } catch (usageError) {
    console.error("[upload] Failed to record usage:", usageError);
    // Don't fail the upload if usage recording fails
  }

  console.log(
    `[upload] Upload complete. Cases: ${distinctCaseIds.join(", ")}, Documents: ${documentIds.length}, Skipped: ${skippedFiles.length}`,
  );

  if (documentIds.length > 0) {
    try {
      const { invalidateCaseCache } = await import("@/lib/llm/cache");
      for (const cid of distinctCaseIds) {
        await invalidateCaseCache(orgId, cid);
      }
    } catch (error) {
      console.warn("[upload] Failed to invalidate cache:", error);
    }
  }

  return NextResponse.json(
    {
      caseId: primaryCaseId,
      caseIds: distinctCaseIds,
      casesCreated: distinctCaseIds.length,
      documentIds,
      skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
      isOwner,
      bypassActive: isOwner,
      message:
        skippedFiles.length > 0
          ? `${skippedFiles.length} duplicate file(s) skipped: ${skippedFiles.join(", ")}`
          : undefined,
      success: true,
      uploadedCount: documentIds.length,
    },
    { status: 201 },
  );
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

