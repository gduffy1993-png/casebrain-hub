/**
 * Review helpers for golden / defence-box eval sweeps: filters, drift, diff.
 */

import { GOLDEN_SWEEP_QUESTIONS } from "@/lib/eval-golden-sweep";
import {
  TIMEOUT_OR_ABORT_ANSWER_RE,
  isEvalWeakAnswer,
} from "@/lib/eval-run-metadata";
import type { EvalMetaV1 } from "@/lib/eval-observability";

/** Routes that indicate grounding / pipeline fallback (worth surfacing in “Problems”). */
export const GOLDEN_FALLBACK_ROUTE_TAGS = new Set([
  "lightweight_eval_grounding_fallback",
  "lightweight_eval_interpretive_sweep_grounding_fallback",
  "full_chat_ungrounded_fallback",
]);

/** Canonical golden sweep: question_no → expected single route (strict paths). */
export const GOLDEN_STRICT_EXPECTED_ROUTE: Record<number, string> = {
  1: "strict_primary_allegation",
  2: "strict_mg6",
  4: "strict_interview",
  5: "strict_exhibit",
};

/** These questions should use full chat (not fast-eval) after routing fixes. */
export const GOLDEN_SHOULD_AVOID_LIGHTWEIGHT_EVAL = new Set([3, 6, 7, 8, 9, 10]);

const SHORT_ANSWER_CHARS = 80;

export type NormalizedSweepRow = {
  case_id: string;
  case_title: string;
  question_no: number;
  question: string;
  answer: string;
  weak: boolean;
  http_status: number;
  duration_ms: number;
  route_tag: string | null;
  ok: boolean;
  eval_meta?: EvalMetaV1 | null;
};

function pickEvalMeta(r: {
  eval_meta?: EvalMetaV1 | null;
  row_meta?: unknown | null;
}): EvalMetaV1 | null {
  if (r.eval_meta && r.eval_meta.v === 1) return r.eval_meta;
  const rm = r.row_meta;
  if (rm && typeof rm === "object" && rm !== null && "v" in rm && (rm as { v: unknown }).v === 1) {
    return rm as EvalMetaV1;
  }
  return null;
}

export function normalizeSweepRow(r: {
  case_id: string;
  case_title?: string | null;
  question_no: number;
  question: string;
  answer: string;
  weak?: boolean | null;
  http_status?: number | null;
  status?: number;
  duration_ms?: number | null;
  route_tag?: string | null;
  ok?: boolean;
  eval_meta?: EvalMetaV1 | null;
  row_meta?: unknown | null;
}): NormalizedSweepRow {
  const http =
    typeof r.http_status === "number"
      ? r.http_status
      : typeof r.status === "number"
        ? r.status
        : r.ok === false
          ? 0
          : 200;
  return {
    case_id: r.case_id,
    case_title: r.case_title ?? "",
    question_no: r.question_no,
    question: r.question,
    answer: r.answer,
    weak: Boolean(r.weak) || isEvalWeakAnswer(r.answer, { route_tag: r.route_tag ?? null }),
    http_status: http,
    duration_ms: typeof r.duration_ms === "number" ? r.duration_ms : 0,
    route_tag: r.route_tag ?? null,
    ok: r.ok !== false && http === 200,
    eval_meta: pickEvalMeta(r),
  };
}

export function isSuspiciouslyShortAnswer(answer: string, routeTag: string | null): boolean {
  const t = answer.trim();
  if (t.length >= SHORT_ANSWER_CHARS) return false;
  if (routeTag?.startsWith("strict_")) return false;
  return true;
}

/** Row belongs in “Problems only”: weak, HTTP error, fallback route, timeout-like text, or suspiciously short (non-strict). */
export function isProblemSweepRow(r: NormalizedSweepRow): boolean {
  if (r.weak || isEvalWeakAnswer(r.answer, { route_tag: r.route_tag ?? null })) return true;
  if (r.http_status !== 200) return true;
  const tag = (r.route_tag ?? "").trim();
  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) return true;
  if (TIMEOUT_OR_ABORT_ANSWER_RE.test(r.answer)) return true;
  if (isSuspiciouslyShortAnswer(r.answer, r.route_tag)) return true;
  return false;
}

export type PerQuestionSummary = {
  question_no: number;
  question_preview: string;
  row_count: number;
  weak_count: number;
  http_fail_count: number;
  avg_duration_ms: number;
  route_counts: Record<string, number>;
};

