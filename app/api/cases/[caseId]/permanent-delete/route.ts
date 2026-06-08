import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { permanentlyDeleteCaseData } from "@/lib/cases/permanently-delete-case-data";

type RouteParams = {
  params: { caseId: string };
};

/**
 * DELETE /api/cases/[caseId]/permanent-delete - Permanently delete an archived case
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        { error: "Case must be archived before permanent deletion. Archive the case first." },
        { status: 400 },
      );
    }

    await permanentlyDeleteCaseData(supabase, caseId);

    // Log the permanent deletion
    await supabase.from("audit_log").insert({
      org_id: orgId,
      actor_id: userId,
      action: "case_permanently_deleted",
      resource_type: "case",
      resource_id: caseId,
      metadata: { 
        title: caseRecord.title,
        deleted_permanently: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to permanently delete case:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete case" },
      { status: 500 },
    );
  }
}

