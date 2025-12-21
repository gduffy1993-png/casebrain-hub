import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type CaseElement = {
  element: string;
  currentStrength: number; // 0-100
  attackPlan: string[];
  result: string;
  readyToUseAttacks: string[];
};

type CaseDestroyer = {
  elements: CaseElement[];
  overallStrength: number;
  destructionSequence: string[];
  readyToUseCombinedAttack: string;
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

    const elements: CaseElement[] = [];

    if (practiceArea === "criminal") {
      // Criminal case elements
      const angles = strategyData?.criticalAngles || [];

      // Identification
      const idAngles = angles.filter((a: any) => a.angleType === "IDENTIFICATION_CHALLENGE");
      const idStrength = idAngles.length > 0 ? 30 : 50;
      elements.push({
        element: "Identification Evidence",
        currentStrength: idStrength,
        attackPlan: idAngles.length > 0
          ? [
              "Challenge admissibility (Code D breach)",
              "Undermine reliability (poor CCTV, no formal procedure)",
              "Highlight inconsistencies",
              "Destroy in cross-examination",
            ]
          : ["Review identification evidence for weaknesses"],
        result: idStrength < 40 ? "Identification excluded/undermined" : "Identification weakened",
        readyToUseAttacks: idAngles[0]?.specificArguments?.slice(0, 3) || [
          "Identification is unsafe, should be excluded",
        ],
      });

      // Evidence
      const evidenceAngles = angles.filter((a: any) =>
        a.angleType === "PACE_BREACH_EXCLUSION" || a.angleType === "EVIDENCE_WEAKNESS_CHALLENGE"
      );
      const evidenceStrength = evidenceAngles.length > 0 ? 20 : 40;
      elements.push({
        element: "Evidence",
        currentStrength: evidenceStrength,
        attackPlan: evidenceAngles.length > 0
          ? [
              "Exclude under s.78 PACE (breaches)",
              "Challenge chain of custody",
              "Highlight absence of forensic link",
              "Undermine reliability",
            ]
          : ["Review evidence for PACE breaches"],
        result: evidenceStrength < 30 ? "Evidence excluded/undermined" : "Evidence weakened",
        readyToUseAttacks: evidenceAngles[0]?.specificArguments?.slice(0, 3) || [
          "Evidence obtained in breach of PACE should be excluded",
        ],
      });

      // Witnesses
      const witnessStrength = 40;
      elements.push({
        element: "Witnesses",
        currentStrength: witnessStrength,
        attackPlan: [
          "Destroy credibility (inconsistencies)",
          "Highlight identification weaknesses",
          "Undermine reliability",
          "Show motive to lie (if applicable)",
        ],
        result: "Witnesses discredited",
        readyToUseAttacks: ["Witness evidence is unreliable", "Witnesses can't agree on basic facts"],
      });

      // Forensics
      const forensicStrength = strategyData?.prosecutionVulnerabilities?.evidenceGaps?.some((g: string) =>
        g.toLowerCase().includes("forensic") || g.toLowerCase().includes("dna")
      )
        ? 10
        : 30;
      elements.push({
        element: "Forensics",
        currentStrength: forensicStrength,
        attackPlan: [
          "Highlight complete absence of link",
          "Show contamination risk",
          "Undermine reliability",
        ],
        result: "Forensics worthless",
        readyToUseAttacks: ["Complete absence of forensic evidence raises reasonable doubt"],
      });
    } else {
      // Civil case elements
      const weaknesses = strategyData?.weakSpots || strategyData?.prosecutionVulnerabilities?.criticalWeaknesses || [];

      elements.push({
        element: "Liability Evidence",
        currentStrength: weaknesses.length > 0 ? 40 : 60,
        attackPlan: weaknesses.length > 0
          ? [
              "Challenge evidence reliability",
              "Highlight gaps in evidence",
              "Undermine expert evidence (if applicable)",
            ]
          : ["Review liability evidence for weaknesses"],
        result: "Liability evidence weakened",
        readyToUseAttacks: weaknesses.slice(0, 3) || ["Evidence is insufficient"],
      });

      elements.push({
        element: "Procedural Compliance",
        currentStrength: 50,
        attackPlan: [
          "Highlight procedural failures",
          "Challenge late responses",
          "Undermine defense preparation",
        ],
        result: "Procedural failures exposed",
        readyToUseAttacks: ["Procedural failures undermine defense case"],
      });
    }

    // Calculate overall strength
    const avgStrength = elements.reduce((sum, e) => sum + e.currentStrength, 0) / elements.length;
    const overallStrength = Math.round(avgStrength);

    // Destruction sequence (attack weakest first)
    const sortedElements = [...elements].sort((a, b) => a.currentStrength - b.currentStrength);
    const destructionSequence = sortedElements.map(
      (e, idx) => `${idx + 1}. Destroy ${e.element} (strength: ${e.currentStrength}%) → ${e.result}`
    );

    // Combined attack
    const readyToUseCombinedAttack = `COMBINED ATTACK PLAN:

${elements.map((e, idx) => `${idx + 1}. ${e.element} (${e.currentStrength}% strength)
   Attack: ${e.attackPlan[0]}
   Result: ${e.result}
   Ready-to-Use: ${e.readyToUseAttacks[0] || "Attack this element"}`).join("\n\n")}

OVERALL PROSECUTION CASE STRENGTH: ${overallStrength}%
→ VERDICT: ${overallStrength < 30 ? "No case to answer / Not guilty" : overallStrength < 50 ? "Very weak case" : "Weak case"}

DESTRUCTION SEQUENCE:
${destructionSequence.join("\n")}

READY-TO-USE COMBINED SUBMISSION:
"Your Honour, I submit the [prosecution/defendant] case should [fail/be dismissed] on the following grounds:

${elements.map((e) => `- ${e.element}: ${e.readyToUseAttacks[0] || e.attackPlan[0]}`).join("\n")}

Taken together, these weaknesses mean the case is fundamentally flawed and should [fail/be dismissed]."`;

    const result: CaseDestroyer = {
      elements,
      overallStrength,
      destructionSequence,
      readyToUseCombinedAttack,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[case-destroyer] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate case destroyer",
      },
      { status: 500 }
    );
  }
}
