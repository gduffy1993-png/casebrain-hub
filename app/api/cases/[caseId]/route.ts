/**
 * GET /api/cases/[caseId]
 * 
 * Returns basic case information (org-scoped).
 * Used by upload form and other components that need minimal case metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    // Get case with org verification
    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, title, practice_area, org_id")
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

    return NextResponse.json({
      ok: true,
      case: {
        id: caseRow.id,
        title: caseRow.title,
        practice_area: caseRow.practice_area,
      },
    });
  } catch (error) {
    console.error("[cases/[caseId]] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

