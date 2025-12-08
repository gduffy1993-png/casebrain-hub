import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

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
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: strategies, error } = await supabase
      .from("defense_strategies")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("success_probability", { ascending: false });

    if (error) {
      console.error("[criminal/strategies] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch strategies" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      strategies: (strategies || []).map((s) => ({
        id: s.id,
        strategyName: s.strategy_name,
        strategyType: s.strategy_type,
        description: s.description,
        successProbability: s.success_probability,
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

