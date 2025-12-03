import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: { caseId: string };
};

/**
 * POST /api/cases/[caseId]/restore - Restore an archived case
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;
    const supabase = getSupabaseAdminClient();

    // Verify case belongs to org and is archived
    const { data: caseRecord, error: fetchError } = await supabase
      .from("cases")
      .select("id, title, is_archived")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (fetchError || !caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (!caseRecord.is_archived) {
      return NextResponse.json(
        { error: "Case is not archived" },
        { status: 400 },
      );
    }

    // Restore the case
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        is_archived: false,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await supabase.from("audit_log").insert({
      org_id: orgId,
      actor_id: userId,
      action: "case_restored",
      resource_type: "case",
      resource_id: caseId,
      metadata: { title: caseRecord.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to restore case:", error);
    return NextResponse.json(
      { error: "Failed to restore case" },
      { status: 500 },
    );
  }
}

