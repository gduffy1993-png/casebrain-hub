import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type OfferPatch = {
  amount?: number;
  dateMade?: string;
  deadlineToRespond?: string | null;
  status?: "open" | "accepted" | "rejected" | "lapsed";
  notes?: string | null;
};

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { offerId: string };
  },
) {
  const { offerId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const payload = (await request.json()) as OfferPatch;

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_offers")
    .select("case_id")
    .eq("id", offerId)
    .eq("org_id", orgId)
    .maybeSingle();

  const updates: Record<string, unknown> = {};
  if (payload.amount !== undefined) updates.amount = payload.amount;
  if (payload.dateMade !== undefined) updates.date_made = payload.dateMade;
  if (payload.deadlineToRespond !== undefined)
    updates.deadline_to_respond = payload.deadlineToRespond;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;

  const { error } = await supabase
    .from("pi_offers")
    .update(updates)
    .eq("id", offerId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:offer] Failed to update offer", { error, offerId });
    return NextResponse.json({ error: "Unable to update offer." }, { status: 500 });
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "offer_updated" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: { offerId: string };
  },
) {
  const { offerId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_offers")
    .select("case_id")
    .eq("id", offerId)
    .eq("org_id", orgId)
    .maybeSingle();

  const { error } = await supabase
    .from("pi_offers")
    .delete()
    .eq("id", offerId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:offer] Failed to delete offer", { error, offerId });
    return NextResponse.json({ error: "Unable to delete offer." }, { status: 500 });
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "offer_deleted" });
  }

  return NextResponse.json({ ok: true });
}

