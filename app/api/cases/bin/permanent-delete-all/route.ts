import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { permanentlyDeleteCaseData } from "@/lib/cases/permanently-delete-case-data";

type Body = { confirm?: boolean };

/**
 * POST /api/cases/bin/permanent-delete-all
 * Permanently deletes every archived case in the org (Bin empty).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    if (body.confirm !== true) {
      return NextResponse.json(
        { error: 'Send JSON body: { "confirm": true }' },
        { status: 400 },
      );
    }

    const { orgId, userId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: archived, error: listError } = await supabase
      .from("cases")
      .select("id, title")
      .eq("org_id", orgId)
      .eq("is_archived", true);

    if (listError) {
      return NextResponse.json({ error: "Failed to list archived cases" }, { status: 500 });
    }

    const rows = archived ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    let deletedCount = 0;
    for (const row of rows) {
      try {
        await permanentlyDeleteCaseData(supabase, row.id);
        deletedCount += 1;
      } catch (e) {
        console.error("[permanent-delete-all] failed for case", row.id, e);
        return NextResponse.json(
          {
            error: "Bulk delete stopped due to an error",
            deletedCount,
            failedCaseId: row.id,
          },
          { status: 500 },
        );
      }
    }

    await supabase.from("audit_log").insert({
      org_id: orgId,
      actor_id: userId,
      action: "cases_bin_emptied",
      resource_type: "cases",
      resource_id: orgId,
      metadata: {
        deleted_count: deletedCount,
        titles_sample: rows.slice(0, 20).map((r) => r.title),
      },
    });

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Failed permanent-delete-all:", error);
    return NextResponse.json({ error: "Failed to empty bin" }, { status: 500 });
  }
}
