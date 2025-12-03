import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

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

    // Delete related records first (cascade doesn't always work perfectly)
    // Delete in order of dependencies
    
    // Delete letters
    await supabase.from("letters").delete().eq("case_id", caseId);
    
    // Delete documents
    await supabase.from("documents").delete().eq("case_id", caseId);
    
    // Delete tasks
    await supabase.from("tasks").delete().eq("case_id", caseId);
    
    // Delete risk flags
    await supabase.from("risk_flags").delete().eq("case_id", caseId);
    
    // Delete deadlines
    await supabase.from("deadlines").delete().eq("case_id", caseId);
    
    // Delete case notes
    await supabase.from("case_notes").delete().eq("case_id", caseId);
    
    // Delete PI-specific data if exists
    await supabase.from("pi_cases").delete().eq("id", caseId);
    await supabase.from("pi_medical_reports").delete().eq("case_id", caseId);
    await supabase.from("pi_offers").delete().eq("case_id", caseId);
    await supabase.from("pi_hearings").delete().eq("case_id", caseId);
    await supabase.from("pi_disbursements").delete().eq("case_id", caseId);
    
    // Delete Housing-specific data if exists
    await supabase.from("housing_cases").delete().eq("id", caseId);
    await supabase.from("housing_defects").delete().eq("case_id", caseId);
    await supabase.from("housing_timeline").delete().eq("case_id", caseId);
    await supabase.from("housing_landlord_responses").delete().eq("case_id", caseId);

    // Finally, delete the case itself
    const { error: deleteError } = await supabase
      .from("cases")
      .delete()
      .eq("id", caseId);

    if (deleteError) {
      throw deleteError;
    }

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

