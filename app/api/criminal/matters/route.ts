/**
 * POST /api/criminal/matters
 * Create a new case from the Police station page form (case + criminal_cases matter data in one go).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

const MATTER_STATES = [
  "at_station",
  "bailed",
  "rui",
  "charged",
  "before_first_hearing",
  "before_ptph",
  "before_trial",
  "trial",
  "sentencing",
  "disposed",
] as const;

function buildCaseTitle(body: {
  allegedOffence?: string | null;
  dateOfArrest?: string | null;
  stationSummary?: string | null;
}): string {
  const offence = (body.allegedOffence ?? "").trim();
  const date = body.dateOfArrest ?? "";
  const summary = (body.stationSummary ?? "").trim().slice(0, 40);
  if (offence && date) return `Police station – ${offence} – ${date}`;
  if (offence) return `Police station – ${offence}`;
  if (date) return `Police station – ${date}`;
  if (summary) return `Police station – ${summary}…`;
  return `Police station – ${new Date().toISOString().slice(0, 10)}`;
}

export async function POST(request: Request) {
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId, userId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const body = await request.json().catch(() => ({}));
    const station = body.station ?? {};
    const matterState = MATTER_STATES.includes(body.matterState) ? body.matterState : "at_station";

    const title = (body.title && String(body.title).trim()) || buildCaseTitle({
      allegedOffence: station.allegedOffence,
      dateOfArrest: station.dateOfArrest,
      stationSummary: station.stationSummary,
    });

    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        org_id: orgId,
        title: title.trim().slice(0, 500),
        summary: station.stationSummary ?? "",
        practice_area: "criminal",
        is_archived: false,
        ...(typeof userId === "string" && userId ? { created_by: userId } : {}),
      })
      .select("id")
      .single();

    if (caseError || !newCase) {
      console.error("[criminal/matters] Case insert error:", caseError);
      return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
    }

    const caseId = newCase.id;

    const criminalRow: Record<string, unknown> = {
      id: caseId,
      org_id: orgId,
      matter_state: matterState,
      date_of_arrest: station.dateOfArrest || null,
      alleged_offence: station.allegedOffence || null,
      station_summary: station.stationSummary || null,
      grounds_for_arrest: station.groundsForArrest || null,
      time_in_custody_at: station.timeInCustodyAt || null,
      next_pace_review_at: station.nextPaceReviewAt || null,
      interview_stance: station.interviewStance || null,
      bail_return_date: body.bailReturnDate || null,
      bail_outcome: body.bailOutcome || null,
      matter_closed_at: body.matterClosedAt || null,
      matter_closed_reason: body.matterClosedReason || null,
    };

    const { error: criminalError } = await supabase
      .from("criminal_cases")
      .insert(criminalRow);

    if (criminalError) {
      console.error("[criminal/matters] criminal_cases upsert error:", criminalError);
      return NextResponse.json({ error: "Failed to save matter data" }, { status: 500 });
    }

    return NextResponse.json({ caseId, title: title.trim() });
  } catch (err) {
    console.error("[criminal/matters] Error:", err);
    return NextResponse.json({ error: "Failed to create matter" }, { status: 500 });
  }
}
