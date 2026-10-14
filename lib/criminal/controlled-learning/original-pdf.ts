import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractTextAndMetaFromFileBuffer } from "@/lib/upload/extract-text-from-file";

export type LearningDocument = { id: string; case_id: string; name: string; storage_url: string };
export const sourceHash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

export async function readOwnedOriginalPdf(db: SupabaseClient, orgId: string, documentId: string) {
  const { data: doc, error } = await db.from("documents").select("id,case_id,name,storage_url")
    .eq("org_id", orgId).eq("id", documentId).maybeSingle();
  if (error || !doc) throw new Error("Source document is unavailable in this organisation.");
  if (!doc.name?.toLowerCase().endsWith(".pdf") || typeof doc.storage_url !== "string") throw new Error("Learning requires the original uploaded PDF.");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "casebrain-documents";
  let path = doc.storage_url.startsWith(`${bucket}/`) ? doc.storage_url.slice(bucket.length + 1) : doc.storage_url;
  if (path.includes("://") || path.includes("..")) throw new Error("Unsupported source storage path.");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== orgId || parts[1] !== doc.case_id) throw new Error("Source storage ownership does not match.");
  const { data: file, error: storageError } = await db.storage.from(bucket).download(path);
  if (storageError || !file) throw new Error("Original PDF could not be downloaded.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 16 * 1024 * 1024 || bytes.subarray(0, 4).toString() !== "%PDF") throw new Error("Source is not a supported PDF (maximum 16 MiB).");
  const extracted = await extractTextAndMetaFromFileBuffer(doc.name, "application/pdf", bytes);
  if (!extracted.ingestionAssessment.substantiveOutputsAllowed || !extracted.pageUnits.length) throw new Error(`Original PDF needs extraction review before it can teach a rule (${extracted.ingestionAssessment.reasonCodes.join(", ")}; ${extracted.pageUnits.length} extracted pages).`);
  return { document: doc as LearningDocument, text: extracted.text, pages: extracted.pageUnits, hash: sourceHash(bytes) };
}
