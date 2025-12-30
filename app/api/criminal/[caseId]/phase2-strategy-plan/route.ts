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
import { checkAnalysisGate } from "@/lib/analysis/text-gate";

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

      // Check analysis gate first - if gated, return error (safety)
      const context = await buildCaseContext(caseId, { userId });
      if (!context.case) {
        return NextResponse.json(
          { ok: false, error: "Case not found" },
          { status: 404 }
        );
      }

      const gateResult = checkAnalysisGate(context);
      if (!gateResult.ok) {
        return NextResponse.json(
          { 
            ok: false, 
            error: "Analysis gated - insufficient text extracted",
            details: gateResult.banner?.detail || "Upload more documents to enable Phase 2 planning",
          },
          { status: 400 }
        );
      }

      // Get strategy commitment - try dedicated columns first, fall back to details JSON
      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .select(`
          id,
          case_id,
          org_id,
          title,
          details,
          primary_strategy,
          fallback_strategies,
          strategy_type,
          locked,
          status,
          priority,
          committed_at,
          created_by,
          created_at
        `)
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (commitmentError) {
        console.error("Failed to fetch strategy commitment:", commitmentError);
        return NextResponse.json(
          { 
            ok: false, 
            error: "Failed to fetch strategy commitment",
            details: commitmentError.message || String(commitmentError),
          },
          { status: 500 }
        );
      }

      if (!commitment) {
        return NextResponse.json(
          { ok: false, error: "No strategy commitment found. Commit a strategy first." },
          { status: 404 }
        );
      }

      // Extract primary_strategy and fallback_strategies
      // Try dedicated columns first, then fall back to details JSON
      let primary_strategy: string | null = null;
      let fallback_strategies: string[] = [];
      
      // Try dedicated columns first (if they exist from later migrations)
      if ((commitment as any).primary_strategy) {
        primary_strategy = (commitment as any).primary_strategy;
        fallback_strategies = (commitment as any).fallback_strategies || [];
        // Handle JSONB array
        if (Array.isArray(fallback_strategies)) {
          fallback_strategies = fallback_strategies;
        } else if (typeof fallback_strategies === "string") {
          try {
            fallback_strategies = JSON.parse(fallback_strategies);
          } catch {
            fallback_strategies = [];
          }
        }
      } else {
        // Fall back to details JSON
        try {
          if (commitment.details && typeof commitment.details === "string") {
            const parsed = JSON.parse(commitment.details);
            primary_strategy = parsed.primary_strategy || null;
            fallback_strategies = parsed.fallback_strategies || [];
          }
        } catch {
          // If details is not JSON or missing, try to infer from title
          const titleLower = (commitment.title || "").toLowerCase();
          if (titleLower.includes("fight charge")) {
            primary_strategy = "fight_charge";
          } else if (titleLower.includes("charge reduction") || titleLower.includes("s18") || titleLower.includes("s20")) {
            primary_strategy = "charge_reduction";
          } else if (titleLower.includes("outcome") || titleLower.includes("plea") || titleLower.includes("mitigation")) {
            primary_strategy = "outcome_management";
          }
        }
      }

      if (!primary_strategy) {
        return NextResponse.json(
          { ok: false, error: "Invalid strategy commitment - missing primary strategy" },
          { status: 400 }
        );
      }

      // Build evidence graph (context already built above)
      const evidenceGraph = mergeCriminalDocs(context);

      // Generate Phase 2 strategy plan
      const plan = generatePhase2StrategyPlan(
        {
          primary: primary_strategy as "fight_charge" | "charge_reduction" | "outcome_management",
          secondary: fallback_strategies as Array<"fight_charge" | "charge_reduction" | "outcome_management">,
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

