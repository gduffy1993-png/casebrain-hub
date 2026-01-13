/**
 * POST /api/criminal/[caseId]/position
 * GET /api/criminal/[caseId]/position
 * 
 * Record and retrieve defence positions for a criminal case.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type PositionRequest = {
  position_text: string;
  phase?: number;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Parse request body
    const body: PositionRequest = await request.json();

    // Validate required fields
    if (!body.position_text || typeof body.position_text !== "string" || !body.position_text.trim()) {
      return NextResponse.json(
        { ok: false, error: "position_text is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate max length (20k characters)
    const trimmedText = body.position_text.trim();
    if (trimmedText.length > 20000) {
      return NextResponse.json(
        { ok: false, error: "position_text exceeds maximum length of 20,000 characters" },
        { status: 400 }
      );
    }

    // Validate phase if provided
    const phase = body.phase !== undefined ? Number(body.phase) : 1;
    if (!Number.isInteger(phase) || phase < 1 || phase > 3) {
      return NextResponse.json(
        { ok: false, error: "phase must be an integer between 1 and 3" },
        { status: 400 }
      );
    }

    // Get case's org_id to verify ownership
    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("org_id")
      .eq("id", caseId)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json(
        { ok: false, error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify org_id matches (case must belong to user's org)
    if (caseRow.org_id !== orgId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Case does not belong to your organisation" },
        { status: 403 }
      );
    }

    // Insert position
    const { data: position, error: insertError } = await supabase
      .from("case_positions")
      .insert({
        org_id: orgId,
        case_id: caseId,
        user_id: userId,
        phase: phase,
        position_text: trimmedText,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[position] Failed to insert position:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to save position", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      position: position,
    });
  } catch (error) {
    console.error("[position] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    // Get case's org_id to verify ownership
    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("org_id")
      .eq("id", caseId)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json(
        { ok: false, error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify org_id matches
    if (caseRow.org_id !== orgId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Case does not belong to your organisation" },
        { status: 403 }
      );
    }

    // Get latest position
    const { data: position, error: fetchError } = await supabase
      .from("case_positions")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[position] Failed to fetch position:", fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch position", details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      position: position || null,
    });
  } catch (error) {
    console.error("[position] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

