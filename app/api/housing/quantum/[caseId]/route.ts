import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateQuantum } from "@/lib/housing/quantum";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const body = await request.json();
  const { additionalHeatingCosts, alternativeAccommodationCosts, propertyDamageValue } =
    body as {
      additionalHeatingCosts?: number;
      alternativeAccommodationCosts?: number;
      propertyDamageValue?: number;
    };

  const supabase = getSupabaseAdminClient();

  const [
    { data: housingCase },
    { data: defects },
    { data: medicalReports },
  ] = await Promise.all([
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_defects")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId),
    supabase
      .from("documents")
      .select("id, name, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .or("name.ilike.%medical%,name.ilike.%gp%,name.ilike.%doctor%"),
  ]);

  if (!housingCase) {
    return NextResponse.json(
      { error: "Housing case not found" },
      { status: 404 },
    );
  }

  const hasMedicalEvidence = (medicalReports?.length ?? 0) > 0;

  const quantum = calculateQuantum(
    housingCase,
    defects ?? [],
    hasMedicalEvidence,
    {
      additionalHeatingCosts,
      alternativeAccommodationCosts,
      propertyDamageValue,
    },
  );

  return NextResponse.json(quantum);
}

