import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type DisbursementPayload = {
  category?: string | null;
  amount: number;
  incurredDate?: string | null;
  paid?: boolean;
  notes?: string | null;
};

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: { caseId: string };
  },
) {
  const { caseId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const payload = (await request.json()) as DisbursementPayload;

  if (!payload.amount || Number.isNaN(Number(payload.amount))) {
    return NextResponse.json({ error: "Disbursement amount is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pi_disbursements")
    .insert({
      case_id: caseId,
      org_id: orgId,
      category: payload.category?.trim() || null,
      amount: payload.amount,
      incurred_date: payload.incurredDate || null,
      paid: payload.paid ?? false,
      notes: payload.notes?.trim() || null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pi:disbursement] Failed to create disbursement", { error, caseId });
    return NextResponse.json({ error: "Unable to create disbursement." }, { status: 500 });
  }

  await evaluatePiRisks({ caseId, orgId, userId, trigger: "disbursement_created" });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

