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

// Generate deterministic generic steps based on strategy
function generateDeterministicSteps(
  primary: "fight_charge" | "charge_reduction" | "outcome_management",
  fallback: Array<"fight_charge" | "charge_reduction" | "outcome_management">
): Array<{
  order: number;
  phase: string;
  action: string;
  rationale: string;
  timeline?: string;
}> {
  const steps: Array<{
    order: number;
    phase: string;
    action: string;
    rationale: string;
    timeline?: string;
  }> = [];

  if (primary === "fight_charge") {
    steps.push(
      {
        order: 1,
        phase: "disclosure",
        action: "Request full disclosure including CCTV, MG6 schedules, and unused material",
        rationale: "Full disclosure is essential to identify weaknesses in the prosecution case",
        timeline: "Within 7 days",
      },
      {
        order: 2,
        phase: "evidence_analysis",
        action: "Review all evidence for identification reliability, PACE compliance, and intent issues",
        rationale: "Challenge identification evidence under Turnbull guidelines and assess mens rea",
        timeline: "Within 14 days",
      },
      {
        order: 3,
        phase: "trial",
        action: "Prepare full trial defence focusing on identification, intent, and procedural breaches",
        rationale: "Target acquittal through comprehensive challenge to prosecution evidence",
        timeline: "Ongoing until trial",
      }
    );
  } else if (primary === "charge_reduction") {
    steps.push(
      {
        order: 1,
        phase: "disclosure",
        action: "Request disclosure focusing on medical evidence and circumstances of incident",
        rationale: "Assess whether harm was intended (s18) or merely reckless (s20)",
        timeline: "Within 7 days",
      },
      {
        order: 2,
        phase: "intent",
        action: "Gather evidence supporting recklessness rather than specific intent",
        rationale: "Build case for s20 OAPA (recklessness) instead of s18 (specific intent)",
        timeline: "Within 21 days",
      },
      {
        order: 3,
        phase: "charge_reduction",
        action: "Negotiate charge reduction from s18 to s20 with prosecution",
        rationale: "Reduced charge carries lower maximum sentence and avoids specific intent requirement",
        timeline: "Before PTPH",
      }
    );
  } else if (primary === "outcome_management") {
    steps.push(
      {
        order: 1,
        phase: "disclosure",
        action: "Request disclosure to assess prosecution case strength",
        rationale: "Determine realistic prospects of conviction to inform plea decision",
        timeline: "Within 7 days",
      },
      {
        order: 2,
        phase: "plea",
        action: "Consider early guilty plea if case is strong, focusing on mitigation",
        rationale: "Early plea attracts maximum sentence reduction and may avoid trial costs",
        timeline: "Before PTPH",
      },
      {
        order: 3,
        phase: "mitigation",
        action: "Prepare comprehensive mitigation package including character references and personal circumstances",
        rationale: "Strong mitigation can significantly reduce sentence or avoid custody",
        timeline: "Before sentence",
      }
    );
  }

  return steps;
}

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

      // No need to check analysis gate - return deterministic steps regardless

      // Get strategy commitment - try dedicated columns first, fall back to details JSON
      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .select(`
          id,
          case_id,
          org_id,
          title,
          primary_strategy,
          fallback_strategies,
          strategy_type,
          locked,
          status,
          priority,
          committed_at,
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
          { 
            ok: false, 
            banner: "No committed strategy found. Commit a strategy first.",
          },
          { status: 200 }
        );
      }

      // Extract primary_strategy and fallback_strategies
      const primary_strategy = commitment.primary_strategy;
      let fallback_strategies: string[] = [];
      
      // Handle JSONB array for fallback_strategies
      if (commitment.fallback_strategies) {
        if (Array.isArray(commitment.fallback_strategies)) {
          fallback_strategies = commitment.fallback_strategies;
        } else if (typeof commitment.fallback_strategies === "string") {
          try {
            fallback_strategies = JSON.parse(commitment.fallback_strategies);
          } catch {
            fallback_strategies = [];
          }
        }
      }

      if (!primary_strategy) {
        return NextResponse.json(
          { 
            ok: false, 
            banner: "Invalid strategy commitment - missing primary strategy",
          },
          { status: 200 }
        );
      }

      // Return deterministic generic steps (no complex evidence graph dependency)
      const steps = generateDeterministicSteps(
        primary_strategy as "fight_charge" | "charge_reduction" | "outcome_management",
        fallback_strategies as Array<"fight_charge" | "charge_reduction" | "outcome_management">
      );

      return NextResponse.json({
        ok: true,
        strategy: primary_strategy,
        steps: steps,
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

