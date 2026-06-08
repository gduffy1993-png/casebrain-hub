/** Shared helpers for in-app eval exports and weak filtering. */

export const TIMEOUT_OR_ABORT_ANSWER_RE =
  /timed run prevented|browser limit|signal is aborted|aborted without reason|unable to generate response in time/i;

/** Northshire exhibit list from strict_exhibit often has many short lines — do not score as weak. */
function looksLikeNorthshireStrictExhibitList(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 28) return false;
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  const withEx = lines.filter((l) => /\bEX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/i.test(l));
  const withNs = lines.filter((l) => /\bNS-CPS-20\d{2}-\d{4}\b/i.test(l));
  return withEx.length >= 2 || (withEx.length >= 1 && withNs.length >= 1);
}

export function isEvalWeakAnswer(
  answer: string,
  opts?: { route_tag?: string | null }
): boolean {
  if (!answer?.trim()) return true;
  if (TIMEOUT_OR_ABORT_ANSWER_RE.test(answer)) return true;

  const tag = (opts?.route_tag ?? "").trim();
  if (tag === "strict_exhibit" || looksLikeNorthshireStrictExhibitList(answer)) {
    return false;
  }

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
  const weak = rows.filter(
    (r) => r.weak || isEvalWeakAnswer(r.answer ?? "", { route_tag: r.route_tag ?? null })
  ).length;
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
