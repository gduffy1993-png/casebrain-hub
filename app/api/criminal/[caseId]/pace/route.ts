import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/pace
 * Fetch PACE compliance information
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: pace, error } = await supabase
      .from("pace_compliance")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[criminal/pace] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch PACE compliance" },
        { status: 500 },
      );
    }

    if (!pace) {
      return NextResponse.json({
        cautionGiven: null,
        cautionGivenBeforeQuestioning: null,
        interviewRecorded: null,
        rightToSolicitor: null,
        solicitorPresent: null,
        detentionTimeHours: null,
        detentionTimeExceeded: null,
        breachesDetected: [],
        breachSeverity: null,
      });
    }

    return NextResponse.json({
      cautionGiven: pace.caution_given,
      cautionGivenBeforeQuestioning: pace.caution_given_before_questioning,
      interviewRecorded: pace.interview_recorded,
      rightToSolicitor: pace.right_to_solicitor,
      solicitorPresent: pace.solicitor_present,
      detentionTimeHours: pace.detention_time_hours,
      detentionTimeExceeded: pace.detention_time_exceeded,
      breachesDetected: pace.breaches_detected || [],
      breachSeverity: pace.breach_severity,
    });
  } catch (error) {
    console.error("[criminal/pace] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PACE compliance" },
      { status: 500 },
    );
  }
}

