import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/strategies
 * Fetch defense strategies
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

    const { data: strategies, error } = await supabase
      .from("defense_strategies")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("success_probability", { ascending: false });

    // Handle missing table gracefully (table may not exist yet)
    if (error) {
      const errorCode = (error as any).code;
      if (errorCode === "PGRST205" || error?.message?.includes("Could not find the table")) {
        console.warn("[criminal/strategies] Table 'defense_strategies' not found, returning empty array");
        return NextResponse.json({
          probabilitiesSuppressed: !gate.show,
          suppressionReason: gate.show ? null : gate.reason,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          strategies: [],
        });
      }
      console.error("[criminal/strategies] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch strategies" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      probabilitiesSuppressed: !gate.show,
      suppressionReason: gate.show ? null : gate.reason,
      bundleCompleteness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
      strategies: (strategies || []).map((s) => ({
        id: s.id,
        strategyName: s.strategy_name,
        strategyType: s.strategy_type,
        description: s.description,
        successProbability: gate.show ? s.success_probability : null,
        impact: s.impact,
        legalArgument: s.legal_argument,
        actionsRequired: s.actions_required || [],
        selected: s.selected ?? false,
      })),
    });
  } catch (error) {
    console.error("[criminal/strategies] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategies" },
      { status: 500 },
    );
  }
}

