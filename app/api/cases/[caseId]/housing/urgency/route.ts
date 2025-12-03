import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { checkAwaabsLaw, checkSection11Lta } from "@/lib/housing/compliance";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  try {
    // Fetch housing case
    const { data: housingCase } = await supabase
      .from("housing_cases")
      .select("first_report_date, landlord_type, tenant_vulnerability")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!housingCase) {
      return NextResponse.json(
        { error: "Housing case not found" },
        { status: 404 }
      );
    }

    const isSocialLandlord = housingCase.landlord_type === "social" || 
                             housingCase.landlord_type === "council";
    const firstReportDate = housingCase.first_report_date 
      ? new Date(housingCase.first_report_date)
      : null;
    const isVulnerable = (housingCase.tenant_vulnerability?.length ?? 0) > 0;

    const now = new Date();
    const statutoryBreaches: string[] = [];
    let overallUrgency: "none" | "low" | "medium" | "high" | "critical" = "none";

    // Awaab's Law deadlines (social landlords only)
    let awaabInvestigationDeadline: {
      daysRemaining: number;
      deadlineDate: string;
      breached: boolean;
    } | undefined;

    let awaabWorkStartDeadline: {
      daysRemaining: number;
      deadlineDate: string;
      breached: boolean;
    } | undefined;

    if (isSocialLandlord && firstReportDate) {
      // Investigation deadline: 14 days from first report
      const investigationDeadline = new Date(firstReportDate);
      investigationDeadline.setDate(investigationDeadline.getDate() + 14);
      const daysUntilInvestigation = Math.floor(
        (investigationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const investigationBreached = daysUntilInvestigation < 0;

      awaabInvestigationDeadline = {
        daysRemaining: Math.max(0, daysUntilInvestigation),
        deadlineDate: investigationDeadline.toISOString(),
        breached: investigationBreached,
      };

      if (investigationBreached) {
        statutoryBreaches.push("Awaab's Law investigation deadline (14 days) exceeded");
        overallUrgency = "critical";
      } else if (daysUntilInvestigation <= 3) {
        overallUrgency = overallUrgency === "none" ? "high" : overallUrgency;
      }

      // Work start deadline: 7 days after investigation (assume investigation happened on day 14)
      const workStartDeadline = new Date(investigationDeadline);
      workStartDeadline.setDate(workStartDeadline.getDate() + 7);
      const daysUntilWorkStart = Math.floor(
        (workStartDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const workStartBreached = daysUntilWorkStart < 0;

      awaabWorkStartDeadline = {
        daysRemaining: Math.max(0, daysUntilWorkStart),
        deadlineDate: workStartDeadline.toISOString(),
        breached: workStartBreached,
      };

      if (workStartBreached) {
        statutoryBreaches.push("Awaab's Law work start deadline (7 days post-investigation) exceeded");
        overallUrgency = "critical";
      }
    }

    // Section 11 LTA reasonable time
    let section11ReasonableTime: {
      daysSinceReport: number;
      reasonableTime: number;
      exceeded: boolean;
    } | undefined;

    if (firstReportDate) {
      const daysSinceReport = Math.floor(
        (now.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const reasonableTime = isVulnerable ? 14 : 28; // Enhanced duty for vulnerable tenants
      const exceeded = daysSinceReport > reasonableTime;

      section11ReasonableTime = {
        daysSinceReport,
        reasonableTime,
        exceeded,
      };

      if (exceeded) {
        statutoryBreaches.push(`Section 11 LTA reasonable time (${reasonableTime} days) exceeded`);
        if (overallUrgency !== "critical") {
          overallUrgency = "high";
        }
      }
    }

    return NextResponse.json({
      data: {
        awaabInvestigationDeadline,
        awaabWorkStartDeadline,
        section11ReasonableTime,
        overallUrgency,
        statutoryBreaches,
      },
    });
  } catch (error) {
    console.error("[urgency] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch urgency data" },
      { status: 500 }
    );
  }
}

