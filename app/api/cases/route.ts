import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

/** Latest position per case (case_id -> { position_text }) */
function latestPositionsByCase(
  rows: { case_id: string; position_text: string }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.case_id)) map.set(row.case_id, row.position_text);
  }
  return map;
}

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    let query = supabase
      .from("cases")
      .select("id, title, updated_at")
      .eq("org_id", orgId)
      .eq("is_archived", false);

    if (q.length > 0) {
      query = query.ilike("title", `%${q}%`);
    }
    const { data: cases, error } = await query.order(
      q.length > 0 ? "title" : "updated_at",
      { ascending: q.length > 0 }
    );

    if (error) {
      console.error("[api/cases] Supabase error:", error.message);
      return NextResponse.json({ cases: [] });
    }

    const list = cases ?? [];
    if (list.length === 0) {
      return NextResponse.json({ cases: [] });
    }

    const caseIds = list.map((c) => c.id);
    const { data: positions } = await supabase
      .from("case_positions")
      .select("case_id, position_text")
      .eq("org_id", orgId)
      .in("case_id", caseIds)
      .order("created_at", { ascending: false });

    const positionByCase = latestPositionsByCase(positions ?? []);

    const casesWithStatus = list.map((c) => {
      const positionText = positionByCase.get(c.id);
      const strategy_preview =
        positionText != null
          ? positionText.length > 40
            ? positionText.slice(0, 40).trim() + "…"
            : positionText.trim()
          : null;
      return {
        ...c,
        strategy_recorded: positionText != null && positionText.trim().length > 0,
        strategy_preview: strategy_preview || null,
        disclosure_outstanding: null as number | null,
      };
    });

    return NextResponse.json({ cases: casesWithStatus });
  } catch (err) {
    console.error("[api/cases] Error:", err);
    return NextResponse.json({ cases: [] });
  }
}