export function buildPerQuestionSummaries(
  rows: NormalizedSweepRow[],
  questions: readonly string[]
): PerQuestionSummary[] {
  return questions.map((q, i) => {
    const question_no = i + 1;
    const subset = rows.filter((r) => r.question_no === question_no);
    const weak_count = subset.filter(
      (r) => r.weak || isEvalWeakAnswer(r.answer, { route_tag: r.route_tag ?? null })
    ).length;
    const http_fail_count = subset.filter((r) => r.http_status !== 200 && r.http_status !== 0).length;
    const durations = subset.map((r) => r.duration_ms).filter((x) => x >= 0);
    const avg_duration_ms =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const route_counts: Record<string, number> = {};
    for (const r of subset) {
      const tag = (r.route_tag ?? "unknown").trim() || "unknown";
      route_counts[tag] = (route_counts[tag] ?? 0) + 1;
    }
    return {
      question_no,
      question_preview: q.length > 140 ? `${q.slice(0, 137)}…` : q,
      row_count: subset.length,
      weak_count,
      http_fail_count,
      avg_duration_ms,
      route_counts,
    };
  });
}

export function slowestSweepRows(rows: NormalizedSweepRow[], limit = 20): NormalizedSweepRow[] {
  return [...rows].sort((a, b) => b.duration_ms - a.duration_ms).slice(0, limit);
}

/** Human-readable drift warnings for canonical golden sweep. */
export function goldenSweepRouteDriftWarnings(rows: NormalizedSweepRow[]): string[] {
  const warnings: string[] = [];
  const n = GOLDEN_SWEEP_QUESTIONS.length;

  for (let qn = 1; qn <= n; qn++) {
    const subset = rows.filter((r) => r.question_no === qn);
    if (subset.length === 0) continue;

    const routes = new Map<string, number>();
    for (const r of subset) {
      const t = (r.route_tag ?? "unknown").trim() || "unknown";
      routes.set(t, (routes.get(t) ?? 0) + 1);
    }

    const expected = GOLDEN_STRICT_EXPECTED_ROUTE[qn];
    if (expected) {
      for (const [route, count] of routes) {
        if (route !== expected && route !== "unknown") {
          warnings.push(
            `Q${qn}: expected "${expected}" for all rows, but "${route}" appeared ${count}× (check routing).`
          );
        }
      }
    }

    if (GOLDEN_SHOULD_AVOID_LIGHTWEIGHT_EVAL.has(qn)) {
      const lw = routes.get("lightweight_eval") ?? 0;
      const lwf = routes.get("lightweight_eval_grounding_fallback") ?? 0;
      if (lw > 0)
        warnings.push(
          `Q${qn}: lightweight_eval ${lw}× — unexpected on interpretive rows with x-fast-eval (expect lightweight_eval_interpretive_sweep); check headers.`
        );
      if (lwf > 0)
        warnings.push(`Q${qn}: lightweight_eval_grounding_fallback ${lwf}× — review bundle grounding.`);
    }

    const timeBudget = routes.get("full_chat_time_budget") ?? 0;
    if (timeBudget > 0) {
      warnings.push(
        `Q${qn}: full_chat_time_budget ${timeBudget}× — LLM timed out or returned only empty completions; this is not the ungrounded fallback. Retry or reduce concurrent load.`
      );
    }
  }

  return warnings;
}

export type SweepComparison = {
  baseline_count: number;
  current_count: number;
  improved: NormalizedSweepRow[];
  worsened: NormalizedSweepRow[];
  new_weak: NormalizedSweepRow[];
  route_changed: Array<{
    case_id: string;
    case_title: string;
    question_no: number;
    question: string;
    route_before: string | null;
    route_after: string | null;
  }>;
};

function rowKey(r: Pick<NormalizedSweepRow, "case_id" | "question_no">): string {
  return `${r.case_id}:${r.question_no}`;
}

export function compareGoldenSweeps(
  baseline: NormalizedSweepRow[],
  current: NormalizedSweepRow[]
): SweepComparison {
  const baseMap = new Map<string, NormalizedSweepRow>();
  for (const r of baseline) baseMap.set(rowKey(r), r);

  const improved: NormalizedSweepRow[] = [];
  const worsened: NormalizedSweepRow[] = [];
  const new_weak: NormalizedSweepRow[] = [];
  const route_changed: SweepComparison["route_changed"] = [];

  for (const cur of current) {
    const prev = baseMap.get(rowKey(cur));
    const prevWeak = prev
      ? prev.weak || isEvalWeakAnswer(prev.answer, { route_tag: prev.route_tag ?? null })
      : false;
    const curWeak = cur.weak || isEvalWeakAnswer(cur.answer, { route_tag: cur.route_tag ?? null });

    if (prev) {
      if (prevWeak && !curWeak) improved.push(cur);
      if (!prevWeak && curWeak) worsened.push(cur);
      const rb = prev.route_tag ?? null;
      const ra = cur.route_tag ?? null;
      if (rb !== ra) {
        route_changed.push({
          case_id: cur.case_id,
          case_title: cur.case_title,
          question_no: cur.question_no,
          question: cur.question,
          route_before: rb,
          route_after: ra,
        });
      }
    } else if (curWeak) {
      new_weak.push(cur);
    }
  }

  return {
    baseline_count: baseline.length,
    current_count: current.length,
    improved,
    worsened,
    new_weak,
    route_changed,
  };
}
