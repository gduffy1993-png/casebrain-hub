import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type KillShotStrategy = {
  primaryStrategy: {
    name: string;
    winProbability: number;
    whyThisWins: string;
    exactSteps: string[];
    readyToUseSubmissions: string[];
    crossExaminationQuestions: string[];
    fallbackStrategy: string | null;
  };
  supportingAngles: Array<{
    angle: string;
    probability: number;
    howItSupports: string;
  }>;
  combinedProbability: number;
  executionOrder: string[];
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

    const supabase = getSupabaseAdminClient();

    // Get aggressive defense analysis
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const defenseAnalysis = aggressiveDefense?.analysis_json as any;

    if (!defenseAnalysis?.recommendedStrategy) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aggressive defense analysis not available. Please run analysis first.",
        },
        { status: 404 }
      );
    }

    const strategy = defenseAnalysis.recommendedStrategy;
    const primaryAngle = strategy.primaryAngle;

    if (!primaryAngle) {
      return NextResponse.json(
        {
          ok: false,
          error: "No primary defense angle identified",
        },
        { status: 404 }
      );
    }

    // Build exact steps from angle
    const exactSteps: string[] = [];

    // Step 1: Identify the application/submission needed
    if (primaryAngle.angleType === "PACE_BREACH_EXCLUSION") {
      exactSteps.push("Make s.78 PACE application at start of trial");
      exactSteps.push(`Submit: "${primaryAngle.legalBasis}"`);
      if (primaryAngle.caseLaw?.[0]) {
        exactSteps.push(`Cite: ${primaryAngle.caseLaw[0]} - similar breach led to exclusion`);
      }
      exactSteps.push("If excluded → immediately submit 'no case to answer'");
      exactSteps.push("If not excluded → use breach to undermine witness credibility");
    } else if (primaryAngle.angleType === "DISCLOSURE_FAILURE_STAY") {
      exactSteps.push("Make stay application under court's inherent jurisdiction");
      exactSteps.push(`Submit: "${primaryAngle.legalBasis}"`);
      if (primaryAngle.caseLaw?.[0]) {
        exactSteps.push(`Cite: ${primaryAngle.caseLaw[0]} - disclosure failures = stay`);
      }
      exactSteps.push("If stay granted → case dismissed");
      exactSteps.push("If stay refused → continue with disclosure breach arguments");
    } else if (primaryAngle.angleType === "NO_CASE_TO_ANSWER") {
      exactSteps.push("Submit 'no case to answer' at close of prosecution case");
      exactSteps.push(`Submit: "${primaryAngle.legalBasis}"`);
      if (primaryAngle.caseLaw?.[0]) {
        exactSteps.push(`Cite: ${primaryAngle.caseLaw[0]}`);
      }
      exactSteps.push("If successful → case dismissed");
      exactSteps.push("If unsuccessful → proceed with defense case");
    } else {
      // Generic steps
      exactSteps.push(`Execute strategy: ${primaryAngle.title}`);
      exactSteps.push(`Legal basis: ${primaryAngle.legalBasis}`);
      if (primaryAngle.caseLaw?.[0]) {
        exactSteps.push(`Authority: ${primaryAngle.caseLaw[0]}`);
      }
      exactSteps.push(primaryAngle.howToExploit || "Follow recommended exploitation plan");
    }

    // Get ready-to-use submissions
    const readyToUseSubmissions = primaryAngle.submissions || primaryAngle.specificArguments || [];

    // Get cross-examination questions
    const crossExaminationQuestions = primaryAngle.crossExaminationPoints || [];

    // Get fallback strategy
    const supportingAngles = strategy.supportingAngles || [];
    const fallbackStrategy = supportingAngles[0]
      ? `${supportingAngles[0].title} (${supportingAngles[0].winProbability}% probability)`
      : null;

    // Build supporting angles
    const supporting: KillShotStrategy["supportingAngles"] = supportingAngles.slice(0, 3).map((angle: any) => ({
      angle: angle.title,
      probability: angle.winProbability || 0,
      howItSupports: angle.whyThisMatters || "Supports primary strategy",
    }));

    // Execution order
    const executionOrder = [
      "1. Review primary strategy and exact steps",
      "2. Prepare ready-to-use submissions",
      "3. Prepare cross-examination questions",
      "4. Execute strategy in court",
      fallbackStrategy ? "5. If primary fails, use fallback strategy" : "5. Monitor prosecution response",
    ];

    const killShot: KillShotStrategy = {
      primaryStrategy: {
        name: primaryAngle.title,
        winProbability: primaryAngle.winProbability || 0,
        whyThisWins: primaryAngle.whyThisMatters || "Strong defense angle identified",
        exactSteps,
        readyToUseSubmissions: readyToUseSubmissions.slice(0, 5),
        crossExaminationQuestions: crossExaminationQuestions.slice(0, 10),
        fallbackStrategy,
      },
      supportingAngles: supporting,
      combinedProbability: strategy.combinedProbability || primaryAngle.winProbability || 0,
      executionOrder,
    };

    return NextResponse.json({ ok: true, data: killShot });
  } catch (error: any) {
    console.error("[kill-shot] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate kill shot strategy",
      },
      { status: 500 }
    );
  }
}
