import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type OfferPayload = {
  party: "claimant" | "defendant";
  amount: number;
  dateMade: string;
  deadlineToRespond?: string | null;
  status?: "open" | "accepted" | "rejected" | "lapsed";
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
  const payload = (await request.json()) as OfferPayload;

  if (!payload.amount || !payload.dateMade) {
    return NextResponse.json({ error: "Offer amount and date are required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pi_offers")
    .insert({
      case_id: caseId,
      org_id: orgId,
      party: payload.party,
      amount: payload.amount,
      date_made: payload.dateMade,
      deadline_to_respond: payload.deadlineToRespond ?? null,
      status: payload.status ?? "open",
      notes: payload.notes?.trim() || null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pi:offer] Failed to create offer", { error, caseId });
    return NextResponse.json({ error: "Unable to create offer." }, { status: 500 });
  }

  await evaluatePiRisks({ caseId, orgId, userId, trigger: "offer_created" });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

