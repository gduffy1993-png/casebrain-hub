import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isOwnerUser } from "@/lib/paywall/owner";
import { EVAL_PACK_IDS, parseEvalPackId, type EvalPackId } from "@/lib/eval-packs";
import { fetchTaggedCasesForPacks } from "@/lib/eval-pack-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePackIds(raw: string | null): EvalPackId[] | null {
  const parts = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const out: EvalPackId[] = [];
  for (const p of parts) {
    const id = parseEvalPackId(p);
    if (!id) return null;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Owner-only: all tagged cases for one or more packs (paginated server-side). */
export async function GET(req: Request) {
  const { userId, orgId } = await requireAuthContext();
  const user = await getCurrentUser();
  const email = user?.email ?? user?.primaryEmailAddress?.emailAddress ?? null;
  if (!isOwnerUser({ userId, email })) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const single = parseEvalPackId(searchParams.get("packId"));
  const multi = parsePackIds(searchParams.get("packIds"));
  const packIds = multi ?? (single ? [single] : EVAL_PACK_IDS.slice());

  try {
    const supabase = getSupabaseAdminClient();
    const cases = await fetchTaggedCasesForPacks(supabase, orgId, packIds);
    return NextResponse.json({ ok: true, packIds, cases });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
