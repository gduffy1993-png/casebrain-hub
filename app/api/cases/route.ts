import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const view = searchParams.get("view")?.trim() ?? "";

    const isPoliceStationView = view === "police_station";

    let list: { id: string; title: string; updated_at: string | null }[] = [];

    if (isPoliceStationView) {
      const { data: stationRows, error: stationError } = await supabase
        .from("criminal_cases")
        .select("id, matter_state")
        .eq("org_id", orgId)
        .in("matter_state", ["at_station", "bailed", "rui"]);

      if (stationError || !stationRows?.length) {
        return NextResponse.json({ cases: [] });
      }
      const stationCaseIds = stationRows.map((r) => r.id);
      const matterStateByCase = new Map(stationRows.map((r) => [r.id, r.matter_state]));

      const { data: casesData, error } = await supabase
        .from("cases")
        .select("id, title, updated_at")
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .in("id", stationCaseIds)
        .order("updated_at", { ascending: false });

      if (error || !casesData?.length) {
        return NextResponse.json({ cases: [] });
      }
      list = casesData;
      const caseIds = list.map((c) => c.id);

      let positionsData: { case_id: string; position_text: string }[] = [];
      let criminalData: { id: string; next_hearing_date: string | null; next_hearing_type: string | null }[] = [];
      try {
        const [p, cr] = await Promise.all([
          supabase.from("case_positions").select("case_id, position_text").eq("org_id", orgId).in("case_id", caseIds).order("created_at", { ascending: false }),
          supabase.from("criminal_cases").select("id, next_hearing_date, next_hearing_type").eq("org_id", orgId).in("id", caseIds),
        ]);
        positionsData = p.data ?? [];
        criminalData = cr.data ?? [];
      } catch (e) {
        console.warn("[api/cases] Police station enrichment failed:", e);
      }

      const positionByCase = latestPositionsByCase(positionsData);
      const nextHearingByCase = new Map<string, { date: string; type: string | null }>();
      for (const row of criminalData) {
        if (row.next_hearing_date)
          nextHearingByCase.set(row.id, { date: row.next_hearing_date, type: row.next_hearing_type ?? null });
      }

      const casesWithStatus = list.map((c) => {
        const positionText = positionByCase.get(c.id);
        const strategy_preview =
          positionText != null && positionText.length > 40
            ? positionText.slice(0, 40).trim() + "…"
            : positionText?.trim() ?? null;
        const nextHearing = nextHearingByCase.get(c.id) ?? null;
        const matterState = matterStateByCase.get(c.id) ?? null;
        return {
          ...c,
          strategy_recorded: positionText != null && positionText.trim().length > 0,
          strategy_preview: strategy_preview || null,
          disclosure_outstanding: null as number | null,
          next_hearing_date: nextHearing?.date ?? null,
          next_hearing_type: nextHearing?.type ?? null,
          matter_state: matterState,
        };
      });

      return NextResponse.json({ cases: casesWithStatus });
    }

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

    list = cases ?? [];
    if (list.length === 0) {
      return NextResponse.json({ cases: [] });
    }

    const caseIds = list.map((c) => c.id);

    // Enrich with position, disclosure count, next hearing – non-fatal so case list always returns
    let positionsData: { case_id: string; position_text: string }[] = [];
    let disclosureData: { case_id: string }[] = [];
    let trackerData: { case_id: string; missing_items?: string[] | null }[] = [];
    let criminalData: { id: string; next_hearing_date: string | null; next_hearing_type: string | null }[] = [];
    try {
      const [p, d, t, cr] = await Promise.all([
        supabase.from("case_positions").select("case_id, position_text").eq("org_id", orgId).in("case_id", caseIds).order("created_at", { ascending: false }),
        supabase.from("case_disclosure_chasers").select("case_id").eq("org_id", orgId).in("case_id", caseIds).neq("status", "received"),
        supabase.from("disclosure_tracker").select("case_id, missing_items").eq("org_id", orgId).in("case_id", caseIds),
        supabase.from("criminal_cases").select("id, next_hearing_date, next_hearing_type").eq("org_id", orgId).in("id", caseIds),
      ]);
      positionsData = p.data ?? [];
      disclosureData = d.data ?? [];
      trackerData = t.data ?? [];
      criminalData = cr.data ?? [];
    } catch (e) {
      console.warn("[api/cases] Enrichment queries failed, returning cases without status:", e);
    }

    const positionByCase = latestPositionsByCase(positionsData);
    const disclosureCountByCase = new Map<string, number>();
    for (const row of disclosureData) {
      disclosureCountByCase.set(row.case_id, (disclosureCountByCase.get(row.case_id) ?? 0) + 1);
    }
    const trackerByCase = new Map<string, number>();
    for (const row of trackerData) {
      const n = Array.isArray(row.missing_items) ? row.missing_items.length : 0;
      if (n > 0) trackerByCase.set(row.case_id, n);
    }
    const nextHearingByCase = new Map<string, { date: string; type: string | null }>();
    for (const row of criminalData) {
      if (row.next_hearing_date)
        nextHearingByCase.set(row.id, { date: row.next_hearing_date, type: row.next_hearing_type ?? null });
    }

    const casesWithStatus = list.map((c) => {
      const positionText = positionByCase.get(c.id);
      const strategy_preview =
        positionText != null
          ? positionText.length > 40
            ? positionText.slice(0, 40).trim() + "…"
            : positionText.trim()
          : null;
      const chaserCount = disclosureCountByCase.get(c.id) ?? 0;
      const trackerCount = trackerByCase.get(c.id) ?? 0;
      const disclosureOutstanding = chaserCount > 0 ? chaserCount : trackerCount;
      const nextHearing = nextHearingByCase.get(c.id) ?? null;
      return {
        ...c,
        strategy_recorded: positionText != null && positionText.trim().length > 0,
        strategy_preview: strategy_preview || null,
        disclosure_outstanding: disclosureOutstanding as number,
        next_hearing_date: nextHearing?.date ?? null,
        next_hearing_type: nextHearing?.type ?? null,
      };
    });

    return NextResponse.json({ cases: casesWithStatus });
  } catch (err) {
    console.error("[api/cases] Error:", err);
    return NextResponse.json({ cases: [] });
  }
}

