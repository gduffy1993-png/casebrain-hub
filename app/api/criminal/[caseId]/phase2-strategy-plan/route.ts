/**
 * GET /api/criminal/[caseId]/phase2-strategy-plan
 * 
 * Get Phase 2 directive strategy plan for a committed strategy.
 * Returns ordered steps, enabled tools, and locked tools.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generatePhase2StrategyPlan } from "@/lib/criminal/phase2-strategy-plan";
import { mergeCriminalDocs } from "@/lib/case-evidence/merge-criminal-docs";
import { buildCaseContext } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId } = authRes.context;

      // Get case's org_id directly from database (same pattern as aggressive-defense route)
      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json(
          { ok: false, error: "Case not found" },
          { status: 404 }
        );
      }

      // Get strategy commitment
      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .select(`
          id,
          case_id,
          title,
          primary_strategy,
          fallback_strategies,
          strategy_type,
          locked,
          status,
          priority,
          committed_at,
          committed_by,
          created_at
        `)
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (commitmentError || !commitment) {
        return NextResponse.json(
          { ok: false, error: "No strategy commitment found. Commit a strategy first." },
          { status: 404 }
        );
      }

      // Build case context to get evidence graph
      const context = await buildCaseContext(caseId, { userId });
      if (!context.case) {
        return NextResponse.json(
          { ok: false, error: "Case not found" },
          { status: 404 }
        );
      }

      // Build evidence graph
      const evidenceGraph = mergeCriminalDocs(context);

      // Generate Phase 2 strategy plan
      const plan = generatePhase2StrategyPlan(
        {
          primary: commitment.primary_strategy as "fight_charge" | "charge_reduction" | "outcome_management",
          secondary: (commitment.fallback_strategies || []) as Array<"fight_charge" | "charge_reduction" | "outcome_management">,
        },
        evidenceGraph
      );

      return NextResponse.json({
        ok: true,
        data: plan,
      });
    } catch (error) {
      console.error("Failed to generate Phase 2 strategy plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate Phase 2 strategy plan";
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

