import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type Move = {
  action: string;
  timeline: "TODAY" | "THIS_WEEK" | "NEXT_WEEK" | "THIS_MONTH";
  readyToUse: string;
  who: "SOLICITOR" | "BARRISTER" | "CLIENT" | "TEAM";
  dependencies?: string[];
};

type TacticalCommand = {
  theAngle: {
    strategy: string;
    whyThisWins: string;
    winProbability: number;
    keyEvidence: string[];
    authority: string[];
  };
  theMove: {
    immediateAction: Move;
    nextSteps: Move[];
    combinedReadyToUse: string;
  };
  theBackup: {
    angle: string;
    whyBackupWorks: string;
    backupMove: Move;
    whenToSwitch: string[];
    winProbability: number;
  };
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

    // Get kill shot (primary angle)
    const { data: killShotAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "kill_shot" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get aggressive defense (moves)
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get strategic overview (backup angles)
    const { data: strategicOverview } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const killShotData = killShotAnalysis?.analysis_json as any;
    const aggressiveData = aggressiveDefense?.analysis_json as any;
    const strategicData = strategicOverview?.analysis_json as any;

    // Extract THE ANGLE
    const primaryStrategy = killShotData?.primaryStrategy || aggressiveData?.criticalAngles?.[0] || strategicData?.primaryStrategy;
    const theAngle = {
      strategy: primaryStrategy?.name || primaryStrategy?.title || primaryStrategy?.strategy || "Review case for primary angle",
      whyThisWins: primaryStrategy?.whyThisWins || primaryStrategy?.whyThisMatters || "This angle exploits key weaknesses",
      winProbability: primaryStrategy?.winProbability || aggressiveData?.overallWinProbability || 0,
      keyEvidence: primaryStrategy?.keyEvidence || primaryStrategy?.supportingFacts?.slice(0, 3) || [],
      authority: primaryStrategy?.authority || primaryStrategy?.authorities || [],
    };

    // Extract THE MOVE
    const exactSteps = primaryStrategy?.exactSteps || primaryStrategy?.steps || [];
    const immediateAction: Move = {
      action: exactSteps[0] || "Review case documents and identify immediate action",
      timeline: "TODAY",
      readyToUse: primaryStrategy?.readyToUseSubmissions?.[0] || primaryStrategy?.readyToUse?.[0] || "Draft immediate action based on primary angle",
      who: "SOLICITOR",
    };

    const nextSteps: Move[] = exactSteps.slice(1, 4).map((step: string, idx: number) => ({
      action: step,
      timeline: idx === 0 ? "THIS_WEEK" : idx === 1 ? "NEXT_WEEK" : "THIS_MONTH",
      readyToUse: primaryStrategy?.readyToUseSubmissions?.[idx + 1] || primaryStrategy?.readyToUse?.[idx + 1] || step,
      who: idx === 0 ? "SOLICITOR" : idx === 1 ? "BARRISTER" : "TEAM",
    }));

    const combinedReadyToUse = `TACTICAL COMMAND - READY TO USE ACTIONS:

IMMEDIATE (TODAY):
${immediateAction.readyToUse}

${nextSteps.map((step, idx) => `${idx === 0 ? "THIS WEEK" : idx === 1 ? "NEXT WEEK" : "THIS MONTH"}:
${step.readyToUse}`).join("\n\n")}`;

    // Extract THE BACKUP
    const fallbackStrategy = primaryStrategy?.fallbackStrategy || strategicData?.alternativeStrategies?.[0] || aggressiveData?.criticalAngles?.[1];
    const backupAngle = typeof fallbackStrategy === "string" 
      ? fallbackStrategy 
      : fallbackStrategy?.angle || fallbackStrategy?.title || "Alternative strategy based on secondary weaknesses";

    const backupMove: Move = {
      action: fallbackStrategy?.steps?.[0] || "Switch to backup angle and execute alternative strategy",
      timeline: "THIS_WEEK",
      readyToUse: fallbackStrategy?.readyToUse?.[0] || "Execute backup strategy based on alternative angle",
      who: "SOLICITOR",
    };

    const whenToSwitch = [
      `If ${theAngle.strategy} fails or is rejected`,
      `If prosecution provides evidence that undermines primary angle`,
      `If court rules against primary angle`,
    ];

    const theBackup = {
      angle: backupAngle,
      whyBackupWorks: fallbackStrategy?.whyThisWorks || "This alternative angle exploits different weaknesses",
      backupMove,
      whenToSwitch,
      winProbability: fallbackStrategy?.winProbability || fallbackStrategy?.probability || 0,
    };

    const result: TacticalCommand = {
      theAngle,
      theMove: {
        immediateAction,
        nextSteps,
        combinedReadyToUse,
      },
      theBackup,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[tactical-command] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate tactical command",
      },
      { status: 500 }
    );
  }
}
