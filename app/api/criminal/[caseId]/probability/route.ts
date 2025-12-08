import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

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
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

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
      });
    }

    // Calculate from loopholes and evidence if no stored data
    const { data: loopholes } = await supabase
      .from("criminal_loopholes")
      .select("severity, success_probability")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("success_probability", { ascending: false })
      .limit(1);

    const { data: strategies } = await supabase
      .from("defense_strategies")
      .select("strategy_name, success_probability")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("success_probability", { ascending: false })
      .limit(1);

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
    });
  } catch (error) {
    console.error("[criminal/probability] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate probability" },
      { status: 500 },
    );
  }
}

