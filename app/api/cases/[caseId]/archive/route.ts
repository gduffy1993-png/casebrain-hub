import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { appendAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Archive a case (soft delete)
 * POST /api/cases/[caseId]/archive
 */
export async function POST(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { userId, orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // Verify case exists and belongs to org
  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, title, org_id, is_archived")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (caseError || !caseRecord) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404 },
    );
  }

  if (caseRecord.is_archived) {
    return NextResponse.json(
      { error: "Case is already archived" },
      { status: 400 },
    );
  }

  // Archive the case
  const { error: updateError } = await supabase
    .from("cases")
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("id", caseId)
    .eq("org_id", orgId);

  if (updateError) {
    console.error("[archive] Failed to archive case:", updateError);
    return NextResponse.json(
      { error: "Failed to archive case" },
      { status: 500 },
    );
  }

  // Log the action
  await appendAuditLog({
    caseId,
    userId,
    eventType: "CASE_ARCHIVED",
    meta: {
      caseTitle: caseRecord.title,
    },
  });

  return NextResponse.json({ success: true, message: "Case archived successfully" });
}

