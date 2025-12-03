import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildClientUpdate } from "@/lib/client-update";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/client-update - Get latest client update preview
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;
    const supabase = getSupabaseAdminClient();

    // Verify case belongs to org
    const { data: caseData, error } = await supabase
      .from("cases")
      .select("id, client_update_last_generated_at, client_update_preview")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (error || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({
      lastGeneratedAt: caseData.client_update_last_generated_at,
      preview: caseData.client_update_preview,
    });
  } catch (error) {
    console.error("Failed to get client update:", error);
    return NextResponse.json(
      { error: "Failed to get client update" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/client-update - Generate new client update
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;
    const supabase = getSupabaseAdminClient();

    // Verify case belongs to org
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Generate the update
    const update = await buildClientUpdate(caseId, orgId);

    // Persist the preview
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        client_update_last_generated_at: update.generatedAt,
        client_update_preview: update.body,
      })
      .eq("id", caseId);

    if (updateError) {
      console.error("Failed to save client update:", updateError);
      // Still return the update even if save fails
    }

    return NextResponse.json({ update });
  } catch (error) {
    console.error("Failed to generate client update:", error);
    return NextResponse.json(
      { error: "Failed to generate client update" },
      { status: 500 },
    );
  }
}

