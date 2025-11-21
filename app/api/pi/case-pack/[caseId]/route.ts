import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildPiCasePack } from "@/lib/pi/case-pack";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: { caseId: string };
  },
) {
  const { caseId } = params;
  const { orgId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const supabase = getSupabaseAdminClient();

  const [
    caseResult,
    piCaseResult,
    medicalReportsResult,
    offersResult,
    hearingsResult,
    disbursementsResult,
    deadlinesResult,
    tasksResult,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, practice_area, created_at, updated_at")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase.from("pi_cases").select("*").eq("id", caseId).eq("org_id", orgId).maybeSingle(),
    supabase.from("pi_medical_reports").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase.from("pi_offers").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase.from("pi_hearings").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase.from("pi_disbursements").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase
      .from("deadlines")
      .select("id, title, due_date")
      .eq("case_id", caseId)
      .order("due_date", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, due_at, status")
      .eq("case_id", caseId)
      .order("due_at", { ascending: true }),
  ]);

  if (!caseResult.data) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const pack = buildPiCasePack({
    caseRecord: caseResult.data,
    piCase: piCaseResult.data ?? null,
    medicalReports: medicalReportsResult.data ?? [],
    offers: offersResult.data ?? [],
    hearings: hearingsResult.data ?? [],
    disbursements: disbursementsResult.data ?? [],
    deadlines: deadlinesResult.data ?? [],
    tasks: tasksResult.data ?? [],
  });

  return NextResponse.json({
    ok: true,
    data: pack,
  });
}


