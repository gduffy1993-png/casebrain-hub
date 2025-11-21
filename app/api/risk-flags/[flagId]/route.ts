import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type UpdatePayload = {
  resolved?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: { flagId: string } },
) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`risk:update:${userId}`, { limit: 30, windowMs: 60_000 });

  const payload = (await request.json()) as UpdatePayload;
  const supabase = getSupabaseAdminClient();

  const updates: Record<string, unknown> = {};
  if (typeof payload.resolved === "boolean") {
    updates.resolved = payload.resolved;
    updates.resolved_at = payload.resolved ? new Date().toISOString() : null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("risk_flags")
    .update(updates)
    .eq("id", params.flagId)
    .eq("org_id", orgId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Flag not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ flag: data });
}

