import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ caseId: string }> };

/**
 * GET /api/criminal/[caseId]/agreed-summary
 * Returns agreed case summary (short/detailed/full) and case theory line for Strategy and chat grounding.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("criminal_cases")
      .select("agreed_summary_short, agreed_summary_detailed, agreed_summary_full, case_theory_line, agreed_summary_updated_at, case_theory_updated_at")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[criminal/agreed-summary] GET error:", error);
      return NextResponse.json({ error: "Failed to fetch agreed summary" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        agreedSummaryShort: null,
        agreedSummaryDetailed: null,
        agreedSummaryFull: null,
        caseTheoryLine: null,
        agreedSummaryUpdatedAt: null,
        caseTheoryUpdatedAt: null,
      });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      agreedSummaryShort: row.agreed_summary_short ?? null,
      agreedSummaryDetailed: row.agreed_summary_detailed ?? null,
      agreedSummaryFull: row.agreed_summary_full ?? null,
      caseTheoryLine: row.case_theory_line ?? null,
      agreedSummaryUpdatedAt: row.agreed_summary_updated_at != null ? String(row.agreed_summary_updated_at) : null,
      caseTheoryUpdatedAt: row.case_theory_updated_at != null ? String(row.case_theory_updated_at) : null,
    });
  } catch (err) {
    console.error("[criminal/agreed-summary] GET unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/criminal/[caseId]/agreed-summary
 * Update agreed case summary and/or case theory line (user or chat case-builder approval).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (typeof body.agreedSummaryShort === "string") updates.agreed_summary_short = body.agreedSummaryShort;
    if (typeof body.agreedSummaryDetailed === "string") {
      updates.agreed_summary_detailed = body.agreedSummaryDetailed;
      updates.agreed_summary_updated_at = new Date().toISOString();
    }
    if (typeof body.agreedSummaryFull === "string") {
      updates.agreed_summary_full = body.agreedSummaryFull;
      updates.agreed_summary_updated_at = new Date().toISOString();
    }
    if (typeof body.agreedSummaryShort === "string") {
      updates.agreed_summary_updated_at = new Date().toISOString();
    }
    if (typeof body.caseTheoryLine === "string") {
      updates.case_theory_line = body.caseTheoryLine;
      updates.case_theory_updated_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("criminal_cases")
      .update(updates)
      .eq("id", caseId)
      .eq("org_id", orgId)
      .select("agreed_summary_short, agreed_summary_detailed, agreed_summary_full, case_theory_line, agreed_summary_updated_at, case_theory_updated_at")
      .single();

    if (error) {
      console.error("[criminal/agreed-summary] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update agreed summary" }, { status: 500 });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      agreedSummaryShort: row.agreed_summary_short ?? null,
      agreedSummaryDetailed: row.agreed_summary_detailed ?? null,
      agreedSummaryFull: row.agreed_summary_full ?? null,
      caseTheoryLine: row.case_theory_line ?? null,
      agreedSummaryUpdatedAt: row.agreed_summary_updated_at != null ? String(row.agreed_summary_updated_at) : null,
      caseTheoryUpdatedAt: row.case_theory_updated_at != null ? String(row.case_theory_updated_at) : null,
    });
  } catch (err) {
    console.error("[criminal/agreed-summary] PATCH unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
