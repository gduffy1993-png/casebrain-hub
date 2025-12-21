import "server-only";
import { NextRequest, NextRequest as NextRequestType, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type MultiAngleDevastation = {
  angles: Array<{
    angle: string;
    probability: number;
    howItSupports: string;
  }>;
  combinedAttack: string;
  winProbability: number;
  readyToUseCombinedSubmission: string;
};

export async function GET(
  request: NextRequestType,
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

    const angles: MultiAngleDevastation["angles"] = [];

    if (practiceArea === "criminal") {
      const criticalAngles = strategyData?.criticalAngles || [];
      
      // Get top 4 angles
      criticalAngles.slice(0, 4).forEach((angle: any) => {
        angles.push({
          angle: angle.title,
          probability: angle.winProbability || 0,
          howItSupports: angle.whyThisMatters || "Supports combined attack",
        });
      });
    } else {
      const weakSpots = strategyData?.weakSpots || [];
      const leverage = strategyData?.leveragePoints || [];

      // Combine weak spots and leverage
      [...weakSpots, ...leverage].slice(0, 4).forEach((item: any, idx: number) => {
        const label = typeof item === "string" ? item : item.title || item.label || `Weakness ${idx + 1}`;
        angles.push({
          angle: label,
          probability: 75 - (idx * 5), // Decreasing probability
          howItSupports: typeof item === "string" ? "Exploitable weakness" : item.description || "Supports combined attack",
        });
      });
    }

    // If no angles, add generic ones
    if (angles.length === 0) {
      angles.push(
        { angle: "Primary weakness", probability: 70, howItSupports: "Main attack point" },
        { angle: "Secondary weakness", probability: 60, howItSupports: "Supporting attack" },
        { angle: "Procedural failure", probability: 55, howItSupports: "Procedural leverage" }
      );
    }

    // Build combined attack
    const angleList = angles.map((a) => a.angle).join(", ");
    const combinedAttack = `Combine ${angles.length} angles: ${angleList}. Each angle weakens the case. Together, they destroy it.`;

    // Calculate combined probability (not simple addition - use geometric mean)
    const probabilities = angles.map((a) => a.probability / 100);
    const combinedProbability = Math.round(
      (1 - probabilities.reduce((prod, p) => prod * (1 - p), 1)) * 100
    );

    // Generate ready-to-use combined submission
    const readyToUseCombinedSubmission = practiceArea === "criminal"
      ? `Your Honour, I submit this case should be stayed as an abuse of process.

First, there are multiple PACE breaches - [specific breaches].

Second, there are serious disclosure failures - [specific failures].

Third, the identification evidence is unsafe - [specific weaknesses].

Fourth, there is a complete absence of forensic evidence - [specific absence].

Taken together, these failures mean a fair trial is impossible. The prosecution case is fundamentally flawed. I submit the case should be stayed as an abuse of process under the court's inherent jurisdiction and Article 6 ECHR.

Authority: R v H [2004] UKHL 3, R v Horseferry Road Magistrates [1994] AC 42.`
      : `I submit the [defendant/opponent] case should [fail/be struck out] on the following grounds:

First, [angle 1] - [how it supports].

Second, [angle 2] - [how it supports].

Third, [angle 3] - [how it supports].

Taken together, these weaknesses mean the case is fundamentally flawed and should [fail/be struck out].`;

    const result: MultiAngleDevastation = {
      angles,
      combinedAttack,
      winProbability: combinedProbability,
      readyToUseCombinedSubmission,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[multi-angle-devastation] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate multi-angle devastation",
      },
      { status: 500 }
    );
  }
}
