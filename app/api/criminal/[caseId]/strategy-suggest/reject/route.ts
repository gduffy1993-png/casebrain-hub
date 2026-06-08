/**
 * POST /api/criminal/[caseId]/strategy-suggest/reject
 * Option 3 Phase 3.4: Log when user rejects an AI suggestion (no PII).
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { logStrategySuggest } from "@/lib/criminal/strategy-suggest/logger";

type RouteParams = { params: Promise<{ caseId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { caseId } = await params;
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (error || !caseRow) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    logStrategySuggest({ event: "rejected", caseId });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[strategy-suggest/reject] Error:", err);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}
