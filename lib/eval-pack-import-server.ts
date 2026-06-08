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
import { evalPackNameForStorage, type EvalPackId } from "@/lib/eval-packs";
import { isAllowedPackImportFileName, isEvalGoldAnswerFileName } from "@/lib/eval-pack-import-ui";

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
const MAX_UPLOAD_BYTES = env.FILE_UPLOAD_MAX_MB * 1024 * 1024;

export type EvalPackImportItem = {
  evalCaseNo: number;
  caseTitle: string;
};

export type EvalPackImportChunkResult = {
  created: number;
  updated: number;
  replaced: number;
  skipped: number;
  warnings: string[];
  errors: string[];
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

/** Remove one document row (and storage) by name on a case — for replace-without-skip. */
async function removeDocumentByNameOnCase(
  supabase: SupabaseClient,
  caseId: string,
  orgId: string,
  fileName: string
): Promise<void> {
  const { data: dupDoc } = await supabase
    .from("documents")
    .select("id, storage_url")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .eq("name", fileName)
    .maybeSingle();
  if (!dupDoc?.id) return;
  const storageUrl = String((dupDoc as { storage_url?: string }).storage_url ?? "");
  const prefix = `${STORAGE_BUCKET}/`;
  if (storageUrl.startsWith(prefix)) {
    const path = storageUrl.slice(prefix.length);
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    } catch {
      // non-fatal
    }
  }
  await supabase.from("documents").delete().eq("id", dupDoc.id).eq("org_id", orgId);
}

/** Clear all documents on every case tagged for this pack (cases remain). */
export async function clearPackCaseDocuments(
  supabase: SupabaseClient,
  orgId: string,
  packId: EvalPackId
): Promise<number> {
  const { data: packCases } = await supabase
    .from("cases")
    .select("id")
    .eq("org_id", orgId)
    .eq("eval_pack_id", packId)
    .eq("is_archived", false);
  let n = 0;
  for (const row of packCases ?? []) {
    const id = row.id as string;
    await removeCaseDocumentsAndStorage(supabase, STORAGE_BUCKET, id, orgId);
    n += 1;
  }
  return n;
}

/** Archive duplicate / out-of-range cases for one pack (replace import prep). */
export async function pruneDuplicatePackCases(
  supabase: SupabaseClient,
  orgId: string,
  packId: EvalPackId
): Promise<number> {
  const { data } = await supabase
    .from("cases")
    .select("id, eval_case_no")
    .eq("org_id", orgId)
    .eq("eval_pack_id", packId)
    .eq("is_archived", false);

  let archived = 0;
  const bySlot = new Map<number, string[]>();
  const orphanIds: string[] = [];

  for (const row of data ?? []) {
    const id = row.id as string;
    const n = (row as { eval_case_no?: number | null }).eval_case_no;
    if (typeof n !== "number" || n < 1 || n > 40) {
      orphanIds.push(id);
      continue;
    }
    const list = bySlot.get(n) ?? [];
    list.push(id);
    bySlot.set(n, list);
  }

  const stamp = new Date().toISOString();
  for (const id of orphanIds) {
    await supabase.from("cases").update({ is_archived: true, updated_at: stamp }).eq("id", id).eq("org_id", orgId);
    archived += 1;
  }
  for (const ids of bySlot.values()) {
    if (ids.length <= 1) continue;
    ids.sort();
    for (let i = 1; i < ids.length; i++) {
      await supabase
        .from("cases")
        .update({ is_archived: true, updated_at: stamp })
        .eq("id", ids[i]!)
        .eq("org_id", orgId);
      archived += 1;
    }
  }
  return archived;
}

