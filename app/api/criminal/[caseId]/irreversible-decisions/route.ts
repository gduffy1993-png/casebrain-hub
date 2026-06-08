/**
 * GET/POST /api/criminal/[caseId]/irreversible-decisions
 * 
 * Manage irreversible decision warnings for a criminal case.
 * Solicitor-controlled checklist of actions that narrow options.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type IrreversibleDecisionItem = {
  id: string;
  label: string;
  status: "not_yet" | "planned" | "completed";
  note?: string;
  updated_at?: string;
  updated_by?: string;
};

type IrreversibleDecisionsRequest = {
  decisions: IrreversibleDecisionItem[];
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      const supabase = getSupabaseAdminClient();
      
      // Get case's org_id
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Get criminal case record
      const { data: criminalCase, error: criminalError } = await supabase
        .from("criminal_cases")
        .select("irreversible_decisions")
        .eq("id", caseId)
        .eq("org_id", caseRow.org_id)
        .maybeSingle();

      if (criminalError) {
        console.error("Failed to fetch irreversible decisions:", criminalError);
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch irreversible decisions",
          details: criminalError.message,
        }, { status: 500 });
      }

      // Return decisions array (default to empty array)
      const decisions = (criminalCase?.irreversible_decisions as IrreversibleDecisionItem[]) || [];

      return NextResponse.json({
        ok: true,
        data: {
          decisions,
        },
      });
    } catch (error) {
      console.error("Failed to fetch irreversible decisions:", error);
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      const body: IrreversibleDecisionsRequest = await request.json();

      // Validate decisions array
      if (!Array.isArray(body.decisions)) {
        return NextResponse.json({
          ok: false,
          error: "decisions must be an array",
        }, { status: 400 });
      }

      // Validate each decision item
      const validStatuses = ["not_yet", "planned", "completed"];
      for (const decision of body.decisions) {
        if (!decision.id || !decision.label || !decision.status) {
          return NextResponse.json({
            ok: false,
            error: "Each decision must have id, label, and status",
          }, { status: 400 });
        }
        if (!validStatuses.includes(decision.status)) {
          return NextResponse.json({
            ok: false,
            error: `Invalid status: ${decision.status}. Must be one of: ${validStatuses.join(", ")}`,
          }, { status: 400 });
        }
      }

      const supabase = getSupabaseAdminClient();
      
      // Get case's org_id
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Add timestamps and user info to each decision
      const now = new Date().toISOString();
      const decisionsWithMetadata: IrreversibleDecisionItem[] = body.decisions.map(dec => ({
        ...dec,
        updated_at: now,
        updated_by: userId,
      }));

      // Update or insert criminal case record
      const { data: existingCriminalCase } = await supabase
        .from("criminal_cases")
        .select("id")
        .eq("id", caseId)
        .eq("org_id", caseRow.org_id)
        .maybeSingle();

      if (existingCriminalCase) {
        // Update existing record
        const { data: updated, error: updateError } = await supabase
          .from("criminal_cases")
          .update({
            irreversible_decisions: decisionsWithMetadata,
            updated_at: now,
          })
          .eq("id", caseId)
          .eq("org_id", caseRow.org_id)
          .select("irreversible_decisions")
          .single();

        if (updateError) {
          console.error("Failed to update irreversible decisions:", updateError);
          return NextResponse.json({
            ok: false,
            error: "Failed to update irreversible decisions",
            details: updateError.message,
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          data: {
            decisions: updated.irreversible_decisions || [],
          },
        });
      } else {
        // Insert new record
        const { data: inserted, error: insertError } = await supabase
          .from("criminal_cases")
          .insert({
            id: caseId,
            org_id: caseRow.org_id,
            irreversible_decisions: decisionsWithMetadata,
          })
          .select("irreversible_decisions")
          .single();

        if (insertError) {
          console.error("Failed to insert irreversible decisions:", insertError);
          return NextResponse.json({
            ok: false,
            error: "Failed to save irreversible decisions",
            details: insertError.message,
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          data: {
            decisions: inserted.irreversible_decisions || [],
          },
        });
      }
    } catch (error) {
      console.error("Failed to save irreversible decisions:", error);
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  });
}
