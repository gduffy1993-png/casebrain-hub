import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type DisbursementPatch = {
  category?: string | null;
  amount?: number;
  incurredDate?: string | null;
  paid?: boolean;
  notes?: string | null;
};

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { disbursementId: string };
  },
) {
  const { disbursementId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const payload = (await request.json()) as DisbursementPatch;

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_disbursements")
    .select("case_id")
    .eq("id", disbursementId)
    .eq("org_id", orgId)
    .maybeSingle();

  const updates: Record<string, unknown> = {};
  if (payload.category !== undefined) updates.category = payload.category?.trim() || null;
  if (payload.amount !== undefined) updates.amount = payload.amount;
  if (payload.incurredDate !== undefined) updates.incurred_date = payload.incurredDate || null;
  if (payload.paid !== undefined) updates.paid = payload.paid;
  if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;

  const { error } = await supabase
    .from("pi_disbursements")
    .update(updates)
    .eq("id", disbursementId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:disbursement] Failed to update disbursement", { error, disbursementId });
    return NextResponse.json(
      { error: "Unable to update disbursement." },
      { status: 500 },
    );
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "disbursement_updated" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: { disbursementId: string };
  },
) {
  const { disbursementId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_disbursements")
    .select("case_id")
    .eq("id", disbursementId)
    .eq("org_id", orgId)
    .maybeSingle();

  const { error } = await supabase
    .from("pi_disbursements")
    .delete()
    .eq("id", disbursementId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:disbursement] Failed to delete disbursement", { error, disbursementId });
    return NextResponse.json(
      { error: "Unable to delete disbursement." },
      { status: 500 },
    );
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "disbursement_deleted" });
  }

  return NextResponse.json({ ok: true });
}

