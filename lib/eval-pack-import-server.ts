import "server-only";

import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appendAuditLog } from "@/lib/audit";
import { extractCaseFacts, summariseDocument } from "@/lib/ai";
import type { ExtractedCaseFacts } from "@/types/case";
import { extractCriminalCaseMeta, persistCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import { env } from "@/lib/env";
import { detectRiskFlags, notifyHighSeverityFlags, storeRiskFlags } from "@/lib/risk";
import { redact } from "@/lib/redact";
import { extractTextFromFile } from "@/lib/upload/extract-text-from-file";
import { EVAL_PACK_LABELS, type EvalPackId } from "@/lib/eval-packs";
import { isAllowedPackImportFileName, isEvalGoldAnswerFileName } from "@/lib/eval-pack-import-ui";

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
const MAX_UPLOAD_BYTES = env.FILE_UPLOAD_MAX_MB * 1024 * 1024;

export type EvalPackImportItem = {
  evalCaseNo: number;
  caseTitle: string;
};

async function removeCaseDocumentsAndStorage(
  supabase: SupabaseClient,
  bucket: string,
  caseId: string,
  orgId: string
): Promise<void> {
  const { data: docs } = await supabase
    .from("documents")
    .select("storage_url")
    .eq("case_id", caseId)
    .eq("org_id", orgId);
  const prefix = `${bucket}/`;
  const paths: string[] = [];
  for (const d of docs ?? []) {
    const u = String((d as { storage_url?: string }).storage_url ?? "");
    if (u.startsWith(prefix)) paths.push(u.slice(prefix.length));
  }
  if (paths.length > 0) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.warn("[eval-pack-import] storage remove:", error.message);
  }
  await supabase.from("documents").delete().eq("case_id", caseId).eq("org_id", orgId);
}

