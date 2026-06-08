"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildGoldenSweepRegressionMeta,
  GOLDEN_SWEEP_QUESTIONS,
  summarizeEvalRowsByQuestion,
} from "@/lib/eval-golden-sweep";
import { bulkEvalBuildAugmentedRows } from "@/lib/bulk-eval-result-present";
import { sortCasesForEvalScan } from "@/lib/eval-case-sort";
import {
  buildEvalSummaryStats,
} from "@/lib/eval-run-metadata";
import { EvalSweepReviewPanel } from "@/components/eval/EvalSweepReviewPanel";
import {
  GOLDEN_QUESTIONS,
  goldenSweepRowsToBulkInput,
  runGoldenSweepForCases,
  type GoldenSweepEvalRow,
} from "@/lib/eval/golden-sweep-client";

type CaseRow = { id: string; title?: string | null };

type EvalRow = GoldenSweepEvalRow;

type RecentRun = { id: string; created_at: string; source: string; row_count: number };

export function GoldenEvalRunner() {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<EvalRow[]>([]);
  /** Snapshot taken when a new run starts — compared to the completed run in EvalSweepReviewPanel. */
  const [baselineRows, setBaselineRows] = useState<EvalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const refreshRecentRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/eval-sweeps", { credentials: "include", cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { runs?: RecentRun[] };
      if (res.ok && Array.isArray(json.runs)) setRecentRuns(json.runs);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    void refreshRecentRuns();
  }, [refreshRecentRuns]);

  async function downloadServerRun(runId: string) {
    try {
      const res = await fetch(`/api/eval-sweeps/${runId}`, { credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) return;
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eval-sweep-${runId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // non-fatal
    }
  }

  const summary = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.ok).length;
    const weak = rows.filter((r) => r.weak).length;
    const avgMs = total > 0 ? Math.round(rows.reduce((a, r) => a + r.duration_ms, 0) / total) : 0;
    return { total, ok, weak, avgMs };
  }, [rows]);

  const runMeta = useMemo(
    () =>
      buildEvalSummaryStats(
        rows.map((r) => ({
          ok: r.ok,
          weak: r.weak,
          answer: r.answer,
          duration_ms: r.duration_ms,
          route_tag: r.route_tag,
          question_no: r.question_no,
        })),
        [...GOLDEN_QUESTIONS]
      ),
    [rows]
  );

  async function loadCases(): Promise<CaseRow[]> {
    const res = await fetch("/api/cases", { credentials: "include", cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { cases?: CaseRow[]; error?: string };
    if (!res.ok) {
      throw new Error(json?.error || "Failed to load cases");
    }
    return Array.isArray(json.cases) ? json.cases : [];
  }

  async function runGolden() {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setError(null);
    setBaselineRows(rows.length > 0 ? [...rows] : null);
    setRows([]);
    setProgress({ done: 0, total: 0, current: "Loading cases..." });

    try {
      const cases = sortCasesForEvalScan(await loadCases());
      const total = cases.length * GOLDEN_QUESTIONS.length;
      const buffer: EvalRow[] = [];
      setProgress({ done: 0, total, current: `Loaded ${cases.length} cases` });

      const nextRows = await runGoldenSweepForCases(cases, {
        shouldCancel: () => cancelRef.current,
        onRow: (row, { done, total: t }) => {
          buffer.push(row);
          setRows([...buffer]);
          setProgress({ done, total: t, current: `${row.case_title} — ${row.question}` });
        },
        onProgress: (p) => setProgress(p),
      });

      if (cancelRef.current) {
        setProgress((p) => ({ ...p, current: "Cancelled" }));
        return;
      }

      try {
        localStorage.setItem(
          "golden-eval:last-run",
          JSON.stringify({
            created_at: new Date().toISOString(),
            total: nextRows.length,
            rows: nextRows,
          })
        );
      } catch {
        // non-fatal
      }

      try {
        const sweepRowsForStats = nextRows.map((r) => ({
          questionNo: r.question_no,
          ok: r.ok,
          weak: r.weak,
          answer: r.answer,
          duration_ms: r.duration_ms,
          route_tag: r.route_tag,
        }));
        const bulkRows = goldenSweepRowsToBulkInput(nextRows);
        const { rows_augmented, final_summary } = bulkEvalBuildAugmentedRows(bulkRows, "golden_10");
        const summary_stats = {
          ...buildEvalSummaryStats(
            sweepRowsForStats.map((r) => ({
              ok: r.ok,
              weak: r.weak,
              answer: r.answer,
              duration_ms: r.duration_ms,
              route_tag: r.route_tag,
            })),
            [...GOLDEN_QUESTIONS]
          ),
          per_question: summarizeEvalRowsByQuestion(sweepRowsForStats, [...GOLDEN_QUESTIONS]),
          final_quality_summary: { ...final_summary, main_issue: final_summary.mainIssue },
          ...buildGoldenSweepRegressionMeta(),
        };
        const saveRes = await fetch("/api/eval-sweeps", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "golden",
            questions: GOLDEN_QUESTIONS,
            summary_stats,
            rows: rows_augmented.map((r) => ({
              case_id: r.caseId,
              case_title: r.caseTitle,
              question_no: r.questionNo,
              question: r.question,
              answer: r.answer,
              error: r.ok ? null : (r.error ?? r.answer),
              duration_ms: r.duration_ms,
              weak: r.weak,
              http_status: r.http_status,
              route_tag: r.route_tag,
              row_meta:
                r.eval_meta && typeof r.eval_meta === "object"
                  ? {
                      ...(r.eval_meta as Record<string, unknown>),
                      ui_final_quality: r.final_quality,
                      ui_final_issue: r.final_issue,
                      ui_final_collapse_rule: r.final_collapse_rule,
                    }
                  : {
                      ui_final_quality: r.final_quality,
                      ui_final_issue: r.final_issue,
                      ui_final_collapse_rule: r.final_collapse_rule,
                    },
            })),
          }),
        });
        const saved = (await saveRes.json().catch(() => ({}))) as { ok?: boolean; runId?: string; error?: string };
        if (saveRes.ok && saved.runId) {
          setCloudMessage(`Saved to workspace (${saved.runId.slice(0, 8)}…)`);
          void refreshRecentRuns();
        } else {
          setCloudMessage(saved.error ? `Cloud save failed: ${saved.error}` : "Cloud save failed.");
        }
      } catch {
        setCloudMessage("Cloud save failed (offline?). Download JSON locally.");
      }

      setProgress({ done: nextRows.length, total, current: "Done" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  function cancelRun() {
    cancelRef.current = true;
  }

  function downloadJson() {
    if (rows.length === 0) return;
    const bulkRows = goldenSweepRowsToBulkInput(rows);
    const { rows_augmented, final_summary } = bulkEvalBuildAugmentedRows(bulkRows, "golden_10");
    const sweepRowsForDownload = rows.map((r) => ({
      questionNo: r.question_no,
      ok: r.ok,
      weak: r.weak,
      answer: r.answer,
      duration_ms: r.duration_ms,
      route_tag: r.route_tag,
    }));
    const payload = {
      generated_at: new Date().toISOString(),
      questions: GOLDEN_QUESTIONS,
      summary,
      summary_stats: {
        ...runMeta,
        per_question: summarizeEvalRowsByQuestion(sweepRowsForDownload, [...GOLDEN_QUESTIONS]),
        final_quality_summary: { ...final_summary, main_issue: final_summary.mainIssue },
        ...buildGoldenSweepRegressionMeta(),
      },
      rows: rows.map((r, i) => ({
        ...r,
        final_quality: rows_augmented[i]!.final_quality,
        final_issue: rows_augmented[i]!.final_issue,
        final_collapse_rule: rows_augmented[i]!.final_collapse_rule,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `golden-eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Golden Eval Runner</h2>
      <p className="text-sm text-muted-foreground">
        Runs 10 fixed questions across all cases. Each finished run is saved to your org (Supabase) — download anytime below or use
        Download JSON for a local copy.
      </p>

      {cloudMessage && <p className="text-xs text-muted-foreground">{cloudMessage}</p>}

      {recentRuns.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="font-medium text-foreground">Recent saved runs</p>
          <ul className="max-h-24 overflow-auto space-y-1 text-muted-foreground">
            {recentRuns.slice(0, 8).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {new Date(r.created_at).toLocaleString()} · {r.row_count} rows · {r.source}
                </span>
                <button
                  type="button"
                  className="text-primary underline hover:no-underline"
                  onClick={() => void downloadServerRun(r.id)}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={runGolden} disabled={running}>
          {running ? "Running..." : "Run Golden Across All Cases"}
        </Button>
        <Button variant="outline" onClick={cancelRun} disabled={!running}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={downloadJson} disabled={rows.length === 0}>
          Download JSON
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="text-sm">
        <div>
          Progress: {progress.done}/{progress.total}
        </div>
        <div className="text-muted-foreground truncate">{progress.current}</div>
      </div>

      <div className="text-sm">
        <div>Total answers: {summary.total}</div>
        <div>HTTP OK: {summary.ok}</div>
        <div>Weak answers: {summary.weak}</div>
        <div>Timeout-like: {runMeta.timeout_like_count}</div>
        <div>Avg time: {summary.avgMs}ms</div>
        <div className="text-muted-foreground truncate" title={JSON.stringify(runMeta.route_counts)}>
          Routes: {Object.entries(runMeta.route_counts)
            .map(([k, v]) => `${k}:${v}`)
            .join(" · ")}
        </div>
      </div>

      <EvalSweepReviewPanel
        rows={rows}
        questions={GOLDEN_SWEEP_QUESTIONS}
        baselineRows={baselineRows}
        onClearBaseline={() => setBaselineRows(null)}
      />
    </Card>
  );
}
