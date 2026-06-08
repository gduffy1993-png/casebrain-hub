"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildPerQuestionSummaries,
  compareGoldenSweeps,
  goldenSweepRouteDriftWarnings,
  isProblemSweepRow,
  normalizeSweepRow,
  slowestSweepRows,
  type NormalizedSweepRow,
} from "@/lib/eval-sweep-review";
import { buildSystemicCollapseWarnings, type EvalMetaV1 } from "@/lib/eval-observability";

export type ReviewEvalRow = {
  case_id: string;
  case_title: string;
  question_no: number;
  question: string;
  answer: string;
  ok: boolean;
  status: number;
  duration_ms: number;
  weak: boolean;
  route_tag: string | null;
  eval_meta?: EvalMetaV1 | null;
  row_meta?: unknown | null;
};

type ViewMode = "all" | "problems" | "by_question";

type Props = {
  rows: ReviewEvalRow[];
  questions: readonly string[];
  /** Previous run rows for comparison (same shape); set when a new run starts while rows existed. */
  baselineRows: ReviewEvalRow[] | null;
  onClearBaseline?: () => void;
};

function formatRouteCounts(rc: Record<string, number>): string {
  return Object.entries(rc)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");
}

export function EvalSweepReviewPanel({ rows, questions, baselineRows, onClearBaseline }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [expandedQ, setExpandedQ] = useState<number | "none">("none");

  const normalized = useMemo(() => rows.map((r) => normalizeSweepRow(r)), [rows]);
  const normalizedBaseline = useMemo(
    () => (baselineRows?.length ? baselineRows.map((r) => normalizeSweepRow(r)) : []),
    [baselineRows]
  );

  const perQuestion = useMemo(() => buildPerQuestionSummaries(normalized, questions), [normalized, questions]);

  const problemsOnly = useMemo(() => normalized.filter(isProblemSweepRow), [normalized]);

  const slowest = useMemo(() => slowestSweepRows(normalized, 20), [normalized]);

  const driftWarnings = useMemo(() => goldenSweepRouteDriftWarnings(normalized), [normalized]);

  const systemicWarnings = useMemo(
    () =>
      buildSystemicCollapseWarnings(
        normalized.map((r) => ({
          question_no: r.question_no,
          answer: r.answer,
          route_tag: r.route_tag,
          eval_meta: r.eval_meta ?? null,
        }))
      ),
    [normalized]
  );

  const comparison = useMemo(() => {
    if (!normalizedBaseline.length || !normalized.length) return null;
    return compareGoldenSweeps(normalizedBaseline, normalized);
  }, [normalizedBaseline, normalized]);

  const rowsByQuestion = useMemo(() => {
    const m = new Map<number, NormalizedSweepRow[]>();
    for (const r of normalized) {
      const list = m.get(r.question_no) ?? [];
      list.push(r);
      m.set(r.question_no, list);
    }
    return m;
  }, [normalized]);

  const displayedTableRows = useMemo(() => {
    if (viewMode === "problems") return problemsOnly;
    return normalized;
  }, [viewMode, problemsOnly, normalized]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-border pt-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Sweep review</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={viewMode === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("all")}
          >
            All rows ({normalized.length})
          </Button>
          <Button
            type="button"
            variant={viewMode === "problems" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("problems")}
          >
            Problems only ({problemsOnly.length})
          </Button>
          <Button
            type="button"
            variant={viewMode === "by_question" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("by_question")}
          >
            Review by question
          </Button>
        </div>
      </div>

      {driftWarnings.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100">Route drift</p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5 text-amber-900/90 dark:text-amber-50/90">
            {driftWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {comparison && (
        <div className="rounded-md border border-border px-3 py-2 text-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Compare to previous run ({comparison.baseline_count} → {comparison.current_count} rows)</p>
            {onClearBaseline && (
              <Button type="button" variant="ghost" size="sm" onClick={onClearBaseline}>
                Clear baseline
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Improved (weak → ok)</span>
              <div className="font-mono text-green-700 dark:text-green-400">{comparison.improved.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Worsened (ok → weak)</span>
              <div className="font-mono text-red-700 dark:text-red-400">{comparison.worsened.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">New weak (no prior row)</span>
              <div className="font-mono">{comparison.new_weak.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Route changes</span>
              <div className="font-mono">{comparison.route_changed.length}</div>
            </div>
          </div>
          {comparison.route_changed.length > 0 && (
            <div className="max-h-32 overflow-auto text-xs font-mono border border-border rounded p-2 bg-muted/30">
              {comparison.route_changed.slice(0, 40).map((c, i) => (
                <div key={i}>
                  Q{c.question_no} {c.case_title.slice(0, 24)} · {c.route_before ?? "—"} → {c.route_after ?? "—"}
                </div>
              ))}
              {comparison.route_changed.length > 40 && (
                <div className="text-muted-foreground">…and {comparison.route_changed.length - 40} more</div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Per-question summary</p>
        <div className="max-h-56 overflow-auto rounded-md border border-border">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-muted/80">
              <tr>
                <th className="p-2">Q</th>
                <th className="p-2">Rows</th>
                <th className="p-2">Weak</th>
                <th className="p-2">HTTP≠200</th>
                <th className="p-2">Avg ms</th>
                <th className="p-2">Routes</th>
              </tr>
            </thead>
            <tbody>
              {perQuestion.map((pq) => (
                <tr key={pq.question_no} className="border-t border-border">
                  <td className="p-2 align-top font-mono">Q{pq.question_no}</td>
                  <td className="p-2 align-top">{pq.row_count}</td>
                  <td className="p-2 align-top">{pq.weak_count}</td>
                  <td className="p-2 align-top">{pq.http_fail_count}</td>
                  <td className="p-2 align-top">{pq.avg_duration_ms}</td>
                  <td className="p-2 align-top whitespace-pre-wrap break-all">{formatRouteCounts(pq.route_counts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Slowest 20</p>
        <div className="max-h-48 overflow-auto rounded-md border border-border text-xs">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-muted/80">
              <tr>
                <th className="p-2">ms</th>
                <th className="p-2">Q</th>
                <th className="p-2">Case</th>
                <th className="p-2">Route</th>
              </tr>
            </thead>
            <tbody>
              {slowest.map((r, i) => (
                <tr key={`${r.case_id}-${r.question_no}-${i}`} className="border-t border-border">
                  <td className="p-2 font-mono">{r.duration_ms}</td>
                  <td className="p-2">{r.question_no}</td>
                  <td className="p-2 truncate max-w-[140px]" title={r.case_title}>
                    {r.case_title}
                  </td>
                  <td className="p-2 font-mono">{r.route_tag ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewMode === "by_question" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Expand a question to inspect all answers together.</p>
          {questions.map((q, idx) => {
            const qn = idx + 1;
            const list = rowsByQuestion.get(qn) ?? [];
            const open = expandedQ === qn;
            return (
              <div key={qn} className="rounded-md border border-border overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 p-2 text-left text-sm bg-muted/40 hover:bg-muted/60"
                  onClick={() => setExpandedQ(open ? "none" : qn)}
                >
                  <span className="font-medium">
                    Q{qn} ({list.length}) — {q.length > 100 ? `${q.slice(0, 97)}…` : q}
                  </span>
                  <span className="text-muted-foreground text-xs">{open ? "▼" : "▶"}</span>
                </button>
                {open && (
                  <div className="max-h-72 overflow-auto p-2 space-y-2 text-xs">
                    {list.map((nr, i) => (
                      <div key={`${nr.case_id}-${i}`} className="border-b border-border pb-2 last:border-0">
                        <div className="font-medium">
                          {nr.case_title} · {nr.route_tag ?? "—"} · {nr.duration_ms}ms · HTTP {nr.http_status}
                          {isProblemSweepRow(nr) && (
                            <span className="ml-2 text-amber-700 dark:text-amber-400">problem</span>
                          )}
                        </div>
                        <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">{nr.answer}</pre>
                        {nr.eval_meta && (
                          <details className="mt-1 text-[11px] text-muted-foreground">
                            <summary className="cursor-pointer select-none">Observability</summary>
                            <pre className="mt-1 max-h-36 overflow-auto rounded border border-border p-1 bg-muted/30 font-mono whitespace-pre-wrap">
                              {JSON.stringify(
                                {
                                  route_trace: nr.eval_meta.route_trace,
                                  grounding_metrics: nr.eval_meta.grounding_metrics,
                                  fingerprint: nr.eval_meta.answer_fingerprint,
                                },
                                null,
                                2
                              )}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(viewMode === "all" || viewMode === "problems") && (
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border text-left">
                <th className="p-2">Case</th>
                <th className="p-2">Q#</th>
                <th className="p-2">Route</th>
                <th className="p-2">Question</th>
                <th className="p-2">Answer</th>
                <th className="p-2">HTTP</th>
              </tr>
            </thead>
            <tbody>
              {displayedTableRows.map((r, idx) => (
                <tr
                  key={`${r.case_id}-${r.question_no}-${idx}`}
                  className={
                    isProblemSweepRow(r)
                      ? "bg-amber-500/10 dark:bg-amber-950/20 border-b border-border"
                      : "border-b border-border"
                  }
                >
                  <td className="p-2 align-top">{r.case_title}</td>
                  <td className="p-2 align-top">{r.question_no}</td>
                  <td className="p-2 align-top font-mono text-xs">{r.route_tag ?? "—"}</td>
                  <td className="p-2 align-top">{questions[r.question_no - 1] ?? r.question}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">
                    {r.answer}
                    {r.eval_meta && (
                      <details className="mt-1 text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none">Observability</summary>
                        <pre className="mt-1 max-h-36 overflow-auto rounded border border-border p-1 bg-muted/30 font-mono whitespace-pre-wrap">
                          {JSON.stringify(
                            {
                              route_trace: r.eval_meta.route_trace,
                              grounding_metrics: r.eval_meta.grounding_metrics,
                              fingerprint: r.eval_meta.answer_fingerprint,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="p-2 align-top">{r.http_status}</td>
                </tr>
              ))}
              {displayedTableRows.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No rows match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
