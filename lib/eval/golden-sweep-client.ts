/**
 * Client-side golden 10-question sweep executor (shared by GoldenEvalRunner and EvalPackRunner).
 * Does not change server routing or scoring — only sequences HTTP calls.
 */

import { GOLDEN_SWEEP_QUESTIONS } from "@/lib/eval-golden-sweep";
import type { EvalMetaV1 } from "@/lib/eval-observability";
import { isEvalWeakAnswer } from "@/lib/eval-run-metadata";

export const GOLDEN_QUESTIONS: readonly string[] = [...GOLDEN_SWEEP_QUESTIONS];

export const GOLDEN_QUESTION_TIMEOUT_MS = 90_000;

export type GoldenSweepCase = { id: string; title?: string | null };

export type GoldenSweepEvalRow = {
  case_id: string;
  case_title: string;
  question_no: number;
  question: string;
  answer: string;
  ok: boolean;
  status: number;
  duration_ms: number;
  timestamp: string;
  weak: boolean;
  route_tag: string | null;
  eval_meta?: EvalMetaV1 | null;
};

export function formatGoldenFetchError(e: unknown, timeoutMs: number): string {
  if (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") {
    return `Timed out after ${Math.round(timeoutMs / 1000)}s (browser limit).`;
  }
  if (e instanceof Error) {
    if (e.name === "AbortError" || /signal is aborted|aborted without reason/i.test(e.message)) {
      return `Timed out after ${Math.round(timeoutMs / 1000)}s (browser limit).`;
    }
    return e.message;
  }
  return String(e);
}

export async function runGoldenSweepForCases(
  cases: GoldenSweepCase[],
  opts: {
    shouldCancel: () => boolean;
    onRow: (row: GoldenSweepEvalRow, state: { done: number; total: number }) => void;
    onProgress: (state: { done: number; total: number; current: string }) => void;
    timeoutMs?: number;
  }
): Promise<GoldenSweepEvalRow[]> {
  const timeoutMs = opts.timeoutMs ?? GOLDEN_QUESTION_TIMEOUT_MS;
  const total = cases.length * GOLDEN_QUESTIONS.length;
  const nextRows: GoldenSweepEvalRow[] = [];
  let done = 0;
  opts.onProgress({ done, total, current: `Running ${cases.length} cases × ${GOLDEN_QUESTIONS.length} questions` });

  for (const c of cases) {
    /**
     * Skip the rest of a case's questions when the case has been deleted/archived
     * mid-run. Without this we waste 10 "Case not found" rows per missing case
     * and the sweep summary inherits noise that looks like a real eval failure.
     */
    let caseMissing = false;
    for (const q of GOLDEN_QUESTIONS) {
      if (opts.shouldCancel()) {
        opts.onProgress({ done, total, current: "Cancelled" });
        return nextRows;
      }
      const started = Date.now();
      const qn = Math.max(1, GOLDEN_QUESTIONS.indexOf(q) + 1);
      if (caseMissing) {
        const skipText = "Case skipped: case_id no longer resolves (likely deleted/archived between case-list snapshot and run).";
        const skippedRow: GoldenSweepEvalRow = {
          case_id: c.id,
          case_title: c.title || "Untitled case",
          question_no: qn,
          question: q,
          answer: skipText,
          ok: false,
          status: 404,
          duration_ms: 0,
          timestamp: new Date().toISOString(),
          weak: false,
          route_tag: "case_not_found_skipped",
          eval_meta: null,
        };
        nextRows.push(skippedRow);
        done += 1;
        opts.onRow(skippedRow, { done, total });
        continue;
      }
      opts.onProgress({
        done,
        total,
        current: `${c.title || c.id} — ${q}`,
      });
      let row: GoldenSweepEvalRow;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(`/api/criminal/${c.id}/defence-plan-chat`, {
            method: "POST",
            credentials: "include",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "x-fast-eval": "1",
              "x-eval-mode": "1",
            },
            body: JSON.stringify({ message: q }),
          });
          const routeTag = res.headers.get("x-casebrain-route")?.trim() || null;
          const json = (await res.json().catch(() => ({}))) as {
            reply?: string;
            ok?: boolean;
            error?: string;
            eval_meta?: EvalMetaV1;
          };
          const text =
            typeof json.reply === "string" ? json.reply : json.error || `HTTP ${res.status}`;
          const em = json.eval_meta && json.eval_meta.v === 1 ? json.eval_meta : null;
          if (res.status === 404 && /case not found/i.test(text)) {
            caseMissing = true;
          }
          row = {
            case_id: c.id,
            case_title: c.title || "Untitled case",
            question_no: qn,
            question: q,
            answer: text,
            ok: res.ok,
            status: res.status,
            duration_ms: Date.now() - started,
            timestamp: new Date().toISOString(),
            weak: isEvalWeakAnswer(text, { route_tag: routeTag }),
            route_tag: routeTag,
            eval_meta: em,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (e) {
        const errorText = formatGoldenFetchError(e, timeoutMs);
        row = {
          case_id: c.id,
          case_title: c.title || "Untitled case",
          question_no: qn,
          question: q,
          answer: errorText,
          ok: false,
          status: 0,
          duration_ms: Date.now() - started,
          timestamp: new Date().toISOString(),
          weak: isEvalWeakAnswer(errorText, { route_tag: null }),
          route_tag: null,
          eval_meta: null,
        };
      }
      nextRows.push(row);
      done += 1;
      opts.onRow(row, { done, total });
    }
  }
  opts.onProgress({ done, total, current: "Done" });
  return nextRows;
}

export function goldenSweepRowsToBulkInput(rows: GoldenSweepEvalRow[]) {
  return rows.map((r) => ({
    caseId: r.case_id,
    caseTitle: r.case_title,
    questionNo: r.question_no,
    question: r.question,
    answer: r.answer,
    error: r.ok ? undefined : r.answer,
    ok: r.ok,
    http_status: r.status,
    weak: r.weak,
    route_tag: r.route_tag,
    eval_meta: r.eval_meta ?? null,
    duration_ms: r.duration_ms,
    timestamp: r.timestamp,
  }));
}
