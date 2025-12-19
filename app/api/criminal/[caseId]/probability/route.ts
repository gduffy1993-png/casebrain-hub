import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/probability
 * Calculate "get off" probability based on loopholes and evidence
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
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

    // Determine risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    if (overall >= 70) {
      riskLevel = "LOW";
    } else if (overall >= 40) {
      riskLevel = "MEDIUM";
    } else if (overall >= 20) {
      riskLevel = "HIGH";
    } else {
      riskLevel = "CRITICAL";
    }

    return NextResponse.json({
      overall,
      topStrategy: topStrategy?.strategy_name ?? "Evidence Challenge",
      topStrategyProbability: topStrategy?.success_probability ?? 50,
      riskLevel,
      probabilitiesSuppressed: false,
      bundleCompleteness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
    });
  } catch (error) {
    console.error("[criminal/probability] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate probability" },
      { status: 500 },
    );
  }
}

