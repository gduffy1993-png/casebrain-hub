import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea, type PracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type WitnessCredibilityAttack = {
  witness: string;
  attacks: Array<{
    type: "INCONSISTENT_STATEMENTS" | "IDENTIFICATION_WEAKNESS" | "MOTIVE_TO_LIE" | "EVIDENCE_WEAKNESS" | "PROCEDURAL_ISSUE" | "OTHER";
    description: string;
    questions: string[];
    underminingStrategy: string;
  }>;
  readyToUseQuestions: string[];
  overallStrategy: string;
};

type WitnessAnalysis = {
  witnesses: WitnessCredibilityAttack[];
  topTargets: string[]; // Witnesses to attack first
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
    const practiceArea = normalizePracticeArea(context.case.practice_area as string | null);

    // Get case summary for witness extraction
    const { data: summary } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "case_summary")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const summaryData = summary?.analysis_json as any;

    // Get aggressive defense/strategy analysis
    const { data: strategyAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const strategyData = strategyAnalysis?.analysis_json as any;

    const witnesses: WitnessCredibilityAttack[] = [];

    // Extract witnesses from summary
    const keyWitnesses = summaryData?.keyFacts?.keyWitnesses || [];
    const parties = summaryData?.parties || [];

    // Combine and deduplicate
    const allWitnesses = [...new Set([...keyWitnesses, ...parties.map((p: any) => p.name).filter(Boolean)])];

    // For each witness, find attacks
    allWitnesses.slice(0, 5).forEach((witnessName: string) => {
      const attacks: WitnessCredibilityAttack["attacks"] = [];
      const questions: string[] = [];

      // Find attacks from strategy analysis
      if (strategyData) {
        // Criminal-specific attacks
        if (practiceArea === "criminal") {
          const angles = strategyData.criticalAngles || strategyData.allAngles || [];
          
          // Identification weakness attacks
          const idAttacks = angles.filter((a: any) => 
            a.angleType === "IDENTIFICATION_CHALLENGE" || 
            a.title?.toLowerCase().includes("identification")
          );
          if (idAttacks.length > 0) {
            attacks.push({
              type: "IDENTIFICATION_WEAKNESS",
              description: idAttacks[0].prosecutionWeakness || "Identification evidence is weak",
              questions: idAttacks[0].crossExaminationPoints?.slice(0, 5) || [
                "You didn't know my client before this incident, correct?",
                "You identified him from photographs, not a formal procedure?",
                "You can't be certain it was my client, can you?",
              ],
              underminingStrategy: idAttacks[0].howToExploit || "Undermine identification reliability",
            });
            questions.push(...(idAttacks[0].crossExaminationPoints?.slice(0, 5) || []));
          }

          // Inconsistent statements
          const contradictionAttacks = angles.filter((a: any) =>
            a.angleType === "CONTRADICTION_EXPLOITATION"
          );
          if (contradictionAttacks.length > 0) {
            attacks.push({
              type: "INCONSISTENT_STATEMENTS",
              description: contradictionAttacks[0].prosecutionWeakness || "Statements are inconsistent",
              questions: [
                "Your first statement was different, wasn't it?",
                "You've changed your account, haven't you?",
                "Which version is the truth?",
              ],
              underminingStrategy: "Highlight inconsistencies to undermine credibility",
            });
          }
        }

        // Civil-specific attacks (housing, PI, family)
        if (practiceArea !== "criminal") {
          const weaknesses = strategyData.weakSpots || strategyData.prosecutionVulnerabilities?.criticalWeaknesses || [];
          
          if (weaknesses.length > 0) {
            attacks.push({
              type: "EVIDENCE_WEAKNESS",
              description: weaknesses[0] || "Evidence is weak",
              questions: [
                "You can't produce evidence to support that, can you?",
                "That's just your opinion, isn't it?",
                "You have no documentation to back that up, do you?",
              ],
              underminingStrategy: "Challenge evidence reliability",
            });
          }
        }
      }

      // Generic attacks if none found
      if (attacks.length === 0) {
        attacks.push({
          type: "OTHER",
          description: "Review witness statement for inconsistencies and weaknesses",
          questions: [
            "Can you be certain about that?",
            "Is that your best recollection?",
            "You're not sure, are you?",
          ],
          underminingStrategy: "Question reliability and certainty",
        });
      }

      witnesses.push({
        witness: witnessName,
        attacks,
        readyToUseQuestions: questions.length > 0 ? questions : attacks[0]?.questions || [],
        overallStrategy: attacks[0]?.underminingStrategy || "Undermine witness credibility through cross-examination",
      });
    });

    // Rank by number of attacks
    witnesses.sort((a, b) => b.attacks.length - a.attacks.length);
    const topTargets = witnesses.slice(0, 3).map((w) => w.witness);

    const result: WitnessAnalysis = {
      witnesses,
      topTargets,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[witness-analysis] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate witness analysis",
      },
      { status: 500 }
    );
  }
}
