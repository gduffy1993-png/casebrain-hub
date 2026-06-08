/**
 * GET /api/criminal/[caseId]/disclosure-chasers
 * POST /api/criminal/[caseId]/disclosure-chasers
 * PATCH /api/criminal/[caseId]/disclosure-chasers
 * 
 * Manage disclosure chasers for a criminal case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type DisclosureChaser = {
  id: string;
  case_id: string;
  org_id: string;
  item: string;
  status: "requested" | "chased" | "received" | "overdue";
  requested_at: string;
  chased_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * GET - Fetch all disclosure chasers for a case
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const supabase = getSupabaseAdminClient();

    // Verify case exists and belongs to org
    const { data: caseRow } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRow) {
      return NextResponse.json(
        { ok: false, error: "Case not found" },
        { status: 404 }
      );
    }

    // Fetch disclosure chasers
    const { data: chasers, error } = await supabase
      .from("case_disclosure_chasers")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("[disclosure-chasers] Error fetching:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch disclosure chasers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: chasers || [],
    });
  } catch (error) {
    console.error("[disclosure-chasers] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new disclosure chaser
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const body = await request.json();
    const { item, notes } = body;

    if (!item || typeof item !== "string" || item.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "item is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Verify case exists and belongs to org
    const { data: caseRow } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRow) {
      return NextResponse.json(
        { ok: false, error: "Case not found" },
        { status: 404 }
      );
    }

    // Create disclosure chaser
    const { data: chaser, error } = await supabase
      .from("case_disclosure_chasers")
      .insert({
        case_id: caseId,
        org_id: orgId,
        item: item.trim(),
        status: "requested",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[disclosure-chasers] Error creating:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to create disclosure chaser" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: chaser,
    });
  } catch (error) {
    console.error("[disclosure-chasers] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a disclosure chaser (mark as chased, received, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (status && !["requested", "chased", "received", "overdue"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Verify case exists and belongs to org
    const { data: caseRow } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRow) {
      return NextResponse.json(
        { ok: false, error: "Case not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      // Set chased_at or received_at based on status
      if (status === "chased") {
        updateData.chased_at = new Date().toISOString();
      } else if (status === "received") {
        updateData.received_at = new Date().toISOString();
      }
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update disclosure chaser
    const { data: chaser, error } = await supabase
      .from("case_disclosure_chasers")
      .update(updateData)
      .eq("id", id)
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) {
      console.error("[disclosure-chasers] Error updating:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to update disclosure chaser" },
        { status: 500 }
      );
    }

    if (!chaser) {
      return NextResponse.json(
        { ok: false, error: "Disclosure chaser not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: chaser,
    });
  } catch (error) {
    console.error("[disclosure-chasers] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

