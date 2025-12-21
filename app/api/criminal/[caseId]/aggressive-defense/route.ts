/**
 * GET /api/criminal/[caseId]/aggressive-defense
 * 
 * Returns aggressive defense analysis - finds EVERY possible angle to win
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllDefenseAngles } from "@/lib/criminal/aggressive-defense-engine";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";
import { analyzeEvidenceStrength } from "@/lib/evidence-strength-analyzer";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;
      const { caseId } = await params;

      // Build case context and gate analysis
      const context = await buildCaseContext(caseId, { userId });
      
      try {
        guardAnalysis(context);
      } catch (error) {
        if (error instanceof AnalysisGateError) {
          return NextResponse.json({
            ok: false,
            data: null,
            banner: error.banner,
            diagnostics: error.diagnostics,
          });
        }
        throw error;
      }

      const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
      const gate = shouldShowProbabilities({
        practiceArea: "criminal",
        completeness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });

    // Verify case access
    const supabase = getSupabaseAdminClient();
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRecord || caseRecord.practice_area !== "criminal") {
      return NextResponse.json({ error: "Case not found or not a criminal case" }, { status: 404 });
    }

    // Get criminal case data
    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!criminalCase) {
      return NextResponse.json({ error: "Criminal case data not found" }, { status: 404 });
    }

    // Get extracted facts (contains criminalMeta)
    const { data: documents } = await supabase
      .from("documents")
      .select("extracted_facts")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .limit(1)
      .single();

    let criminalMeta = null;
    if (documents?.extracted_facts) {
      const facts = typeof documents.extracted_facts === "string" 
        ? JSON.parse(documents.extracted_facts) 
        : documents.extracted_facts;
      criminalMeta = facts.criminalMeta || null;
    }

    // Get documents for evidence strength analysis
    const { data: allDocuments } = await supabase
      .from("documents")
      .select("extracted_facts, raw_text")
      .eq("case_id", caseId);

    // Get key facts
    const { data: keyFacts } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "key_facts")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get aggressive defense analysis
    const analysis = await findAllDefenseAngles(criminalMeta, caseId);

    // Analyze evidence strength for reality calibration
    const evidenceStrength = analyzeEvidenceStrength({
      documents: (allDocuments || []) as any[],
      keyFacts: keyFacts?.analysis_json,
      aggressiveDefense: analysis,
      strategicOverview: null,
    });

    // Apply reality calibration to win probabilities
    if (evidenceStrength.overallStrength >= 70) {
      // Strong prosecution case - downgrade all win probabilities
      if (analysis.recommendedStrategy) {
        analysis.recommendedStrategy.combinedProbability = Math.max(20, 
          Math.round((analysis.recommendedStrategy.combinedProbability || 70) * 0.4)
        );
      }
      if (analysis.overallWinProbability) {
        analysis.overallWinProbability = Math.max(20, 
          Math.round(analysis.overallWinProbability * 0.4)
        );
      }
      // Downgrade disclosure stay angles specifically
      analysis.criticalAngles = (analysis.criticalAngles || []).map((angle: any) => {
        if (angle.angleType === "DISCLOSURE_FAILURE_STAY" && evidenceStrength.calibration.shouldDowngradeDisclosureStay) {
          return {
            ...angle,
            winProbability: Math.max(30, Math.round((angle.winProbability || 70) * 0.5)),
            specificArguments: angle.specificArguments?.map((arg: string) => 
              arg.includes("Consider stay/abuse of process only if disclosure failures persist after a clear chase trail")
                ? arg
                : arg.replace(/stay|abuse of process/gi, (match) => {
                    return match.toLowerCase() === "stay" ? "disclosure directions" : "procedural leverage";
                  })
            ) || angle.specificArguments,
          };
        }
        // Downgrade PACE breach angles if PACE is compliant
        if ((angle.angleType === "PACE_BREACH_EXCLUSION" || angle.angleType?.includes("PACE")) && 
            evidenceStrength.calibration.shouldDowngradePACE) {
          return {
            ...angle,
            winProbability: Math.max(20, Math.round((angle.winProbability || 60) * 0.3)),
          };
        }
        return angle;
      });
    } else if (evidenceStrength.overallStrength >= 60) {
      // Moderate-strong case - moderate downgrade
      if (analysis.recommendedStrategy) {
        analysis.recommendedStrategy.combinedProbability = Math.max(30, 
          Math.round((analysis.recommendedStrategy.combinedProbability || 70) * 0.6)
        );
      }
      if (analysis.overallWinProbability) {
        analysis.overallWinProbability = Math.max(30, 
          Math.round(analysis.overallWinProbability * 0.6)
        );
      }
    }

    // Add evidence strength warnings to analysis
    analysis.evidenceStrengthWarnings = evidenceStrength.warnings;
    analysis.evidenceStrength = evidenceStrength.overallStrength;
    analysis.realisticOutcome = evidenceStrength.calibration.realisticOutcome;

    if (!gate.show) {
      return NextResponse.json({
        ...analysis,
        probabilitiesSuppressed: true,
        suppressionReason: gate.reason,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
        overallWinProbability: null,
        recommendedStrategy: analysis?.recommendedStrategy
          ? { ...analysis.recommendedStrategy, combinedProbability: null }
          : analysis?.recommendedStrategy,
        criticalAngles: (analysis?.criticalAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
        allAngles: (analysis?.allAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
      });
    }

      return NextResponse.json({
        ...analysis,
        probabilitiesSuppressed: false,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });
    } catch (error) {
      console.error("Failed to generate aggressive defense analysis:", error);
      return NextResponse.json(
        { error: "Failed to generate aggressive defense analysis" },
        { status: 500 },
      );
    }
  });
}

