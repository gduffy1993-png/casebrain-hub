import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isOwnerUser } from "@/lib/paywall/owner";
import { aggregateEvalPackCounts } from "@/lib/eval-pack-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only: server-side tagged / inferred-only counts per eval pack. */
export async function GET() {
  const { userId, orgId } = await requireAuthContext();
  const user = await getCurrentUser();
  const email = user?.email ?? user?.primaryEmailAddress?.emailAddress ?? null;
  if (!isOwnerUser({ userId, email })) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const counts = await aggregateEvalPackCounts(supabase, orgId);
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
