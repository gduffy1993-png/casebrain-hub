/** Shared helpers for in-app eval exports and weak filtering. */

export const TIMEOUT_OR_ABORT_ANSWER_RE =
  /timed run prevented|browser limit|signal is aborted|aborted without reason/i;

export function isEvalWeakAnswer(answer: string): boolean {
  if (!answer?.trim()) return true;
  if (TIMEOUT_OR_ABORT_ANSWER_RE.test(answer)) return true;
  const lower = answer.toLowerCase();
  return (
    lower.includes("not grounded") ||
    lower.includes("insufficient") ||
    lower.includes("unclear") ||
    answer.trim().length < 80
  );
}

export type EvalRowLike = {
  route_tag?: string | null;
  answer?: string;
  ok?: boolean;
  weak?: boolean;
  duration_ms?: number | null;
};

export function buildEvalSummaryStats(rows: EvalRowLike[], questions?: string[]) {
  const n = rows.length;
  const httpOk = rows.filter((r) => r.ok !== false).length;
  const weak = rows.filter((r) => r.weak || isEvalWeakAnswer(r.answer ?? "")).length;
  const timeoutLike = rows.filter((r) => TIMEOUT_OR_ABORT_ANSWER_RE.test(r.answer ?? "")).length;
  const durations = rows.map((r) => r.duration_ms).filter((x): x is number => typeof x === "number" && x >= 0);
  const avg_ms = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const route_counts: Record<string, number> = {};
  for (const r of rows) {
    const tag = (r.route_tag ?? "unknown").trim() || "unknown";
    route_counts[tag] = (route_counts[tag] ?? 0) + 1;
  }
  return {
    generated_at: new Date().toISOString(),
    row_count: n,
    http_ok_count: httpOk,
    weak_count: weak,
    timeout_like_count: timeoutLike,
    avg_duration_ms: avg_ms,
    route_counts,
    ...(questions?.length ? { question_labels: questions } : {}),
  };
}
