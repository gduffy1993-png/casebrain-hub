import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 8_000;
const INSERT_CHUNK = 250;

type SweepRowIn = {
  case_id: string;
  case_title?: string | null;
  question_no: number;
  question: string;
  answer: string;
  error?: string | null;
  duration_ms?: number | null;
  weak?: boolean | null;
  http_status?: number | null;
  /** From `x-casebrain-route` on defence-plan-chat (strict_mg6, lightweight_eval, etc.) */
  route_tag?: string | null;
  /** Structured observability from defence-plan-chat JSON `eval_meta` */
  row_meta?: Record<string, unknown> | null;
};

export async function GET() {
  const authRes = await requireAuthContextApi();
  if (!authRes.ok) return authRes.response;
  const { orgId } = authRes.context;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("eval_sweep_runs")
    .select("id, created_at, source, row_count, summary_stats")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("[eval-sweeps GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data ?? [] });
}

export async function POST(request: Request) {
  const authRes = await requireAuthContextApi();
  if (!authRes.ok) return authRes.response;
  const { orgId, userId } = authRes.context;

  let body: {
    source?: string;
    questions?: string[];
    rows?: SweepRowIn[];
    /** Aggregates: route_counts, timeout_like_count, weak_count, etc. */
    summary_stats?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  /** DB `eval_sweep_runs.source` CHECK allows only `golden` | `defence_box` — map UI aliases. */
  const sourceRaw =
    body.source === "defence_box" || body.source === "defence_box_golden" || body.source === "golden"
      ? body.source
      : "golden";
  const source = sourceRaw === "defence_box_golden" ? "defence_box" : sourceRaw;
  const rowsIn = Array.isArray(body.rows) ? body.rows : [];
  if (rowsIn.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }
  if (rowsIn.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: runInsert, error: runErr } = await supabase
    .from("eval_sweep_runs")
    .insert({
      org_id: orgId,
      created_by: userId,
      source,
      question_labels: Array.isArray(body.questions) ? body.questions : null,
      row_count: rowsIn.length,
      summary_stats: body.summary_stats && typeof body.summary_stats === "object" ? body.summary_stats : null,
    })
    .select("id")
    .single();

  if (runErr || !runInsert?.id) {
    console.error("[eval-sweeps POST run]", runErr?.message);
    return NextResponse.json({ error: runErr?.message ?? "Insert failed" }, { status: 500 });
  }

  const runId = runInsert.id as string;

  const rowPayload = rowsIn.map((r, sort_order) => ({
    run_id: runId,
    org_id: orgId,
    case_id: String(r.case_id).trim(),
    case_title: r.case_title ?? null,
    question_no: typeof r.question_no === "number" && r.question_no > 0 ? r.question_no : sort_order + 1,
    question: String(r.question ?? "").slice(0, 32000),
    answer: String(r.answer ?? "").slice(0, 240000),
    error: r.error != null && String(r.error).trim() ? String(r.error).slice(0, 8000) : null,
    duration_ms: typeof r.duration_ms === "number" ? Math.round(r.duration_ms) : null,
    weak: typeof r.weak === "boolean" ? r.weak : null,
    http_status: typeof r.http_status === "number" ? r.http_status : null,
    route_tag: r.route_tag != null && String(r.route_tag).trim() ? String(r.route_tag).trim().slice(0, 64) : null,
    row_meta:
      r.row_meta != null && typeof r.row_meta === "object" && !Array.isArray(r.row_meta)
        ? (r.row_meta as Record<string, unknown>)
        : null,
    sort_order,
  }));

  for (let i = 0; i < rowPayload.length; i += INSERT_CHUNK) {
    const chunk = rowPayload.slice(i, i + INSERT_CHUNK);
    const { error: rowErr } = await supabase.from("eval_sweep_rows").insert(chunk);
    if (rowErr) {
      console.error("[eval-sweeps POST rows]", rowErr.message);
      await supabase.from("eval_sweep_runs").delete().eq("id", runId);
      return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, runId });
}