export async function countPackCases(
  supabase: SupabaseClient,
  orgId: string,
  packId: EvalPackId
): Promise<number> {
  const { count, error } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("eval_pack_id", packId)
    .eq("is_archived", false);
  if (error) {
    console.warn("[eval-pack-import] countPackCases:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** One chunk (≤20 files). Owner-only route — no paywall increment. */
export async function runEvalPackImportChunk(params: {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
  email: string | null;
  packId: EvalPackId;
  packLabel?: string;
  replaceExisting: boolean;
  clearPackDocumentsFirst?: boolean;
  items: EvalPackImportItem[];
  files: File[];
}): Promise<EvalPackImportChunkResult> {
  const {
    supabase,
    orgId,
    userId,
    email,
    packId,
    replaceExisting,
    clearPackDocumentsFirst,
    items,
    files,
  } = params;
  const warnings: string[] = [];
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let replaced = 0;
  let skipped = 0;

  const packLabel = params.packLabel ?? evalPackNameForStorage(packId);

  if (items.length !== files.length) {
    errors.push(`items length (${items.length}) does not match files (${files.length})`);
    return { created, updated, replaced, skipped, warnings, errors };
  }

  if (clearPackDocumentsFirst && replaceExisting) {
    const pruned = await pruneDuplicatePackCases(supabase, orgId, packId);
    if (pruned > 0) {
      warnings.push(`Replace mode: archived ${pruned} duplicate or out-of-range Pack ${packId} case(s).`);
    }
    const cleared = await clearPackCaseDocuments(supabase, orgId, packId);
    if (cleared > 0) {
      warnings.push(`Replace mode: cleared documents on ${cleared} existing Pack ${packId} case(s) before import.`);
    }
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

    let caseId: string;
    let createdNewCaseDraft = false;
    let didReplace = false;

    const { data: exactPackCase } = await supabase
      .from("cases")
      .select("id, eval_pack_id")
      .eq("org_id", orgId)
      .eq("eval_pack_id", packId)
      .eq("eval_case_no", evalCaseNo)
      .eq("is_archived", false)
      .maybeSingle();

    if (exactPackCase?.id) {
      caseId = exactPackCase.id as string;
      await supabase
        .from("cases")
        .update({
          title: caseTitle,
          eval_pack_id: packId,
          eval_pack_name: packLabel,
          eval_case_no: evalCaseNo,
          practice_area: "criminal",
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId)
        .eq("org_id", orgId);

      if (replaceExisting) {
        await removeCaseDocumentsAndStorage(supabase, STORAGE_BUCKET, caseId, orgId);
        didReplace = true;
      } else {
        await removeDocumentByNameOnCase(supabase, caseId, orgId, file.name);
      }
    } else {
      const { data: untaggedSlot } = await supabase
        .from("cases")
        .select("id")
        .eq("org_id", orgId)
        .eq("eval_case_no", evalCaseNo)
        .eq("is_archived", false)
        .is("eval_pack_id", null)
        .maybeSingle();

      if (untaggedSlot?.id) {
        caseId = untaggedSlot.id as string;
        await supabase
          .from("cases")
          .update({
            title: caseTitle,
            eval_pack_id: packId,
            eval_pack_name: packLabel,
            eval_case_no: evalCaseNo,
            practice_area: "criminal",
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId)
          .eq("org_id", orgId);
        warnings.push(`${file.name}: retagged untagged slot ${evalCaseNo} to Pack ${packId}.`);
        if (replaceExisting) {
          await removeCaseDocumentsAndStorage(supabase, STORAGE_BUCKET, caseId, orgId);
          didReplace = true;
        } else {
          await removeDocumentByNameOnCase(supabase, caseId, orgId, file.name);
        }
      } else {
        const { data: docRow } = await supabase
          .from("documents")
          .select("case_id")
          .eq("org_id", orgId)
          .eq("name", file.name)
          .limit(1)
          .maybeSingle();

        if (docRow?.case_id) {
          caseId = docRow.case_id as string;
          const { data: caseRow } = await supabase
            .from("cases")
            .select("eval_pack_id")
            .eq("id", caseId)
            .eq("org_id", orgId)
            .maybeSingle();
          const priorPack = (caseRow as { eval_pack_id?: string | null } | null)?.eval_pack_id ?? null;
          await supabase
            .from("cases")
            .update({
              title: caseTitle,
              eval_pack_id: packId,
              eval_pack_name: packLabel,
              eval_case_no: evalCaseNo,
              practice_area: "criminal",
              updated_at: new Date().toISOString(),
            })
            .eq("id", caseId)
            .eq("org_id", orgId);
          if (priorPack !== packId) {
            warnings.push(
              `${file.name}: matched existing document — retagged to Pack ${packId} (${packLabel}) slot ${evalCaseNo}.`
            );
          }
          if (replaceExisting) {
            await removeCaseDocumentsAndStorage(supabase, STORAGE_BUCKET, caseId, orgId);
            didReplace = true;
          } else {
            await removeDocumentByNameOnCase(supabase, caseId, orgId, file.name);
          }
        } else {
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

    if (createdNewCaseDraft) created += 1;
    else {
      updated += 1;
      if (didReplace) replaced += 1;
    }

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

  return { created, updated, replaced, skipped, warnings, errors };
}
