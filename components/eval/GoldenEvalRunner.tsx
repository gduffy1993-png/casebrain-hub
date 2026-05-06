"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CaseRow = { id: string; title?: string | null };

type EvalRow = {
  case_id: string;
  case_title: string;
  question: string;
  answer: string;
  ok: boolean;
  status: number;
  duration_ms: number;
  timestamp: string;
  weak: boolean;
};

const GOLDEN_QUESTIONS: string[] = [
  "What is the primary allegation in one sentence using only bundle wording?",
  "What evidence does MG5 rely on?",
  "What does MG6 say is served and outstanding?",
  "What is the key weakness in the prosecution case?",
  "What is the key weakness in the defence case?",
  "What must the prosecution prove to win?",
  "What is the strongest defence angle?",
  "What disclosure is missing right now?",
  "What should be done in the next 24 hours?",
  "What is the biggest risk at trial?",
];
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

export function GoldenEvalRunner() {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [showWeakOnly, setShowWeakOnly] = useState(false);
  const cancelRef = useRef(false);

  function isWeak(answer: string) {
    if (!answer) return true;
    const lower = answer.toLowerCase();
    return (
      lower.includes("not grounded") ||
      lower.includes("insufficient") ||
      lower.includes("unclear") ||
      answer.trim().length < 80
    );
  }

  const summary = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.ok).length;
    const weak = rows.filter((r) => r.weak).length;
    const avgMs = total > 0 ? Math.round(rows.reduce((a, r) => a + r.duration_ms, 0) / total) : 0;
    return { total, ok, weak, avgMs };
  }, [rows]);

  const displayedRows = useMemo(() => {
    if (!showWeakOnly) return rows;
    return rows.filter((r) => r.weak);
  }, [rows, showWeakOnly]);

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
              const json = (await res.json().catch(() => ({}))) as { reply?: string; ok?: boolean; error?: string };
              nextRows.push({
                case_id: c.id,
                case_title: c.title || "Untitled case",
                question: q,
                answer: typeof json.reply === "string" ? json.reply : json.error || `HTTP ${res.status}`,
                ok: res.ok,
                status: res.status,
                duration_ms: Date.now() - started,
                timestamp: new Date().toISOString(),
                weak: isWeak(typeof json.reply === "string" ? json.reply : json.error || `HTTP ${res.status}`),
              });
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (e) {
            const errorText = formatGoldenFetchError(e, QUESTION_TIMEOUT_MS);
            nextRows.push({
              case_id: c.id,
              case_title: c.title || "Untitled case",
              question: q,
              answer: errorText,
              ok: false,
              status: 0,
              duration_ms: Date.now() - started,
              timestamp: new Date().toISOString(),
              weak: isWeak(errorText),
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
    const payload = {
      generated_at: new Date().toISOString(),
      questions: GOLDEN_QUESTIONS,
      summary,
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
        Runs 10 fixed questions across all cases and stores full question/answer output.
      </p>

      <div className="flex gap-2">
        <Button onClick={runGolden} disabled={running}>
          {running ? "Running..." : "Run Golden Across All Cases"}
        </Button>
        <Button variant="outline" onClick={cancelRun} disabled={!running}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={downloadJson} disabled={rows.length === 0}>
          Download JSON
        </Button>
        <Button
          variant={showWeakOnly ? "primary" : "outline"}
          onClick={() => setShowWeakOnly((v) => !v)}
          disabled={rows.length === 0}
        >
          {showWeakOnly ? "Showing Weak Only" : "Show Weak Only"}
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
        <div>Avg time: {summary.avgMs}ms</div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b border-border text-left">
              <th className="p-2">Case</th>
              <th className="p-2">Question</th>
              <th className="p-2">Answer</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r, idx) => (
              <tr
                key={`${r.case_id}-${idx}-${r.timestamp}`}
                className={r.weak ? "bg-red-50/70 dark:bg-red-950/30 border-b border-border" : "border-b border-border"}
              >
                <td className="p-2 align-top">{r.case_title}</td>
                <td className="p-2 align-top">{r.question}</td>
                <td className="p-2 align-top whitespace-pre-wrap">{r.answer}</td>
                <td className="p-2 align-top">{r.status || (r.ok ? 200 : "ERR")}</td>
              </tr>
            ))}
            {displayedRows.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  {rows.length === 0 ? "No results yet." : "No weak answers in current run."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

