import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { checkLimitationPeriod } from "@/lib/housing/compliance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  const body = await request.json();

  const {
    caseTitle,
    tenantName,
    tenantDob,
    tenantVulnerability,
    propertyAddress,
    landlordName,
    landlordType,
    firstReportDate,
    defects,
  } = body as {
    caseTitle: string;
    tenantName: string;
    tenantDob?: string;
    tenantVulnerability: string[];
    propertyAddress: string;
    landlordName: string;
    landlordType: string;
    firstReportDate: string;
    defects: Array<{
      type: string;
      location: string;
      severity: string;
      firstReported: string;
    }>;
  };

  if (!caseTitle || !tenantName || !propertyAddress || !landlordName || !firstReportDate) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  // Create case
  const { data: newCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      org_id: orgId,
      title: caseTitle,
      practice_area: "housing_disrepair",
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (caseError || !newCase) {
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 },
    );
  }

  // Calculate limitation risk
  const firstReport = new Date(firstReportDate);
  const limitationCheck = checkLimitationPeriod(firstReport);
  const limitationDate = new Date(firstReport);
  limitationDate.setFullYear(limitationDate.getFullYear() + 6);

  // Create housing case record
  const { error: housingError } = await supabase.from("housing_cases").insert({
    id: newCase.id,
    org_id: orgId,
    tenant_name: tenantName,
    tenant_dob: tenantDob || null,
    tenant_vulnerability: tenantVulnerability,
    property_address: propertyAddress,
    landlord_name: landlordName,
    landlord_type: landlordType || null,
    first_report_date: firstReportDate,
    limitation_risk: limitationCheck.severity,
    limitation_date: limitationDate.toISOString().split("T")[0],
    stage: "intake",
  });

  if (housingError) {
    return NextResponse.json(
      { error: "Failed to create housing case record" },
      { status: 500 },
    );
  }

  // Create defects
  if (defects && defects.length > 0) {
    const defectsToInsert = defects
      .filter((d) => d.type)
      .map((defect) => ({
        case_id: newCase.id,
        org_id: orgId,
        defect_type: defect.type,
        location: defect.location || null,
        severity: defect.severity || null,
        first_reported_date: defect.firstReported || firstReportDate,
        hhsrs_category: ["damp", "mould", "structural"].includes(defect.type)
          ? "category_1"
          : "none",
      }));

    if (defectsToInsert.length > 0) {
      await supabase.from("housing_defects").insert(defectsToInsert);
    }
  }

  return NextResponse.json({
    caseId: newCase.id,
    limitationDate: limitationDate.toISOString().split("T")[0],
    limitationRisk: limitationCheck.severity,
  });
}

