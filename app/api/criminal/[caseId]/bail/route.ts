import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
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
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("bail_status, bail_conditions, next_bail_review, remand_time_hours")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!criminalCase) {
      return NextResponse.json({
        bailStatus: null,
        bailConditions: [],
        nextBailReview: null,
        remandTimeHours: null,
      });
    }

    return NextResponse.json({
      bailStatus: criminalCase.bail_status,
      bailConditions: criminalCase.bail_conditions || [],
      nextBailReview: criminalCase.next_bail_review,
      remandTimeHours: criminalCase.remand_time_hours,
    });
  } catch (error) {
    console.error("[criminal/bail] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bail information" },
      { status: 500 },
    );
  }
}

