import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildLimitationUrgencyChecklist } from "@/lib/core/checklists";
import { calculateLimitation } from "@/lib/core/limitation";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // Try to get limitation data from housing case first
  const { data: housingCase } = await supabase
    .from("housing_cases")
    .select("first_report_date, tenant_dob")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  let limitationDate: string | undefined;
  let isExpired = false;

  if (housingCase?.first_report_date) {
    const limitationResult = calculateLimitation({
      incidentDate: housingCase.first_report_date,
      dateOfKnowledge: housingCase.first_report_date,
      claimantDateOfBirth: housingCase.tenant_dob ?? undefined,
      practiceArea: "housing",
    });

    limitationDate = limitationResult.limitationDate;
    isExpired = limitationResult.isExpired;
  }

  // Fallback: try to get from case documents
  if (!limitationDate) {
    const { data: documents } = await supabase
      .from("documents")
      .select("extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .limit(1);

    if (documents && documents.length > 0) {
      const extracted = documents[0].extracted_json as any;
      if (extracted?.dates) {
        const incidentDate = extracted.dates.find((d: any) =>
          d.label.toLowerCase().includes("incident") || d.label.toLowerCase().includes("accident"),
        );
        if (incidentDate) {
          const limitationResult = calculateLimitation({
            incidentDate: incidentDate.isoDate,
            practiceArea: "other",
          });
          limitationDate = limitationResult.limitationDate;
          isExpired = limitationResult.isExpired;
        }
      }
    }
  }

  const { data: caseRecord } = await supabase
    .from("cases")
    .select("title")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  const checklist = buildLimitationUrgencyChecklist({
    caseTitle: caseRecord?.title,
    limitationDate,
    isExpired,
  });

  return NextResponse.json(checklist);
}

