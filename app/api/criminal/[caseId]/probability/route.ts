import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext } from "@/lib/case-context";
import { analyzeEvidenceStrength } from "@/lib/evidence-strength-analyzer";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";
import { calibrateProbability } from "@/lib/analysis/calibration";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/probability
 * Calculate "get off" probability based on loopholes and evidence
 * GATED: Returns banner + null data if canGenerateAnalysis is false
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { caseId } = await params;
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return makeNotFound<{
        overall: number | null;
        topStrategy: string | null;
        topStrategyProbability: number | null;
        riskLevel: string | null;
        probabilitiesSuppressed: boolean;
      }>(context, caseId);
    }

    // Check analysis gate (hard gating)
    const gateResult = checkAnalysisGate(context);
    if (!gateResult.ok) {
      return makeGateFail<{
        overall: number | null;
        topStrategy: string | null;
        topStrategyProbability: number | null;
        riskLevel: string | null;
        probabilitiesSuppressed: boolean;
      }>(
        {
          severity: gateResult.banner?.severity || "warning",
          title: gateResult.banner?.title || "Insufficient text extracted",
          detail: gateResult.banner?.detail,
        },
        context,
        caseId,
      );
    }

    const supabase = getSupabaseAdminClient();

    const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
    const gate = shouldShowProbabilities({
      practiceArea: "criminal",
      completeness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
    });

    if (!gate.show) {
      return makeOk(
        {
          overall: null,
          topStrategy: "Disclosure-first actions only",
          topStrategyProbability: null,
          riskLevel: "MEDIUM",
          probabilitiesSuppressed: true,
          suppressionReason: gate.reason,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
        },
        context,
        caseId,
      );
    }

    // Fetch criminal case
    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (criminalCase) {
      // Use stored probability if available (calibrate it)
      const storedOverall = criminalCase.get_off_probability ?? 50;
      const evidenceStrength = analyzeEvidenceStrength({
        documents: context.documents.map((doc) => ({
          raw_text: doc.raw_text,
          extracted_facts: doc.extracted_json,
          extracted_json: doc.extracted_json,
        })),
        keyFacts: null,
        aggressiveDefense: null,
        strategicOverview: null,
      });
      const calibratedOverall = calibrateProbability(storedOverall, evidenceStrength);
      const calibratedTopStrategy = calibrateProbability(70, evidenceStrength);

      return makeOk(
        {
          overall: calibratedOverall,
          topStrategy: criminalCase.recommended_strategy ?? "Evidence Challenge",
          topStrategyProbability: calibratedTopStrategy,
          riskLevel: criminalCase.risk_level ?? "MEDIUM",
          probabilitiesSuppressed: false,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          evidenceStrengthWarnings: evidenceStrength.warnings.length > 0 ? evidenceStrength.warnings : undefined,
          evidenceStrength: evidenceStrength.overallStrength,
          realisticOutcome: evidenceStrength.calibration.realisticOutcome,
        },
        context,
        caseId,
      );
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

    // Use buildCaseContext documents (same source as everything else - "One Brain")
    // Note: context is already built at the top of the function
    const documentsForAnalysis = context.documents.map((doc) => ({
      raw_text: doc.raw_text,
      extracted_facts: doc.extracted_json,
      extracted_json: doc.extracted_json,
    }));

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
      documents: documentsForAnalysis,
      keyFacts: keyFacts?.analysis_json,
      aggressiveDefense: aggressiveDefense?.analysis_json,
      strategicOverview: null,
    });

    // Apply reality calibration to probabilities (using single calibration function)
    const calibratedOverall = calibrateProbability(overall, evidenceStrength);
    const calibratedTopStrategyProbability = calibrateProbability(
      topStrategy?.success_probability ?? 50,
      evidenceStrength,
    );

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

    return makeOk(
      {
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
      },
      context,
      caseId,
    );
  } catch (error) {
    console.error("[criminal/probability] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to calculate probability";
    try {
      const authRes = await requireAuthContextApi();
      if (authRes.ok) {
        const { userId } = authRes.context;
        const context = await buildCaseContext(caseId, { userId });
        return makeError<{
          overall: number | null;
          topStrategy: string | null;
          topStrategyProbability: number | null;
          riskLevel: string | null;
          probabilitiesSuppressed: boolean;
        }>("PROBABILITY_ERROR", errorMessage, context, caseId);
      }
    } catch {
      // Fallback
    }
    return makeError<{
      overall: number | null;
      topStrategy: string | null;
      topStrategyProbability: number | null;
      riskLevel: string | null;
      probabilitiesSuppressed: boolean;
    }>(
      "PROBABILITY_ERROR",
      errorMessage,
      {
        case: null,
        orgScope: { orgIdResolved: "", method: "solo_fallback" },
        documents: [],
        diagnostics: {
          docCount: 0,
          rawCharsTotal: 0,
          jsonCharsTotal: 0,
          avgRawCharsPerDoc: 0,
          suspectedScanned: false,
          reasonCodes: [],
        },
        canGenerateAnalysis: false,
      },
      caseId,
    );
  }
}

