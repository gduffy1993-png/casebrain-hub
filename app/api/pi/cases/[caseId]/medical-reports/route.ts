import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type MedicalReportPayload = {
  expertName?: string | null;
  specialism?: string | null;
  reportType?: string | null;
  instructionDate?: string | null;
  reportDueDate?: string | null;
  reportReceivedDate?: string | null;
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
  const payload = (await request.json()) as MedicalReportPayload;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pi_medical_reports")
    .insert({
      case_id: caseId,
      org_id: orgId,
      expert_name: (payload.expertName ?? "").trim() || null,
      specialism: (payload.specialism ?? "").trim() || null,
      report_type: (payload.reportType ?? "").trim() || null,
      instruction_date: payload.instructionDate || null,
      report_due_date: payload.reportDueDate || null,
      report_received_date: payload.reportReceivedDate || null,
      notes: (payload.notes ?? "").trim() || null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pi:medical-report] Failed to create report", {
      error,
      caseId,
      userId,
    });
    return NextResponse.json(
      { error: "Unable to create medical report." },
      { status: 500 },
    );
  }

  await evaluatePiRisks({ caseId, orgId, userId, trigger: "medical_report_created" });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}


