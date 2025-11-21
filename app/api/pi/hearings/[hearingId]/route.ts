import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type HearingPatch = {
  hearingType?: string | null;
  date?: string | null;
  location?: string | null;
  notes?: string | null;
};

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { hearingId: string };
  },
) {
  const { hearingId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const payload = (await request.json()) as HearingPatch;

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_hearings")
    .select("case_id")
    .eq("id", hearingId)
    .eq("org_id", orgId)
    .maybeSingle();

  const updates: Record<string, string | null> = {};
  if (payload.hearingType !== undefined) updates.hearing_type = payload.hearingType?.trim() || null;
  if (payload.date !== undefined) updates.date = payload.date || null;
  if (payload.location !== undefined) updates.location = payload.location?.trim() || null;
  if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;

  const { error } = await supabase
    .from("pi_hearings")
    .update(updates)
    .eq("id", hearingId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:hearing] Failed to update hearing", { error, hearingId });
    return NextResponse.json({ error: "Unable to update hearing." }, { status: 500 });
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "hearing_updated" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: { hearingId: string };
  },
) {
  const { hearingId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_hearings")
    .select("case_id")
    .eq("id", hearingId)
    .eq("org_id", orgId)
    .maybeSingle();

  const { error } = await supabase
    .from("pi_hearings")
    .delete()
    .eq("id", hearingId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:hearing] Failed to delete hearing", { error, hearingId });
    return NextResponse.json({ error: "Unable to delete hearing." }, { status: 500 });
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "hearing_deleted" });
  }

  return NextResponse.json({ ok: true });
}

