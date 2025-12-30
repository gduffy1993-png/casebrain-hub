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

      // Generate title from primary strategy
      const strategyTitles: Record<string, string> = {
        fight_charge: "Fight Charge (Full Trial Strategy)",
        charge_reduction: "Charge Reduction (s18 → s20)",
        outcome_management: "Outcome Management (Plea/Mitigation)",
      };
      const title = strategyTitles[body.primary] || `Primary Strategy: ${body.primary}`;

      // Upsert strategy commitment (update if exists, insert if not)
      // Use dedicated columns if they exist (from migrations), otherwise use details JSON
      const commitmentData: any = {
        case_id: caseId,
        org_id: caseRow.org_id,
        title: title,
        status: "in_progress",
        priority: "high",
        created_by: userId,
        committed_at: new Date().toISOString(),
        // Try dedicated columns first (if migrations added them)
        primary_strategy: body.primary,
        fallback_strategies: body.secondary || [],
        locked: true,
        strategy_type: "criminal_defense",
        // Also set details JSON as backup (works even if columns exist)
        details: JSON.stringify({
          primary_strategy: body.primary,
          fallback_strategies: body.secondary || [],
        }),
      };

      const { data: commitment, error: commitmentError } = await supabase
        .from("case_strategy_commitments")
        .upsert(commitmentData, {
          onConflict: "case_id",
        })
        .select(`
          id,
          case_id,
          org_id,
          title,
          details,
          status,
          priority,
          committed_at,
          created_by,
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
          // If details is not JSON, use body values
          primary_strategy = body.primary;
          fallback_strategies = body.secondary || [];
        }
      }

      return NextResponse.json({
        ok: true,
        data: {
          id: commitment.id,
          caseId: commitment.case_id,
          // Return database fields directly
          primary_strategy: primary_strategy,
          fallback_strategies: fallback_strategies,
          status: commitment.status,
          priority: commitment.priority,
          title: commitment.title,
          committed_at: commitment.committed_at || commitment.created_at,
          created_at: commitment.created_at,
          // Also include mapped fields for backward compatibility
          primary: primary_strategy,
          secondary: fallback_strategies,
          committedAt: commitment.committed_at || commitment.created_at,
          committedBy: commitment.created_by,
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

      // Get commitment - select most recent row by created_at DESC LIMIT 1
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
          data: null, // No commitment found - this is valid
        });
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

      // If still no primary_strategy found, return null (invalid commitment)
      if (!primary_strategy) {
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
          // Return database fields directly
          primary_strategy: primary_strategy,
          fallback_strategies: fallback_strategies,
          status: commitment.status,
          priority: commitment.priority,
          title: commitment.title,
          committed_at: commitment.committed_at || commitment.created_at,
          created_at: commitment.created_at,
          // Also include mapped fields for backward compatibility
          primary: primary_strategy,
          secondary: fallback_strategies,
          committedAt: commitment.committed_at || commitment.created_at,
          committedBy: commitment.created_by,
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

