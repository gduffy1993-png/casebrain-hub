import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateLimitation } from "@/lib/pi/limitation";
import { seedProtocolDeadlines, type ProtocolKind } from "@/lib/pi/protocol";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type IntakePayload = {
  caseTitle: string;
  caseType: "pi" | "clinical_negligence";
  opponent?: string | null;
  accidentDate?: string | null;
  dateOfKnowledge?: string | null;
  clientDob?: string | null;
  injuryDescription?: string | null;
  injurySeverity?: string | null;
  employmentStatus?: string | null;
  lossOfEarningsEstimate?: number | null;
  specialDamagesEstimate?: number | null;
  generalDamagesBand?: string | null;
};

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();

  const payload = (await request.json()) as IntakePayload;

  if (!payload.caseTitle?.trim()) {
    return NextResponse.json(
      { error: "caseTitle is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const accidentDate = payload.accidentDate ? new Date(payload.accidentDate) : null;
  const dateOfKnowledge = payload.dateOfKnowledge ? new Date(payload.dateOfKnowledge) : null;
  const clientDob = payload.clientDob ? new Date(payload.clientDob) : null;

  const limitation = calculateLimitation({
    accidentDate,
    dateOfKnowledge,
    clientDob,
  });

  const { data: createdCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      org_id: orgId,
      title: payload.caseTitle.trim(),
      summary: payload.injuryDescription ?? null,
      created_by: userId,
      practice_area: payload.caseType,
    })
    .select("id")
    .maybeSingle();

  if (caseError || !createdCase) {
    console.error("[pi:intake] Failed to create case record", { caseError });
    return NextResponse.json(
      { error: "Failed to create case record" },
      { status: 500 },
    );
  }

  const caseId = createdCase.id;

  const { error: piInsertError } = await supabase.from("pi_cases").insert({
    id: caseId,
    org_id: orgId,
    case_type: payload.caseType,
    accident_date: accidentDate ? accidentDate.toISOString().slice(0, 10) : null,
    date_of_knowledge: dateOfKnowledge ? dateOfKnowledge.toISOString().slice(0, 10) : null,
    limitation_date: limitation.limitationDate
      ? limitation.limitationDate.toISOString().slice(0, 10)
      : null,
    client_dob: clientDob ? clientDob.toISOString().slice(0, 10) : null,
    liability_stance: null,
    injury_description: payload.injuryDescription ?? null,
    injury_severity: payload.injurySeverity ?? null,
    employment_status: payload.employmentStatus ?? null,
    loss_of_earnings_estimate: payload.lossOfEarningsEstimate ?? null,
    special_damages_estimate: payload.specialDamagesEstimate ?? null,
    general_damages_band: payload.generalDamagesBand ?? null,
    stage: "intake",
  });

  if (piInsertError) {
    console.error("[pi:intake] Failed to create pi_cases record", { piInsertError });
    return NextResponse.json(
      { error: "Failed to create PI case details" },
      { status: 500 },
    );
  }

  const protocol: ProtocolKind =
    payload.caseType === "clinical_negligence" ? "clinical_negligence_basic" : "pi_basic";

  await seedProtocolDeadlines(protocol, {
    caseId,
    orgId,
    createdBy: userId,
    accidentDate,
    limitationDate: limitation.limitationDate,
  });

  await evaluatePiRisks({ caseId, orgId, userId, trigger: "intake" });

  return NextResponse.json(
    {
      ok: true,
      caseId,
      limitationDate: limitation.limitationDate
        ? limitation.limitationDate.toISOString()
        : null,
      limitationReason: limitation.reason,
    },
    { status: 201 },
  );
}


