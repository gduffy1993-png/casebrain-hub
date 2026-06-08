import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type NextMove = {
  rightNow: {
    action: string;
    readyToUse: string;
    who: string;
    deadline?: string;
  };
  thisWeek: {
    action: string;
    readyToUse: string;
    who: string;
    dependencies: string[];
  };
  thisMonth: {
    action: string;
    readyToUse: string;
    who: string;
    dependencies: string[];
  };
  dependencies: string[];
  combinedActionPlan: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { userId } = await requireAuthContext();
    const { caseId } = await params;

    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return NextResponse.json(
        { ok: false, data: null, banner: context.banner, diagnostics: context.diagnostics },
        { status: 404 }
      );
    }

    try {
      guardAnalysis(context);
    } catch (error: any) {
      if (error.name === "AnalysisGateError") {
        return NextResponse.json({
          ok: false,
          data: null,
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const practiceArea = normalizePracticeArea(context.case.practice_area as string | null);
    const supabase = getSupabaseAdminClient();

    // Get kill shot for immediate actions
    const { data: killShotAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "kill_shot" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const killShotData = killShotAnalysis?.analysis_json as any;
    const primaryStrategy = killShotData?.primaryStrategy || killShotData?.primaryStrategy;

    // RIGHT NOW (Today)
    const rightNowAction = primaryStrategy?.exactSteps?.[0] || "Review case documents and identify immediate action";
    const rightNowReadyToUse = primaryStrategy?.readyToUseSubmissions?.[0] || primaryStrategy?.readyToUse?.[0] || rightNowAction;

    // THIS WEEK
    const thisWeekAction = primaryStrategy?.exactSteps?.[1] || "Execute next step in primary strategy";
    const thisWeekReadyToUse = primaryStrategy?.readyToUseSubmissions?.[1] || primaryStrategy?.readyToUse?.[1] || thisWeekAction;

    // THIS MONTH
    const thisMonthAction = primaryStrategy?.exactSteps?.[2] || "Follow up on strategy execution";
    const thisMonthReadyToUse = primaryStrategy?.readyToUseSubmissions?.[2] || primaryStrategy?.readyToUse?.[2] || thisMonthAction;

    const dependencies = [
      rightNowAction !== "Review case documents" ? "Complete immediate action first" : "Review case documents",
      thisWeekAction !== "Execute next step" ? "Complete this week's action" : "Execute next step",
    ];

    const combinedActionPlan = `NEXT MOVE ACTION PLAN:

RIGHT NOW (TODAY):
Action: ${rightNowAction}
Who: Solicitor
Ready-to-Use: ${rightNowReadyToUse}

THIS WEEK:
Action: ${thisWeekAction}
Who: ${thisWeekAction.includes("barrister") || thisWeekAction.includes("Barrister") ? "Barrister" : "Solicitor"}
Dependencies: ${dependencies[0]}
Ready-to-Use: ${thisWeekReadyToUse}

THIS MONTH:
Action: ${thisMonthAction}
Who: Team
Dependencies: ${dependencies[1]}
Ready-to-Use: ${thisMonthReadyToUse}`;

    const result: NextMove = {
      rightNow: {
        action: rightNowAction,
        readyToUse: rightNowReadyToUse,
        who: "Solicitor",
        deadline: "Today",
      },
      thisWeek: {
        action: thisWeekAction,
        readyToUse: thisWeekReadyToUse,
        who: thisWeekAction.includes("barrister") || thisWeekAction.includes("Barrister") ? "Barrister" : "Solicitor",
        dependencies: [dependencies[0]],
      },
      thisMonth: {
        action: thisMonthAction,
        readyToUse: thisMonthReadyToUse,
        who: "Team",
        dependencies: [dependencies[1]],
      },
      dependencies,
      combinedActionPlan,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[next-move] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate next move",
      },
      { status: 500 }
    );
  }
}
