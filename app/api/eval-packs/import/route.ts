import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isOwnerUser } from "@/lib/paywall/owner";
import { evalPackNameForStorage, parseEvalPackId } from "@/lib/eval-packs";
import {
  countPackCases,
  runEvalPackImportChunk,
  type EvalPackImportItem,
} from "@/lib/eval-pack-import-server";
import { PACK_IMPORT_CHUNK_SIZE } from "@/lib/eval-pack-import-ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseItems(raw: string): EvalPackImportItem[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: EvalPackImportItem[] = [];
    for (const row of parsed) {
      const r = row as { evalCaseNo?: unknown; caseTitle?: unknown };
      const n = Number(r.evalCaseNo);
      if (!Number.isFinite(n) || n < 1 || n > 40) return null;
      const caseTitle = typeof r.caseTitle === "string" ? r.caseTitle : "";
      out.push({ evalCaseNo: Math.round(n), caseTitle });
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Owner-only: import one chunk (≤ PACK_IMPORT_CHUNK_SIZE) of eval pack case files.
 * Each file becomes its own case (or updates the same org + pack + eval_case_no slot).
 */
export async function POST(req: Request) {
  const { userId, orgId } = await requireAuthContext();
  const user = await getCurrentUser();
  const email = user?.email ?? user?.primaryEmailAddress?.emailAddress ?? null;
  if (!isOwnerUser({ userId, email })) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const packId = parseEvalPackId(String(form.get("packId") ?? "").trim());
  if (!packId) {
    return NextResponse.json({ error: "Invalid packId" }, { status: 400 });
  }

  const replaceExisting = String(form.get("replaceExisting") ?? "") === "true";
  const confirmReplace = String(form.get("confirmReplace") ?? "") === "true";
  if (replaceExisting && !confirmReplace) {
    return NextResponse.json(
      {
        error:
          "Replace mode requires confirmation. Tick the confirmation checkbox in the import dialog (confirmReplace).",
      },
      { status: 400 }
    );
  }

  const clearPackDocumentsFirst = String(form.get("clearPackDocumentsFirst") ?? "") === "true";
  const items = parseItems(String(form.get("items") ?? ""));
  if (!items) {
    return NextResponse.json({ error: "Invalid items JSON (expect [{ evalCaseNo, caseTitle }, …])" }, { status: 400 });
  }

  const files = form.getAll("files").filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > PACK_IMPORT_CHUNK_SIZE) {
    return NextResponse.json(
      { error: `Too many files in this request (max ${PACK_IMPORT_CHUNK_SIZE})` },
      { status: 400 }
    );
  }
  if (items.length !== files.length) {
    return NextResponse.json(
      { error: `items length (${items.length}) must match files (${files.length})` },
      { status: 400 }
    );
  }

  const selectedCount = Number(form.get("selectedCount") ?? items.length) || items.length;
  const willImportCount = Number(form.get("willImportCount") ?? items.length) || items.length;

  const supabase = getSupabaseAdminClient();
  const packLabel = evalPackNameForStorage(packId);
  const result = await runEvalPackImportChunk({
    supabase,
    orgId,
    userId,
    email,
    packId,
    packLabel,
    replaceExisting,
    clearPackDocumentsFirst,
    items,
    files,
  });

  const finalPackCount = await countPackCases(supabase, orgId, packId);

  return NextResponse.json({
    ok: true,
    packId,
    packLabel,
    selected_count: selectedCount,
    will_import_count: willImportCount,
    created: result.created,
    updated: result.updated,
    replaced: result.replaced,
    skipped: result.skipped,
    created_count: result.created,
    updated_count: result.updated,
    replaced_count: result.replaced,
    skipped_count: result.skipped,
    error_count: result.errors.length,
    final_pack_count: finalPackCount,
    warnings: result.warnings,
    errors: result.errors,
  });
}
