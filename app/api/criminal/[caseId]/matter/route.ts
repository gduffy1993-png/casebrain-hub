import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ caseId: string }> };

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

/**
 * GET /api/criminal/[caseId]/matter
 * Returns matter state, police station fields, bail outcome, closed state.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("criminal_cases")
      .select(
        "matter_state, time_in_custody_at, next_pace_review_at, interview_stance, station_summary, bail_return_date, bail_outcome, matter_closed_at, matter_closed_reason, plea, plea_date"
      )
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[criminal/matter] GET error:", error);
      return NextResponse.json({ error: "Failed to fetch matter data" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        matterState: null,
        station: { timeInCustodyAt: null, nextPaceReviewAt: null, interviewStance: null, stationSummary: null },
        bailReturnDate: null,
        bailOutcome: null,
        matterClosedAt: null,
        matterClosedReason: null,
        plea: null,
        pleaDate: null,
      });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      matterState: data.matter_state ?? null,
      station: {
        timeInCustodyAt: data.time_in_custody_at ?? null,
        nextPaceReviewAt: data.next_pace_review_at ?? null,
        interviewStance: data.interview_stance ?? null,
        stationSummary: data.station_summary ?? null,
      },
      bailReturnDate: data.bail_return_date ?? null,
      bailOutcome: data.bail_outcome ?? null,
      matterClosedAt: data.matter_closed_at ?? null,
      matterClosedReason: data.matter_closed_reason ?? null,
      plea: row.plea ?? null,
      pleaDate: row.plea_date ?? null,
    });
  } catch (err) {
    console.error("[criminal/matter] GET:", err);
    return NextResponse.json({ error: "Failed to fetch matter data" }, { status: 500 });
  }
}

/**
 * PATCH /api/criminal/[caseId]/matter
 * Update matter state, station, bail outcome, closed.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.matterState !== undefined) {
      updates.matter_state = MATTER_STATES.includes(body.matterState) ? body.matterState : null;
    }
    if (body.station !== undefined) {
      if (body.station.timeInCustodyAt !== undefined) updates.time_in_custody_at = body.station.timeInCustodyAt || null;
      if (body.station.nextPaceReviewAt !== undefined) updates.next_pace_review_at = body.station.nextPaceReviewAt || null;
      if (body.station.interviewStance !== undefined) updates.interview_stance = body.station.interviewStance || null;
      if (body.station.stationSummary !== undefined) updates.station_summary = body.station.stationSummary || null;
    }
    if (body.bailReturnDate !== undefined) updates.bail_return_date = body.bailReturnDate || null;
    if (body.bailOutcome !== undefined) updates.bail_outcome = body.bailOutcome || null;
    if (body.matterClosedAt !== undefined) updates.matter_closed_at = body.matterClosedAt || null;
    if (body.matterClosedReason !== undefined) updates.matter_closed_reason = body.matterClosedReason || null;
    if (body.plea !== undefined) updates.plea = body.plea || null;
    if (body.pleaDate !== undefined) updates.plea_date = body.pleaDate || null;

    const { error } = await supabase
      .from("criminal_cases")
      .update(updates)
      .eq("id", caseId)
      .eq("org_id", orgId);

    if (error) {
      console.error("[criminal/matter] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update matter data" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[criminal/matter] PATCH:", err);
    return NextResponse.json({ error: "Failed to update matter data" }, { status: 500 });
  }
}
