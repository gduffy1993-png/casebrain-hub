/**
 * POST /api/criminal/[caseId]/strategy-commitment
 * 
 * Commit a strategy for a criminal case.
 * This locks in the primary strategy and enables Phase 2 directive planning.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type StrategyCommitmentRequest = {
  primary?: "fight_charge" | "charge_reduction" | "outcome_management";
  primary_strategy?: "fight_charge" | "charge_reduction" | "outcome_management";
  primaryStrategy?: "fight_charge" | "charge_reduction" | "outcome_management";
  secondary?: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
  fallback_strategies?: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
  fallbackStrategies?: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
  fallback?: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
  strategy_type?: "fight_charge" | "charge_reduction" | "outcome_management";
  strategyType?: "fight_charge" | "charge_reduction" | "outcome_management";
  type?: "fight_charge" | "charge_reduction" | "outcome_management";
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      // Parse request body
      const body: StrategyCommitmentRequest = await request.json();
      
      // Parse body and compute values with fallback to multiple key formats
      const primary_strategy = body.primary_strategy ?? body.primaryStrategy ?? body.primary ?? null;
      const fallback_strategies_input = body.fallback_strategies ?? body.fallbackStrategies ?? body.fallback ?? body.secondary ?? [];
      const strategy_type = body.strategy_type ?? body.strategyType ?? body.type ?? null;

      // Validate: primary_strategy must not be null
      if (!primary_strategy) {
        return NextResponse.json(
          { ok: false, error: "Missing primary_strategy" },
          { status: 400 }
        );
      }

      // Validate: strategy_type must not be null
      if (!strategy_type) {
        return NextResponse.json(
          { ok: false, error: "Missing strategy_type" },
          { status: 400 }
        );
      }

      // Validate: allow only fight_charge | charge_reduction | outcome_management
      const validStrategyTypes = ["fight_charge", "charge_reduction", "outcome_management"];
      
      if (!validStrategyTypes.includes(primary_strategy)) {
        return NextResponse.json(
          { ok: false, error: `Invalid primary_strategy: ${primary_strategy}. Must be one of: ${validStrategyTypes.join(", ")}` },
          { status: 400 }
        );
      }

      if (!validStrategyTypes.includes(strategy_type)) {
        return NextResponse.json(
          { ok: false, error: "Invalid strategy_type", got: strategy_type },
          { status: 400 }
        );
      }

      // Validate fallback_strategies_input
      if (Array.isArray(fallback_strategies_input)) {
        for (const strategy of fallback_strategies_input) {
          if (!validStrategyTypes.includes(strategy)) {
            return NextResponse.json(
              { ok: false, error: `Invalid fallback strategy: ${strategy}. Must be one of: ${validStrategyTypes.join(", ")}` },
              { status: 400 }
            );
          }
          if (strategy === primary_strategy) {
            return NextResponse.json(
              { ok: false, error: "Fallback strategy cannot be the same as primary strategy" },
              { status: 400 }
            );
          }
        }
      }

      // Get case's org_id directly from database (same pattern as aggressive-defense route)
      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow) {
        console.error("[strategy-commitment POST] Case lookup failed:", {
          caseId,
          error: caseError ? { message: caseError.message, code: caseError.code, details: caseError.details } : null,
        });
        return NextResponse.json(
          { ok: false, error: "Case not found" },
          { status: 404 }
        );
      }

      // Validate case has org_id and it's a UUID
      if (!caseRow.org_id) {
        return NextResponse.json(
          { ok: false, error: "Case has no org_id" },
          { status: 500 }
        );
      }

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(caseRow.org_id)) {
        return NextResponse.json(
          { ok: false, error: "Invalid case org_id format" },
          { status: 500 }
        );
      }

      // Generate title from primary strategy
      const strategyTitles: Record<string, string> = {
        fight_charge: "Fight Charge (Full Trial Strategy)",
        charge_reduction: "Charge Reduction (s18 → s20)",
        outcome_management: "Outcome Management (Plea/Mitigation)",
      };
      const title = strategyTitles[primary_strategy] || `Primary Strategy: ${primary_strategy}`;

      // Insert payload - only include required fields
      const insertPayload = {
        case_id: caseId,
        org_id: caseRow.org_id,
        title: title,
        primary_strategy: primary_strategy,
        fallback_strategies: fallback_strategies_input,
        strategy_type: strategy_type,
        committed_at: new Date().toISOString(),
      };

      // Add a single console.log just before insert
      console.log("[strategy-commitment] inserting", JSON.stringify(insertPayload, null, 2));

      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .insert(insertPayload)
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
        .single();

      if (commitmentError) {
        console.error("Failed to commit strategy:", commitmentError);
        return NextResponse.json(
          { 
            ok: false, 
            error: "Failed to commit strategy",
            details: commitmentError.message || String(commitmentError),
          },
          { status: 500 }
        );
      }

      if (!commitment) {
        return NextResponse.json(
          { 
            ok: false, 
            error: "Commitment not returned after insert",
            details: "Database insert succeeded but no row returned",
          },
          { status: 500 }
        );
      }

      // Handle JSONB array for fallback_strategies
      let fallback_strategies: string[] = [];
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

      return NextResponse.json({
        ok: true,
        data: {
          id: commitment.id,
          caseId: commitment.case_id,
          primary_strategy: commitment.primary_strategy,
          fallback_strategies: fallback_strategies,
          strategy_type: commitment.strategy_type,
          locked: commitment.locked,
          status: commitment.status,
          priority: commitment.priority,
          title: commitment.title,
          committed_at: commitment.committed_at,
          created_at: commitment.created_at,
          // Also include mapped fields for backward compatibility
          primary: commitment.primary_strategy,
          secondary: fallback_strategies,
          committedAt: commitment.committed_at,
        },
      });
    } catch (error) {
      console.error("[strategy-commitment POST] Unexpected error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage = error instanceof Error ? error.message : "Failed to commit strategy";
      const errorDetails = error instanceof Error ? (error.stack || error.message) : String(error);
      return NextResponse.json(
        { 
          ok: false, 
          error: errorMessage,
          details: errorDetails,
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/criminal/[caseId]/strategy-commitment
 * 
 * Get the current strategy commitment for a case.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      // Get case's org_id directly from database
      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: true,
          data: null, // No commitment found
        });
      }

      // Get commitment - select most recent row by created_at DESC LIMIT 1
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
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch strategy commitment",
          details: commitmentError.message || String(commitmentError),
          data: null,
        }, { status: 500 });
      }

      if (!commitment) {
        return NextResponse.json({
          ok: true,
          data: null, // No commitment found - this is valid (200 status)
        });
      }

      // Handle JSONB array for fallback_strategies
      let fallback_strategies: string[] = [];
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

      return NextResponse.json({
        ok: true,
        data: {
          id: commitment.id,
          caseId: commitment.case_id,
          primary_strategy: commitment.primary_strategy,
          fallback_strategies: fallback_strategies,
          strategy_type: commitment.strategy_type,
          locked: commitment.locked,
          status: commitment.status,
          priority: commitment.priority,
          title: commitment.title,
          committed_at: commitment.committed_at,
          created_at: commitment.created_at,
          // Also include mapped fields for backward compatibility
          primary: commitment.primary_strategy,
          secondary: fallback_strategies,
          committedAt: commitment.committed_at,
        },
      });
    } catch (error) {
      console.error("[strategy-commitment GET] Unexpected error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json({
        ok: true,
        data: null,
      }, { status: 200 });
    }
  });
}

