import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateScheduleOfDisrepair, formatScheduleOfDisrepair } from "@/lib/housing/schedule";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const format = new URL(request.url).searchParams.get("format") || "json";

  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: housingCase },
    { data: defects },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("title")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_cases")
      .select("tenant_name, property_address, landlord_name")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_defects")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("first_reported_date", { ascending: true }),
  ]);

  if (!caseRecord || !housingCase) {
    return NextResponse.json(
      { error: "Housing case not found" },
      { status: 404 },
    );
  }

  const schedule = generateScheduleOfDisrepair(
    caseRecord.title,
    housingCase.property_address ?? "",
    housingCase.tenant_name ?? "",
    housingCase.landlord_name ?? "",
    defects ?? [],
  );

  if (format === "text") {
    const formatted = formatScheduleOfDisrepair(schedule);
    return new NextResponse(formatted, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="schedule_of_disrepair_${caseId}.txt"`,
      },
    });
  }

  return NextResponse.json(schedule);
}

