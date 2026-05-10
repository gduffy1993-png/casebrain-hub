import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authRes = await requireAuthContextApi();
  if (!authRes.ok) return authRes.response;
  const { orgId } = authRes.context;

  const { runId } = await params;
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("eval_sweep_runs")
    .select("id, org_id, created_at, source, question_labels, row_count")
    .eq("id", runId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 });
  }
  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: rows, error: rowsErr } = await supabase
    .from("eval_sweep_rows")
    .select(
      "case_id, case_title, question_no, question, answer, error, duration_ms, weak, http_status, sort_order"
    )
    .eq("run_id", runId)
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true });

  if (rowsErr) {
    return NextResponse.json({ error: rowsErr.message }, { status: 500 });
  }

  const questions = Array.isArray(run.question_labels) ? run.question_labels : [];

  return NextResponse.json({
    run_id: run.id,
    generated_at: run.created_at,
    source: run.source,
    row_count: run.row_count,
    questions,
    rows: rows ?? [],
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authRes = await requireAuthContextApi();
  if (!authRes.ok) return authRes.response;
  const { orgId } = authRes.context;

  const { runId } = await params;
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("eval_sweep_runs").delete().eq("id", runId).eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
