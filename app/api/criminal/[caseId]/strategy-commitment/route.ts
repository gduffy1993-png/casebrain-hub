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
  primary: "fight_charge" | "charge_reduction" | "outcome_management";
  secondary?: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
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
      
      if (!body.primary || !["fight_charge", "charge_reduction", "outcome_management"].includes(body.primary)) {
        return NextResponse.json(
          { ok: false, error: "Invalid primary strategy" },
          { status: 400 }
        );
      }

      // Validate secondary strategies
      const validStrategies = ["fight_charge", "charge_reduction", "outcome_management"];
      if (body.secondary) {
        for (const strategy of body.secondary) {
          if (!validStrategies.includes(strategy)) {
            return NextResponse.json(
              { ok: false, error: `Invalid secondary strategy: ${strategy}` },
              { status: 400 }
            );
          }
          if (strategy === body.primary) {
            return NextResponse.json(
              { ok: false, error: "Secondary strategy cannot be the same as primary" },
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

      // Upsert strategy commitment (update if exists, insert if not)
      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .upsert(
          {
            case_id: caseId,
            org_id: caseRow.org_id,
            primary_strategy: body.primary,
            fallback_strategies: body.secondary || [],
            committed_by: userId,
            committed_at: new Date().toISOString(),
          },
          {
            onConflict: "case_id",
          }
        )
        .select()
        .single();

      if (commitmentError) {
        console.error("Failed to commit strategy:", commitmentError);
        return NextResponse.json(
          { ok: false, error: "Failed to commit strategy" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          id: commitment.id,
          caseId: commitment.case_id,
          primary: commitment.primary_strategy,
          secondary: commitment.fallback_strategies || [],
          committedAt: commitment.committed_at,
          committedBy: commitment.committed_by,
        },
      });
    } catch (error) {
      console.error("Failed to commit strategy:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to commit strategy";
      return NextResponse.json(
        { ok: false, error: errorMessage },
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

      // Get commitment
      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .select("*")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .maybeSingle();

      if (commitmentError) {
        console.error("Failed to fetch strategy commitment:", commitmentError);
        return NextResponse.json({
          ok: true,
          data: null,
        });
      }

      if (!commitment) {
        return NextResponse.json({
          ok: true,
          data: null,
        });
      }

      return NextResponse.json({
        ok: true,
        data: {
          id: commitment.id,
          caseId: commitment.case_id,
          primary: commitment.primary_strategy,
          secondary: commitment.fallback_strategies || [],
          committedAt: commitment.committed_at,
          committedBy: commitment.committed_by,
        },
      });
    } catch (error) {
      console.error("Failed to fetch strategy commitment:", error);
      return NextResponse.json({
        ok: true,
        data: null,
      });
    }
  });
}

