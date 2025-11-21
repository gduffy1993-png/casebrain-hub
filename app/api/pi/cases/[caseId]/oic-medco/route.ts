import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const body = await request.json();

  const supabase = getSupabaseAdminClient();

  const { data: caseRecord } = await supabase
    .from("cases")
    .select("id, practice_area")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (
    caseRecord.practice_area !== "pi" &&
    caseRecord.practice_area !== "clinical_negligence"
  ) {
    return NextResponse.json(
      { error: "Case is not a PI/Clinical Negligence case" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("pi_cases").upsert(
    {
      id: caseId,
      org_id: orgId,
      case_type:
        caseRecord.practice_area === "clinical_negligence"
          ? "clinical_negligence"
          : "pi",
      oic_track: body.oicTrack ?? null,
      injury_summary: body.injurySummary ?? null,
      whiplash_tariff_band: body.whiplashTariffBand ?? null,
      prognosis_months_min: body.prognosisMonthsMin ?? null,
      prognosis_months_max: body.prognosisMonthsMax ?? null,
      psych_injury: body.psychInjury ?? null,
      treatment_recommended: body.treatmentRecommended ?? null,
      medco_reference: body.medcoReference ?? null,
      liability_stance: body.liabilityStance ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to update OIC/MedCo data" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

