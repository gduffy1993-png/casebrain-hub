import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`risk:list:${userId}`, { limit: 60, windowMs: 60_000 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "open";
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("risk_flags")
    .select(
      "id, flag_type, severity, description, detected_at, resolved, resolved_at, metadata, case_id, cases(title)",
    )
    .eq("org_id", orgId)
    .order("detected_at", { ascending: false })
    .limit(100);

  if (status === "open") {
    query = query.eq("resolved", false);
  } else if (status === "resolved") {
    query = query.eq("resolved", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ flags: data ?? [] });
}

