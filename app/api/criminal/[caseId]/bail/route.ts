import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/bail
 * Fetch bail information
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("bail_status, bail_conditions, next_bail_review, remand_time_hours, bail_return_date, bail_outcome")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!criminalCase) {
      return NextResponse.json({
        bailStatus: null,
        bailConditions: [],
        nextBailReview: null,
        remandTimeHours: null,
        bailReturnDate: null,
        bailOutcome: null,
      });
    }

    return NextResponse.json({
      bailStatus: criminalCase.bail_status,
      bailConditions: criminalCase.bail_conditions || [],
      nextBailReview: criminalCase.next_bail_review,
      remandTimeHours: criminalCase.remand_time_hours,
      bailReturnDate: (criminalCase as { bail_return_date?: string }).bail_return_date ?? null,
      bailOutcome: (criminalCase as { bail_outcome?: string }).bail_outcome ?? null,
    });
  } catch (error) {
    console.error("[criminal/bail] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bail information" },
      { status: 500 },
    );
  }
}

const BAIL_OUTCOMES = ["extended_bail", "rui", "nfa", "charged"] as const;

/**
 * PATCH /api/criminal/[caseId]/bail
 * Update bail return date, outcome, conditions
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();
    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.bailReturnDate !== undefined) updates.bail_return_date = body.bailReturnDate || null;
    if (body.bailOutcome !== undefined) updates.bail_outcome = BAIL_OUTCOMES.includes(body.bailOutcome) ? body.bailOutcome : null;
    if (body.bailConditions !== undefined) updates.bail_conditions = Array.isArray(body.bailConditions) ? body.bailConditions : null;
    const { error } = await supabase
      .from("criminal_cases")
      .update(updates)
      .eq("id", caseId)
      .eq("org_id", orgId);
    if (error) {
      console.error("[criminal/bail] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update bail" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[criminal/bail] PATCH:", err);
    return NextResponse.json({ error: "Failed to update bail" }, { status: 500 });
  }
}

