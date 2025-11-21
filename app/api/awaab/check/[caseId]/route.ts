import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateAwaabsLawStatus } from "@/lib/housing/awaabs-monitor";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { userId, orgId } = await requireAuthContext();
  const { caseId } = params;

  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: housingCase },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  if (!caseRecord || !housingCase) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404 },
    );
  }

  try {
    const status = calculateAwaabsLawStatus(housingCase, caseRecord.title);

    // Save or update trigger record
    const { error: upsertError } = await supabase
      .from("awaab_trigger")
      .upsert(
        {
          case_id: caseId,
          org_id: orgId,
          first_report_date: status.firstReportDate?.toISOString().split("T")[0] ?? null,
          investigation_date: status.investigationDate?.toISOString().split("T")[0] ?? null,
          work_start_date: status.workStartDate?.toISOString().split("T")[0] ?? null,
          work_complete_date: status.workCompleteDate?.toISOString().split("T")[0] ?? null,
          is_social_landlord: status.isSocialLandlord,
          days_until_investigation_deadline: status.daysUntilInvestigationDeadline,
          days_until_work_start_deadline: status.daysUntilWorkStartDeadline,
          days_until_completion_deadline: status.daysUntilCompletionDeadline,
          investigation_deadline_breached: status.investigationDeadlineBreached,
          work_start_deadline_breached: status.workStartDeadlineBreached,
          completion_deadline_breached: status.completionDeadlineBreached,
          overall_risk: status.overallRisk,
          risk_category: status.riskCategory,
          last_checked_at: new Date().toISOString(),
        },
        { onConflict: "case_id" },
      );

    if (upsertError) {
      console.error("[awaab-check] Failed to save trigger", upsertError);
      // Continue even if save fails
    }

    return NextResponse.json({
      ...status,
      disclaimer:
        "This is procedural guidance only and does not constitute legal advice. All dates and deadlines should be verified by a qualified legal professional.",
    });
  } catch (error) {
    console.error("[awaab-check] Error checking Awaab's Law", { error, caseId, orgId });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check Awaab's Law status",
        disclaimer:
          "This is procedural guidance only and does not constitute legal advice.",
      },
      { status: 500 },
    );
  }
}

