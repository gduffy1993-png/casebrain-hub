import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type ProsecutionTrap = {
  trap: string;
  question: string;
  expectedAnswer: string;
  trapQuestion: string;
  result: string;
  readyToUse: string;
};

type ProsecutionTraps = {
  traps: ProsecutionTrap[];
  topTraps: ProsecutionTrap[]; // Top 3
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

    // Get strategy analysis
    const { data: strategyAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const strategyData = strategyAnalysis?.analysis_json as any;

    const traps: ProsecutionTrap[] = [];

    if (practiceArea === "criminal") {
      const angles = strategyData?.criticalAngles || [];

      // Disclosure failure trap
      const hasDisclosure = angles.some((a: any) => a.angleType === "DISCLOSURE_FAILURE_STAY");
      if (hasDisclosure) {
        traps.push({
          trap: "Disclosure Failure Admission",
          question: "You accept that mobile phone data was requested three times and not provided?",
          expectedAnswer: "Yes",
          trapQuestion: "So you accept disclosure failure?",
          result: "Admission of failure = stay application stronger",
          readyToUse: "Question: 'You accept that [evidence] was requested [X] times and not provided?' → 'So you accept disclosure failure?'",
        });
      }

      // Identification weakness trap
      const hasIdWeakness = angles.some((a: any) => a.angleType === "IDENTIFICATION_CHALLENGE");
      if (hasIdWeakness) {
        traps.push({
          trap: "Identification Weakness Admission",
          question: "You accept the CCTV doesn't show the suspect's face?",
          expectedAnswer: "Yes",
          trapQuestion: "So identification is unsafe?",
          result: "Admission of weakness = exclusion stronger",
          readyToUse: "Question: 'You accept the CCTV doesn't show the suspect's face?' → 'So identification is unsafe?'",
        });
      }

      // PACE breach trap
      const hasPaceBreach = angles.some((a: any) => a.angleType === "PACE_BREACH_EXCLUSION");
      if (hasPaceBreach) {
        traps.push({
          trap: "PACE Breach Admission",
          question: "You accept the interview was conducted without a solicitor?",
          expectedAnswer: "Yes",
          trapQuestion: "So Code C was breached?",
          result: "Admission of breach = exclusion stronger",
          readyToUse: "Question: 'You accept the interview was conducted without a solicitor?' → 'So Code C was breached?'",
        });
      }

      // Generic traps
      traps.push(
        {
          trap: "Evidence Reliability",
          question: "You can't be certain about that, can you?",
          expectedAnswer: "No / I'm not certain",
          trapQuestion: "So the evidence is unreliable?",
          result: "Admission of uncertainty = evidence weakened",
          readyToUse: "Question: 'You can't be certain about that, can you?' → 'So the evidence is unreliable?'",
        },
        {
          trap: "Witness Agreement",
          question: "The other witnesses don't agree with you, do they?",
          expectedAnswer: "I don't know / They might not",
          trapQuestion: "So your evidence conflicts with theirs?",
          result: "Admission of conflict = credibility undermined",
          readyToUse: "Question: 'The other witnesses don't agree with you, do they?' → 'So your evidence conflicts with theirs?'",
        }
      );
    } else {
      // Civil traps
      const weaknesses = strategyData?.weakSpots || [];

      if (weaknesses.length > 0) {
        traps.push({
          trap: "Evidence Gap",
          question: "You can't produce evidence to support that, can you?",
          expectedAnswer: "No / Not yet",
          trapQuestion: "So you have no evidence?",
          result: "Admission of no evidence = case weakened",
          readyToUse: "Question: 'You can't produce evidence to support that, can you?' → 'So you have no evidence?'",
        });
      }

      traps.push(
        {
          trap: "Procedural Failure",
          question: "You failed to respond within the time limit, didn't you?",
          expectedAnswer: "Yes / I was late",
          trapQuestion: "So you breached the protocol?",
          result: "Admission of breach = sanctions/strike-out stronger",
          readyToUse: "Question: 'You failed to respond within the time limit, didn't you?' → 'So you breached the protocol?'",
        },
        {
          trap: "Expert Reliability",
          question: "Your expert contradicts their own report, doesn't they?",
          expectedAnswer: "I don't know / Possibly",
          trapQuestion: "So the expert is unreliable?",
          result: "Admission of contradiction = expert excluded",
          readyToUse: "Question: 'Your expert contradicts their own report, doesn't they?' → 'So the expert is unreliable?'",
        }
      );
    }

    // Rank by impact
    const topTraps = traps.slice(0, 3);

    const result: ProsecutionTraps = {
      traps,
      topTraps,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[prosecution-traps] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate prosecution traps",
      },
      { status: 500 }
    );
  }
}