/** One chunk (≤20 files). Owner-only route — no paywall increment. */
export async function runEvalPackImportChunk(params: {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
  email: string | null;
  packId: EvalPackId;
  replaceExisting: boolean;
  items: EvalPackImportItem[];
  files: File[];
}): Promise<{ created: number; updated: number; skipped: number; warnings: string[]; errors: string[] }> {
  const { supabase, orgId, userId, email, packId, replaceExisting, items, files } = params;
  const warnings: string[] = [];
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const packLabel = EVAL_PACK_LABELS[packId];

  if (items.length !== files.length) {
    errors.push(`items length (${items.length}) does not match files (${files.length})`);
    return { created, updated, skipped, warnings, errors };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const item = items[i]!;
    const evalCaseNo = Math.min(40, Math.max(1, Math.round(Number(item.evalCaseNo)) || 1));
    const caseTitle = (item.caseTitle || "").trim() || `Pack ${packId} — Case ${evalCaseNo}`;

    if (isEvalGoldAnswerFileName(file.name)) {
      warnings.push(`${file.name}: gold answer file — skipped (not imported yet)`);
      skipped += 1;
      continue;
    }
    if (!isAllowedPackImportFileName(file.name)) {
      warnings.push(`${file.name}: unsupported file type — skipped`);
      skipped += 1;
      continue;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      warnings.push(`${file.name}: exceeds size limit — skipped`);
      skipped += 1;
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    let extractionError: string | null = null;
    try {
      text = await extractTextFromFile(file, buffer);
    } catch (error) {
      extractionError = error instanceof Error ? error.message : String(error);
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = `[PDF extraction failed: ${extractionError}. File stored but text extraction unavailable.]`;
      } else {
        warnings.push(`${file.name}: extraction failed — ${extractionError}`);
        skipped += 1;
        continue;
      }
    }

    const { redactedText, map: redactionMap } = redact(text, env.REDACTION_SECRET);

    let extracted: ExtractedCaseFacts;
    let summary: string | null = null;
    let enrichedExtraction: Record<string, unknown>;
    if (extractionError) {
      extracted = {
        summary: `Document uploaded but text extraction failed: ${extractionError}`,
        parties: [],
        dates: [],
        amounts: [],
        keyIssues: [],
        timeline: [],
        claimType: "unknown",
      };
      enrichedExtraction = { ...extracted, aiSummary: null, extractionError };
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
        enrichedExtraction = { ...extracted, aiSummary: summary };
      } catch (error) {
        extracted = {
          summary: `Document uploaded but AI extraction encountered an error.`,
          parties: [],
          dates: [],
          amounts: [],
          keyIssues: [],
          timeline: [],
          claimType: "unknown",
        };
        enrichedExtraction = {
          ...extracted,
          aiSummary: null,
          extractionError: error instanceof Error ? error.message : "AI extraction failed",
        };
      }
    }

    const { data: existingCase } = await supabase
      .from("cases")
      .select("id, title")
      .eq("org_id", orgId)
      .eq("eval_pack_id", packId)
      .eq("eval_case_no", evalCaseNo)
      .eq("is_archived", false)
      .maybeSingle();

    const caseExistedPrior = Boolean(existingCase?.id);
    let caseId: string;
    let createdNewCaseDraft = false;

    if (!caseExistedPrior) {
      const { data: newCase, error: insErr } = await supabase
        .from("cases")
        .insert({
          org_id: orgId,
          title: caseTitle,
          created_by: userId,
          practice_area: "criminal",
          eval_pack_id: packId,
          eval_pack_name: packLabel,
          eval_case_no: evalCaseNo,
        })
        .select("id")
        .maybeSingle();
      if (insErr || !newCase?.id) {
        errors.push(`${file.name}: failed to create case — ${insErr?.message ?? "unknown"}`);
        skipped += 1;
        continue;
      }
      caseId = newCase.id as string;
      createdNewCaseDraft = true;
      try {
        await supabase.from("criminal_cases").upsert({ id: caseId, org_id: orgId }, { onConflict: "id" });
      } catch {
        // non-fatal
      }
    } else {
      caseId = existingCase!.id as string;
      await supabase
        .from("cases")
        .update({
          title: caseTitle,
          eval_pack_id: packId,
          eval_pack_name: packLabel,
          eval_case_no: evalCaseNo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId)
        .eq("org_id", orgId);

      if (replaceExisting) {
        await removeCaseDocumentsAndStorage(supabase, STORAGE_BUCKET, caseId, orgId);
      } else {
        const { data: dupDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .eq("name", file.name)
          .maybeSingle();
        if (dupDoc) {
          warnings.push(`${file.name}: duplicate filename on case ${evalCaseNo} — skipped`);
          skipped += 1;
          continue;
        }
      }
    }

    const storagePath = `${orgId}/${caseId}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (storageError) {
      errors.push(`${file.name}: storage failed — ${storageError.message}`);
      if (createdNewCaseDraft) {
        await supabase.from("cases").delete().eq("id", caseId).eq("org_id", orgId);
      }
      skipped += 1;
      continue;
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        case_id: caseId,
        org_id: orgId,
        name: file.name,
        type: file.type || "application/octet-stream",
        storage_url: `${STORAGE_BUCKET}/${storagePath}`,
        raw_text: redactedText,
        extracted_text: redactedText,
        extracted_json: enrichedExtraction,
        uploaded_by: userId,
        redaction_map: redactionMap,
      })
      .select("id")
      .maybeSingle();

    if (docError || !document?.id) {
      errors.push(`${file.name}: document insert failed — ${docError?.message ?? "no id"}`);
      if (createdNewCaseDraft) {
        await supabase.from("cases").delete().eq("id", caseId).eq("org_id", orgId);
      } else {
        try {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        } catch {
          // non-fatal
        }
      }
      skipped += 1;
      continue;
    }

    if (caseExistedPrior) updated += 1;
    else created += 1;

    if (summary) {
      await supabase
        .from("cases")
        .update({ summary, updated_at: new Date().toISOString() })
        .eq("id", caseId);
    }

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
        sourceDocumentId: document.id as string,
        sourceDocumentName: file.name,
      });
    } catch (e) {
      console.warn("[eval-pack-import] criminal meta:", e);
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const { summariseBundlePhaseA } = await import("@/lib/bundle-navigator");
        void summariseBundlePhaseA({
          caseId,
          orgId,
          bundleId: document.id as string,
          bundleName: file.name,
          textContent: text.substring(0, 50000),
          pageCount: undefined,
        }).catch(() => {});
      } catch {
        // non-fatal
      }
    }

    const riskCandidates = detectRiskFlags({
      orgId,
      caseId,
      sourceType: "document",
      sourceId: document.id as string,
      documentName: file.name,
      text: redactedText,
      extractedFacts: {
        practiceArea: "criminal",
        housingMeta: undefined,
        dates: extracted.dates,
        timeline: extracted.timeline,
      },
    });
    if (riskCandidates.length) {
      void (async () => {
        try {
          const stored = await storeRiskFlags(supabase, riskCandidates);
          await notifyHighSeverityFlags(stored, userId);
        } catch {
          // non-fatal
        }
      })();
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      void fetch(`${baseUrl}/api/criminal/${caseId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    } catch {
      // non-fatal
    }

    await appendAuditLog({
      caseId,
      userId,
      eventType: "UPLOAD_COMPLETED",
      meta: {
        documentId: document.id,
        name: file.name,
        evalPackImport: true,
        packId,
        evalCaseNo,
      },
    });
  }

  return { created, updated, skipped, warnings, errors };
}
