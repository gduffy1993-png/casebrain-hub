import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { appendAuditLog } from "@/lib/audit";
import { updateActiveCaseCount } from "@/lib/usage-limits";

type ArchiveManyBody = {
  /**
   * Case IDs to archive (soft delete).
   * Caller should already filter which cases they intend to archive.
   */
  caseIds: string[];
};

/**
 * POST /api/cases/archive-many
 * Bulk-archive multiple cases into the Bin (soft delete).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ArchiveManyBody | null;
  const { caseIds } = body ?? { caseIds: [] };

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    return NextResponse.json({ error: "Missing caseIds" }, { status: 400 });
  }

  const sanitized = caseIds.map(String).filter(Boolean);
  if (!sanitized.length) {
    return NextResponse.json({ error: "Missing caseIds" }, { status: 400 });
  }

  const { userId, orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // Verify cases belong to org and are not already archived.
  const { data: candidates, error: fetchError } = await supabase
    .from("cases")
    .select("id, title, org_id, is_archived")
    .in("id", sanitized)
    .eq("org_id", orgId)
    .eq("is_archived", false);

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }

  const idsToArchive = (candidates ?? []).map((c) => c.id);
  if (idsToArchive.length === 0) {
    return NextResponse.json({ success: true, archivedCount: 0, message: "No cases archived" });
  }

  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      is_archived: true,
      archived_at: nowIso,
      updated_at: nowIso,
    })
    .in("id", idsToArchive)
    .eq("org_id", orgId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to archive cases" }, { status: 500 });
  }

  // Audit log (one row per case to match existing semantics).
  for (const c of candidates ?? []) {
    if (!idsToArchive.includes(c.id)) continue;
    await appendAuditLog({
      caseId: c.id,
      userId,
      eventType: "CASE_ARCHIVED",
      meta: { caseTitle: c.title },
    });
  }

  await updateActiveCaseCount(orgId);

  return NextResponse.json({
    success: true,
    archivedCount: idsToArchive.length,
    message: "Cases archived successfully",
  });
}

