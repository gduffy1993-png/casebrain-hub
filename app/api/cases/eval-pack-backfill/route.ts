import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isOwnerUser } from "@/lib/paywall/owner";
import { inferEvalPackFromTitle } from "@/lib/eval-packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev / owner-only: set eval_pack_* on cases where it is null, using title then first document filename.
 * Does not overwrite existing eval_pack_id.
 */
export async function POST() {
  const { userId, orgId } = await requireAuthContext();
  const user = await getCurrentUser();
  const email = user?.email ?? user?.primaryEmailAddress?.emailAddress ?? null;
  if (!isOwnerUser({ userId, email })) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: candidates, error: fetchErr } = await supabase
    .from("cases")
    .select("id, title, eval_pack_id")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .is("eval_pack_id", null);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const rows = candidates ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, scanned: 0, message: "No untagged cases" });
  }

  const caseIds = rows.map((r) => r.id as string);
  const { data: docRows } = await supabase
    .from("documents")
    .select("case_id, name, created_at")
    .in("case_id", caseIds)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const firstDocName = new Map<string, string>();
  for (const d of docRows ?? []) {
    const cid = String(d.case_id);
    if (!firstDocName.has(cid) && d.name) firstDocName.set(cid, String(d.name));
  }

  let updated = 0;
  const errors: string[] = [];

  for (const c of rows) {
    const id = c.id as string;
    let inferred = inferEvalPackFromTitle((c.title as string) ?? "");
    if (!inferred) {
      const docName = firstDocName.get(id);
      if (docName) inferred = inferEvalPackFromTitle(docName);
    }
    if (!inferred) continue;

    const { error: upErr } = await supabase
      .from("cases")
      .update({
        eval_pack_id: inferred.pack_id,
        eval_pack_name: inferred.pack_name,
        eval_case_no: inferred.eval_case_no,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .is("eval_pack_id", null);

    if (upErr) {
      errors.push(`${id}: ${upErr.message}`);
      continue;
    }
    updated += 1;
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    updated,
    errors: errors.length ? errors.slice(0, 20) : undefined,
  });
}
