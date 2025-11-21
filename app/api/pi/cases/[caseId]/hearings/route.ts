import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type HearingPayload = {
  hearingType?: string | null;
  date?: string | null;
  location?: string | null;
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
  const payload = (await request.json()) as HearingPayload;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pi_hearings")
    .insert({
      case_id: caseId,
      org_id: orgId,
      hearing_type: payload.hearingType?.trim() || null,
      date: payload.date || null,
      location: payload.location?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pi:hearing] Failed to create hearing", { error, caseId });
    return NextResponse.json({ error: "Unable to create hearing." }, { status: 500 });
  }

  await evaluatePiRisks({ caseId, orgId, userId, trigger: "hearing_created" });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

