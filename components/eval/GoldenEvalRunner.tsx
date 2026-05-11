"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GOLDEN_SWEEP_QUESTIONS, summarizeEvalRowsByQuestion } from "@/lib/eval-golden-sweep";
import {
  buildSystemicCollapseWarnings,
  sweepSemanticHints,
  type EvalMetaV1,
} from "@/lib/eval-observability";
import { buildEvalSummaryStats, isEvalWeakAnswer } from "@/lib/eval-run-metadata";
import { EvalSweepReviewPanel } from "@/components/eval/EvalSweepReviewPanel";

type CaseRow = { id: string; title?: string | null };

type EvalRow = {
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
  /** From defence-plan-chat `x-casebrain-route` */
  route_tag: string | null;
  /** From defence-plan-chat JSON `eval_meta` */
  eval_meta?: EvalMetaV1 | null;
};

/** Canonical 10-question sweep — mutable copy for indexing / saves (same strings as lib). */
const GOLDEN_QUESTIONS: string[] = [...GOLDEN_SWEEP_QUESTIONS];
/** Fast-eval is lighter than full chat but cold starts + network need headroom; 20s caused frequent false aborts. */
const QUESTION_TIMEOUT_MS = 90_000;

function formatGoldenFetchError(e: unknown, timeoutMs: number): string {
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
        })),
        GOLDEN_QUESTIONS
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
      const cases = await loadCases();
      const total = cases.length * GOLDEN_QUESTIONS.length;
      const nextRows: EvalRow[] = [];
      let done = 0;
      setProgress({ done, total, current: `Loaded ${cases.length} cases` });

      for (const c of cases) {
        for (const q of GOLDEN_QUESTIONS) {
          if (cancelRef.current) {
            setProgress((p) => ({ ...p, current: "Cancelled" }));
            setRunning(false);
            return;
          }
          const started = Date.now();
          const qn = Math.max(1, GOLDEN_QUESTIONS.indexOf(q) + 1);
          setProgress({
            done,
            total,
            current: `${c.title || c.id} — ${q}`,
          });
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), QUESTION_TIMEOUT_MS);
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
              nextRows.push({
                case_id: c.id,
                case_title: c.title || "Untitled case",
                question_no: qn,
                question: q,
                answer: text,
                ok: res.ok,
                status: res.status,
                duration_ms: Date.now() - started,
                timestamp: new Date().toISOString(),
                weak: isEvalWeakAnswer(text),
                route_tag: routeTag,
                eval_meta: em,
              });
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (e) {
            const errorText = formatGoldenFetchError(e, QUESTION_TIMEOUT_MS);
            nextRows.push({
              case_id: c.id,
              case_title: c.title || "Untitled case",
              question_no: qn,
              question: q,
              answer: errorText,
              ok: false,
              status: 0,
              duration_ms: Date.now() - started,
              timestamp: new Date().toISOString(),
              weak: isEvalWeakAnswer(errorText),
              route_tag: null,
              eval_meta: null,
            });
          }
          done += 1;
          setRows([...nextRows]);
          setProgress((p) => ({ ...p, done }));
        }
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
        const summary_stats = {
          ...buildEvalSummaryStats(
            sweepRowsForStats.map((r) => ({
              ok: r.ok,
              weak: r.weak,
              answer: r.answer,
              duration_ms: r.duration_ms,
              route_tag: r.route_tag,
            })),
            GOLDEN_QUESTIONS
          ),
          per_question: summarizeEvalRowsByQuestion(sweepRowsForStats, GOLDEN_QUESTIONS),
        };
        const saveRes = await fetch("/api/eval-sweeps", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "golden",
            questions: GOLDEN_QUESTIONS,
            summary_stats,
            rows: nextRows.map((r) => ({
              case_id: r.case_id,
              case_title: r.case_title,
              question_no: r.question_no,
              question: r.question,
              answer: r.answer,
              error: r.ok ? null : r.answer,
              duration_ms: r.duration_ms,
              weak: r.weak,
              http_status: r.status,
              route_tag: r.route_tag,
              row_meta: r.eval_meta ?? null,
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

      setProgress({ done, total, current: "Done" });
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
        per_question: summarizeEvalRowsByQuestion(sweepRowsForDownload, GOLDEN_QUESTIONS),
      },
      rows,
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
        questions={GOLDEN_QUESTIONS}
        baselineRows={baselineRows}
        onClearBaseline={() => setBaselineRows(null)}
      />
    </Card>
  );
}

