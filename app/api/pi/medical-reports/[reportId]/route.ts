import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type MedicalReportPatch = {
  expertName?: string | null;
  specialism?: string | null;
  reportType?: string | null;
  instructionDate?: string | null;
  reportDueDate?: string | null;
  reportReceivedDate?: string | null;
  notes?: string | null;
};

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { reportId: string };
  },
) {
  const { reportId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const payload = (await request.json()) as MedicalReportPatch;

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_medical_reports")
    .select("case_id")
    .eq("id", reportId)
    .eq("org_id", orgId)
    .maybeSingle();

  const caseId = record?.case_id;

  const updates: Record<string, string | null> = {};
  if (payload.expertName !== undefined) updates.expert_name = payload.expertName?.trim() || null;
  if (payload.specialism !== undefined) updates.specialism = payload.specialism?.trim() || null;
  if (payload.reportType !== undefined) updates.report_type = payload.reportType?.trim() || null;
  if (payload.instructionDate !== undefined) updates.instruction_date = payload.instructionDate || null;
  if (payload.reportDueDate !== undefined) updates.report_due_date = payload.reportDueDate || null;
  if (payload.reportReceivedDate !== undefined)
    updates.report_received_date = payload.reportReceivedDate || null;
  if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;

  const { error } = await supabase
    .from("pi_medical_reports")
    .update(updates)
    .eq("id", reportId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:medical-report] Failed to update report", { error, reportId });
    return NextResponse.json(
      { error: "Unable to update medical report." },
      { status: 500 },
    );
  }

  if (caseId) {
    await evaluatePiRisks({ caseId, orgId, userId, trigger: "medical_report_updated" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: { reportId: string };
  },
) {
  const { reportId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const supabase = getSupabaseAdminClient();
  const { data: record } = await supabase
    .from("pi_medical_reports")
    .select("case_id")
    .eq("id", reportId)
    .eq("org_id", orgId)
    .maybeSingle();

  const { error } = await supabase
    .from("pi_medical_reports")
    .delete()
    .eq("id", reportId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:medical-report] Failed to delete report", { error, reportId });
    return NextResponse.json(
      { error: "Unable to delete medical report." },
      { status: 500 },
    );
  }

  if (record?.case_id) {
    await evaluatePiRisks({ caseId: record.case_id, orgId, userId, trigger: "medical_report_deleted" });
  }

  return NextResponse.json({ ok: true });
}


