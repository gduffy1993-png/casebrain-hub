import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";
import { analyzeEvidenceStrength } from "@/lib/evidence-strength-analyzer";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/probability
 * Calculate "get off" probability based on loopholes and evidence
 * GATED: Returns banner + null data if canGenerateAnalysis is false
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });
    
    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          overall: null,
          topStrategy: null,
          topStrategyProbability: null,
          riskLevel: null,
          probabilitiesSuppressed: true,
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const supabase = getSupabaseAdminClient();

    const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
    const gate = shouldShowProbabilities({
      practiceArea: "criminal",
      completeness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
    });

    if (!gate.show) {
      return NextResponse.json({
        overall: null,
        topStrategy: "Disclosure-first actions only",
        topStrategyProbability: null,
        riskLevel: "MEDIUM",
        probabilitiesSuppressed: true,
        suppressionReason: gate.reason,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });
    }

    // Fetch criminal case
    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (criminalCase) {
      // Use stored probability if available
      return NextResponse.json({
        overall: criminalCase.get_off_probability ?? 50,
        topStrategy: criminalCase.recommended_strategy ?? "Evidence Challenge",
        topStrategyProbability: 70,
        riskLevel: criminalCase.risk_level ?? "MEDIUM",
        probabilitiesSuppressed: false,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });
    }

    // Calculate from loopholes and evidence if no stored data
    const { data: loopholes, error: loopholesError } = await supabase
      .from("criminal_loopholes")
      .select("severity, success_probability")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("success_probability", { ascending: false })
      .limit(1);

    const { data: strategies, error: strategiesError } = await supabase
      .from("defense_strategies")
      .select("strategy_name, success_probability")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("success_probability", { ascending: false })
      .limit(1);

    // Handle missing tables gracefully
    if (loopholesError && (loopholesError as any).code === "PGRST205") {
      console.warn("[criminal/probability] Table 'criminal_loopholes' not found, using empty array");
    }
    if (strategiesError && (strategiesError as any).code === "PGRST205") {
      console.warn("[criminal/probability] Table 'defense_strategies' not found, using empty array");
    }

    const topLoophole = loopholes?.[0];
    const topStrategy = strategies?.[0];

    // Calculate overall probability
    let overall = 50; // Default
    if (topLoophole) {
      overall = topLoophole.success_probability;
    } else if (topStrategy) {
      overall = topStrategy.success_probability;
    }

    // Get documents for evidence strength analysis
    const { data: documents } = await supabase
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

    // Get aggressive defense for evidence strength
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Analyze evidence strength for reality calibration
    const evidenceStrength = analyzeEvidenceStrength({
      documents: (documents || []) as any[],
      keyFacts: keyFacts?.analysis_json,
      aggressiveDefense: aggressiveDefense?.analysis_json,
      strategicOverview: null,
    });

    // Apply reality calibration to probabilities
    let calibratedOverall = overall;
    let calibratedTopStrategyProbability = topStrategy?.success_probability ?? 50;

    if (evidenceStrength.overallStrength >= 70) {
      // Strong prosecution case - downgrade probabilities
      calibratedOverall = Math.max(20, Math.round(overall * 0.4));
      calibratedTopStrategyProbability = Math.max(20, Math.round(calibratedTopStrategyProbability * 0.4));
    } else if (evidenceStrength.overallStrength >= 60) {
      // Moderate-strong case - moderate downgrade
      calibratedOverall = Math.max(30, Math.round(overall * 0.6));
      calibratedTopStrategyProbability = Math.max(30, Math.round(calibratedTopStrategyProbability * 0.6));
    }

    // Determine risk level based on calibrated probability
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    if (calibratedOverall >= 70) {
      riskLevel = "LOW";
    } else if (calibratedOverall >= 40) {
      riskLevel = "MEDIUM";
    } else if (calibratedOverall >= 20) {
      riskLevel = "HIGH";
    } else {
      riskLevel = "CRITICAL";
    }

    return NextResponse.json({
      overall: calibratedOverall,
      topStrategy: topStrategy?.strategy_name ?? "Evidence Challenge",
      topStrategyProbability: calibratedTopStrategyProbability,
      riskLevel,
      probabilitiesSuppressed: false,
      bundleCompleteness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
      evidenceStrengthWarnings: evidenceStrength.warnings.length > 0 ? evidenceStrength.warnings : undefined,
      evidenceStrength: evidenceStrength.overallStrength,
      realisticOutcome: evidenceStrength.calibration.realisticOutcome,
    });
  } catch (error) {
    console.error("[criminal/probability] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate probability" },
      { status: 500 },
    );
  }
}

