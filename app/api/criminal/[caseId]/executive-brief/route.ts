import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { CriminalMeta } from "@/types/case";

export const runtime = "nodejs";

type ExecutiveBrief = {
  caseInfo: {
    caseTitle: string;
    charge: string;
    court: string;
    hearingDate: string | null;
  };
  winningAngle: {
    strategy: string;
    winProbability: number;
    whyThisWins: string;
  };
  criticalWeakness: {
    weakness: string;
    attackPoint: string;
  };
  keyFacts: string[]; // Max 5
  redFlags: Array<{
    type: "PACE_BREACH" | "DISCLOSURE_GAP" | "EVIDENCE_ISSUE" | "OTHER";
    description: string;
  }>; // Max 3
  actionItems: Array<{
    priority: "CRITICAL" | "HIGH" | "MEDIUM";
    action: string;
  }>; // Max 3
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

    // Get case details
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("title, practice_area, criminal_meta")
      .eq("id", caseId)
      .maybeSingle();

    // Get criminal meta
    const criminalMeta = (caseRecord?.criminal_meta as CriminalMeta | null) || null;

    // Get charges
    const charges = criminalMeta?.charges || [];
    const primaryCharge = charges[0]?.offence || "Charge details pending";
    const court = criminalMeta?.court || "Court TBC";
    const nextHearing = (criminalMeta as any)?.hearings?.[0]?.date || null;

    // Get aggressive defense analysis to find winning angle
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const defenseAnalysis = aggressiveDefense?.analysis_json as any;

    // Determine winning angle from aggressive defense
    let winningStrategy = "Full defense strategy pending analysis";
    let winProbability = 0;
    let whyThisWins = "Analysis in progress";

    if (defenseAnalysis?.recommendedStrategy) {
      const strategy = defenseAnalysis.recommendedStrategy;
      winningStrategy = strategy.primaryAngle?.title || "Multiple defense angles identified";
      winProbability = strategy.combinedProbability || strategy.primaryAngle?.winProbability || 0;
      whyThisWins = strategy.primaryAngle?.whyThisMatters || "Strong defense case identified";
    } else if (defenseAnalysis?.criticalAngles?.[0]) {
      const topAngle = defenseAnalysis.criticalAngles[0];
      winningStrategy = topAngle.title;
      winProbability = topAngle.winProbability || 0;
      whyThisWins = topAngle.whyThisMatters || "Critical defense angle identified";
    }

    // Get key facts from case summary
    const { data: summary } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "case_summary")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const summaryData = summary?.analysis_json as any;
    const keyFacts: string[] = [];

    if (summaryData?.keyFacts) {
      const facts = summaryData.keyFacts;
      if (facts.whatHappened) keyFacts.push(`What: ${facts.whatHappened}`);
      if (facts.when) keyFacts.push(`When: ${facts.when}`);
      if (facts.where) keyFacts.push(`Where: ${facts.where}`);
      if (facts.keyWitnesses?.length > 0) {
        keyFacts.push(`Witnesses: ${facts.keyWitnesses.slice(0, 2).join(", ")}`);
      }
      if (facts.mainEvidence) keyFacts.push(`Evidence: ${facts.mainEvidence}`);
    }

    // If not enough facts, generate from documents
    if (keyFacts.length < 3 && context.documents.length > 0) {
      const docNames = context.documents.slice(0, 3).map((d) => d.name);
      if (keyFacts.length === 0) {
        keyFacts.push(`Documents: ${docNames.join(", ")}`);
      }
    }

    // Get red flags from PACE/disclosure/evidence analysis
    const redFlags: ExecutiveBrief["redFlags"] = [];

    // Check for PACE breaches
    if (defenseAnalysis?.criticalAngles) {
      const paceBreaches = defenseAnalysis.criticalAngles.filter(
        (a: any) => a.angleType === "PACE_BREACH_EXCLUSION"
      );
      if (paceBreaches.length > 0) {
        redFlags.push({
          type: "PACE_BREACH",
          description: paceBreaches[0].title || "PACE Code breach identified",
        });
      }
    }

    // Check for disclosure failures
    if (defenseAnalysis?.criticalAngles) {
      const disclosureFailures = defenseAnalysis.criticalAngles.filter(
        (a: any) => a.angleType === "DISCLOSURE_FAILURE_STAY"
      );
      if (disclosureFailures.length > 0) {
        redFlags.push({
          type: "DISCLOSURE_GAP",
          description: disclosureFailures[0].title || "Disclosure failure identified",
        });
      }
    }

    // Check for evidence issues
    if (defenseAnalysis?.criticalAngles) {
      const evidenceIssues = defenseAnalysis.criticalAngles.filter(
        (a: any) =>
          a.angleType === "EVIDENCE_WEAKNESS_CHALLENGE" ||
          a.angleType === "IDENTIFICATION_CHALLENGE"
      );
      if (evidenceIssues.length > 0 && redFlags.length < 3) {
        redFlags.push({
          type: "EVIDENCE_ISSUE",
          description: evidenceIssues[0].title || "Evidence weakness identified",
        });
      }
    }

    // Determine critical weakness
    let criticalWeakness = "Analysis pending";
    let attackPoint = "Review case documents";

    if (defenseAnalysis?.prosecutionVulnerabilities?.criticalWeaknesses?.[0]) {
      criticalWeakness = defenseAnalysis.prosecutionVulnerabilities.criticalWeaknesses[0];
      attackPoint = "Exploit this weakness immediately";
    } else if (defenseAnalysis?.criticalAngles?.[0]) {
      criticalWeakness = defenseAnalysis.criticalAngles[0].prosecutionWeakness || "Multiple weaknesses identified";
      attackPoint = defenseAnalysis.criticalAngles[0].howToExploit || "Follow recommended strategy";
    }

    // Generate action items
    const actionItems: ExecutiveBrief["actionItems"] = [];

    if (defenseAnalysis?.recommendedStrategy?.tacticalPlan?.[0]) {
      actionItems.push({
        priority: "CRITICAL",
        action: defenseAnalysis.recommendedStrategy.tacticalPlan[0],
      });
    }

    if (defenseAnalysis?.recommendedStrategy?.specificArguments?.[0]) {
      actionItems.push({
        priority: "HIGH",
        action: `Make submission: ${defenseAnalysis.recommendedStrategy.specificArguments[0].substring(0, 100)}...`,
      });
    }

    if (defenseAnalysis?.recommendedStrategy?.crossExaminationPoints?.[0]) {
      actionItems.push({
        priority: "HIGH",
        action: `Cross-examine on: ${defenseAnalysis.recommendedStrategy.crossExaminationPoints[0].substring(0, 100)}...`,
      });
    }

    // If no action items, add generic ones
    if (actionItems.length === 0) {
      actionItems.push(
        { priority: "CRITICAL", action: "Review case documents and identify defense strategy" },
        { priority: "HIGH", action: "Identify prosecution weaknesses" },
        { priority: "MEDIUM", action: "Prepare defense submissions" }
      );
    }

    const brief: ExecutiveBrief = {
      caseInfo: {
        caseTitle: caseRecord?.title || "Case",
        charge: primaryCharge,
        court,
        hearingDate: nextHearing,
      },
      winningAngle: {
        strategy: winningStrategy,
        winProbability: Math.round(winProbability),
        whyThisWins,
      },
      criticalWeakness: {
        weakness: criticalWeakness,
        attackPoint,
      },
      keyFacts: keyFacts.slice(0, 5),
      redFlags: redFlags.slice(0, 3),
      actionItems: actionItems.slice(0, 3),
    };

    return NextResponse.json({ ok: true, data: brief });
  } catch (error: any) {
    console.error("[executive-brief] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate executive brief",
      },
      { status: 500 }
    );
  }
}
