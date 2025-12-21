import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type ClientCommunication = {
  whatToTell: {
    summary: string;
    keyPoints: string[];
    expectations: string[];
    timeline: string;
  };
  whatNotToSay: string[];
  readyToUseUpdate: string;
  clientFriendlyAngle: string;
  riskAssessment: {
    level: "LOW" | "MEDIUM" | "HIGH";
    explanation: string;
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

    // Get tactical command for angle
    const { data: tacticalCommand } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "kill_shot" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get probability/win chance
    const { data: probabilityAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tacticalData = tacticalCommand?.analysis_json as any;
    const probabilityData = probabilityAnalysis?.analysis_json as any;

    const primaryStrategy = tacticalData?.primaryStrategy || tacticalData?.primaryStrategy;
    const winProbability = primaryStrategy?.winProbability || probabilityData?.overallWinProbability || 0;

    // What to tell client (plain English)
    const strategyPlainEnglish = primaryStrategy?.name || primaryStrategy?.title || "We have identified a strong defense strategy";
    const clientFriendlyAngle = practiceArea === "criminal"
      ? `We're challenging the prosecution's evidence. ${strategyPlainEnglish.toLowerCase()}. This is a strong defense because ${primaryStrategy?.whyThisWins || "the prosecution case has weaknesses"}.`
      : `We have a strong case. ${strategyPlainEnglish.toLowerCase()}. This works because ${primaryStrategy?.whyThisWins || "the opponent's case has weaknesses"}.`;

    const keyPoints = [
      `Our primary strategy: ${strategyPlainEnglish}`,
      `Win probability: ${winProbability}%`,
      primaryStrategy?.whyThisWins || "The case has strong defense angles",
    ];

    const expectations = [
      winProbability >= 70
        ? "Strong chance of success - case looks very favorable"
        : winProbability >= 40
          ? "Good chance of success - case has strong defense points"
          : "Case is challenging but we have viable defense strategies",
      "We will keep you updated as the case progresses",
      "Next steps will be communicated clearly",
    ];

    const timeline = practiceArea === "criminal"
      ? "We will prepare our defense and respond to prosecution moves. Court dates will be communicated as soon as confirmed."
      : "We will proceed with our strategy and respond to opponent moves. Timeline will depend on court/opponent responses.";

    // What NOT to say
    const whatNotToSay = [
      "Don't discuss case details with anyone except your legal team",
      "Don't post about the case on social media",
      "Don't contact witnesses or the other party directly",
      winProbability < 50 ? "Don't make promises about outcome - case is still developing" : "Don't assume outcome is guaranteed - stay focused",
    ];

    // Risk assessment
    let riskLevel: "LOW" | "MEDIUM" | "HIGH";
    let riskExplanation: string;

    if (winProbability >= 70) {
      riskLevel = "LOW";
      riskExplanation = "Case looks very strong. High probability of favorable outcome.";
    } else if (winProbability >= 40) {
      riskLevel = "MEDIUM";
      riskExplanation = "Case has good defense points but outcome is not certain. We have viable strategies.";
    } else {
      riskLevel = "HIGH";
      riskExplanation = "Case is challenging. We have defense strategies but need to be prepared for all outcomes.";
    }

    // Ready-to-use client update
    const readyToUseUpdate = `CLIENT UPDATE - ${context.case.title || "Case"}

Dear Client,

I wanted to update you on the progress of your case.

OUR STRATEGY:
${clientFriendlyAngle}

KEY POINTS:
${keyPoints.map((point) => `• ${point}`).join("\n")}

WHAT TO EXPECT:
${expectations.map((exp) => `• ${exp}`).join("\n")}

TIMELINE:
${timeline}

RISK ASSESSMENT:
${riskLevel} - ${riskExplanation}

IMPORTANT REMINDERS:
${whatNotToSay.map((item) => `• ${item}`).join("\n")}

I will keep you updated as the case progresses. Please don't hesitate to contact me if you have any questions.

Best regards,
[Your Name]`;

    const result: ClientCommunication = {
      whatToTell: {
        summary: clientFriendlyAngle,
        keyPoints,
        expectations,
        timeline,
      },
      whatNotToSay,
      readyToUseUpdate,
      clientFriendlyAngle,
      riskAssessment: {
        level: riskLevel,
        explanation: riskExplanation,
      },
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[client-communication] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate client communication",
      },
      { status: 500 }
    );
  }
}
