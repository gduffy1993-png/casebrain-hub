import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await requireRole(["owner", "solicitor"]);
  assertRateLimit(`portal:${userId}`, { limit: 10, windowMs: 60_000 });
  const payload = (await request.json()) as {
    caseId: string;
    expiresInHours?: number;
    sections?: string[];
  };

  if (!payload.caseId) {
    return NextResponse.json({ error: "caseId required" }, { status: 400 });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (payload.expiresInHours ?? 48));

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portal_sessions")
    .insert({
      token,
      case_id: payload.caseId,
      org_id: orgId,
      created_by: userId,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create portal session" },
      { status: 500 },
    );
  }

  return NextResponse.json({ token });
}

