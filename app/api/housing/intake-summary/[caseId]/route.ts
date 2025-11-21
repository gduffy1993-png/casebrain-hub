import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateCaseBundlePdf } from "@/lib/pdf";

export const runtime = "nodejs";

/**
 * Generate one-page intake summary for housing disrepair case
 * Used for fee-earner/counsel handovers
 */
export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: housingCase },
    { data: defects },
    { data: timeline },
    { data: landlordResponses },
    { data: riskFlags },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
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
      .eq("org_id", orgId)
      .order("first_reported_date", { ascending: true }),
    supabase
      .from("housing_timeline")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("event_date", { ascending: true })
      .limit(10),
    supabase
      .from("housing_landlord_responses")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("response_date", { ascending: false })
      .limit(5),
    supabase
      .from("risk_flags")
      .select("flag_type, severity, description")
      .eq("case_id", caseId)
      .eq("resolved", false),
  ]);

  if (!caseRecord || !housingCase) {
    return NextResponse.json(
      { error: "Housing case not found" },
      { status: 404 },
    );
  }

  // Generate summary text
  const summary = {
    caseTitle: caseRecord.title,
    tenant: housingCase.tenant_name ?? "Unknown",
    property: housingCase.property_address ?? "Unknown",
    landlord: housingCase.landlord_name ?? "Unknown",
    landlordType: housingCase.landlord_type ?? "Unknown",
    firstReport: housingCase.first_report_date
      ? new Date(housingCase.first_report_date).toLocaleDateString("en-GB")
      : "Not recorded",
    stage: housingCase.stage,
    vulnerabilities: housingCase.tenant_vulnerability.join(", ") || "None recorded",
    defectsCount: defects?.length ?? 0,
    category1Hazards: housingCase.hhsrs_category_1_hazards.join(", ") || "None",
    unfitForHabitation: housingCase.unfit_for_habitation ? "Yes" : "No",
    repairAttempts: housingCase.repair_attempts_count,
    noAccessDays: housingCase.no_access_days_total,
    limitationRisk: housingCase.limitation_risk ?? "Not assessed",
    keyDefects:
      defects
        ?.slice(0, 5)
        .map((d) => `${d.defect_type}${d.location ? ` (${d.location})` : ""}`)
        .join(", ") ?? "None",
    recentResponses:
      landlordResponses
        ?.slice(0, 3)
        .map(
          (r) =>
            `${new Date(r.response_date).toLocaleDateString("en-GB")}: ${r.response_type}`,
        )
        .join("; ") ?? "None",
    criticalRisks:
      riskFlags
        ?.filter((f) => f.severity === "critical" || f.severity === "high")
        .map((f) => f.flag_type.replace(/_/g, " "))
        .join(", ") ?? "None",
  };

  // Return as JSON (can be formatted as PDF later)
  return NextResponse.json({
    summary,
    defects: defects ?? [],
    timeline: timeline ?? [],
    landlordResponses: landlordResponses ?? [],
    riskFlags: riskFlags ?? [],
  });
}

