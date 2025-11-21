import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getHousingLetterTemplate, renderHousingLetter } from "@/lib/housing/letters";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { orgId } = await requireAuthContext();
  const body = await request.json();
  const { caseId, templateCode } = body as {
    caseId: string;
    templateCode: string;
  };

  if (!caseId || !templateCode) {
    return NextResponse.json(
      { error: "caseId and templateCode are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const [
    { data: housingCase },
    { data: caseRecord },
    { data: defects },
    { data: firmSettings },
  ] = await Promise.all([
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("cases")
      .select("title")
      .eq("id", caseId)
      .maybeSingle(),
    supabase
      .from("housing_defects")
      .select("defect_type, location, severity")
      .eq("case_id", caseId)
      .eq("org_id", orgId),
    supabase
      .from("organisation_settings")
      .select("firm_name")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  if (!housingCase || !caseRecord) {
    return NextResponse.json(
      { error: "Housing case not found" },
      { status: 404 },
    );
  }

  const template = await getHousingLetterTemplate(templateCode, orgId);
  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 },
    );
  }

  const defectsList =
    defects && defects.length > 0
      ? defects
          .map(
            (d) =>
              `- ${d.defect_type}${d.location ? ` (${d.location})` : ""}${d.severity ? ` - ${d.severity}` : ""}`,
          )
          .join("\n")
      : "[List of defects]";

  const rendered = renderHousingLetter(template, {
    landlordName: housingCase.landlord_name ?? undefined,
    propertyAddress: housingCase.property_address ?? undefined,
    tenantName: housingCase.tenant_name ?? undefined,
    defectsList,
    firstComplaintDate: housingCase.first_report_date
      ? new Date(housingCase.first_report_date).toLocaleDateString("en-GB")
      : undefined,
    healthIssues: housingCase.tenant_vulnerability.join(", ") || undefined,
    unfitStatus: housingCase.unfit_for_habitation ? "unfit for human habitation" : "in disrepair",
    firmName: firmSettings?.firm_name ?? undefined,
  });

  return NextResponse.json({
    template: {
      id: template.id,
      code: template.code,
      name: template.name,
    },
    rendered,
  });
}

