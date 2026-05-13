"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { bulkEvalBuildAugmentedRows } from "@/lib/bulk-eval-result-present";
import { EvalSweepReviewPanel, type ReviewEvalRow } from "@/components/eval/EvalSweepReviewPanel";
import {
  buildCursorEvalFixBrief,
  buildPackRunSummaryStatsForSave,
  summarizePackGoldenRun,
  type PackGoldenMatrixRow,
} from "@/lib/eval-pack-run-summary";
import {
  GOLDEN_QUESTIONS,
  goldenSweepRowsToBulkInput,
  runGoldenSweepForCases,
  type GoldenSweepEvalRow,
} from "@/lib/eval/golden-sweep-client";
import { GOLDEN_SWEEP_QUESTIONS } from "@/lib/eval-golden-sweep";
import { sortCasesForEvalScan } from "@/lib/eval-case-sort";
import {
  EVAL_PACK_IDS,
  EVAL_PACK_LABELS,
  parseEvalPackId,
  resolveCaseEvalPack,
  type EvalPackId,
} from "@/lib/eval-packs";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";
import { PackImportModal, type PackImportCompleteSummary } from "@/components/eval/PackImportModal";

type CaseApiRow = {
  id: string;
  title?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  eval_case_no?: number | null;
  /** First document filename (earliest `created_at`) when `GET /api/cases?eval_doc_hints=1`. */
  eval_doc_hint?: string | null;
};

const CASES_LIST_EVAL_URL = "/api/cases?eval_doc_hints=1";

function existingTaggedPackSlots(cases: CaseApiRow[], packId: EvalPackId): Set<number> {
  const s = new Set<number>();
  for (const c of cases) {
    if (parseEvalPackId(c.eval_pack_id) !== packId) continue;
    const n = c.eval_case_no;
    if (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 40) s.add(Math.round(n));
  }
  return s;
}

async function fetchCasesForEval(): Promise<CaseApiRow[]> {
  const res = await fetch(CASES_LIST_EVAL_URL, { credentials: "include", cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as { cases?: CaseApiRow[]; error?: string };
  if (!res.ok) throw new Error(json?.error || "Failed to load cases");
  return Array.isArray(json.cases) ? json.cases : [];
}

function packStatsFor(list: CaseApiRow[], packId: EvalPackId): {
  total: number;
  tagged: number;
  inferredTitle: number;
  inferredDoc: number;
} {
  let total = 0;
  let tagged = 0;
  let inferredTitle = 0;
  let inferredDoc = 0;
  for (const c of list) {
    const r = resolveCaseEvalPack(c);
    if (!r || r.pack_id !== packId) continue;
    total += 1;
    if (r.source === "db") tagged += 1;
    else if (r.source === "inferred_title") inferredTitle += 1;
    else inferredDoc += 1;
  }
  return { total, tagged, inferredTitle, inferredDoc };
}

function toReviewRows(rows: GoldenSweepEvalRow[]): ReviewEvalRow[] {
  return rows.map((r) => ({
    case_id: r.case_id,
    case_title: r.case_title,
    question_no: r.question_no,
    question: r.question,
    answer: r.answer,
    ok: r.ok,
    status: r.status,
    duration_ms: r.duration_ms,
    weak: r.weak,
    route_tag: r.route_tag,
    eval_meta: r.eval_meta ?? null,
  }));
}

function formatRouteCounts(rc: Record<string, number>): string {
  return Object.entries(rc)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(" · ");
}

function groupCasesByPack(caseRows: CaseApiRow[]): Map<EvalPackId, CaseApiRow[]> {
  const m = new Map<EvalPackId, CaseApiRow[]>();
  for (const id of EVAL_PACK_IDS) m.set(id, []);
  const sorted = sortCasesForEvalScan(caseRows.map((c) => ({ id: c.id, title: c.title ?? undefined })));
  const orderIndex = new Map(sorted.map((c, i) => [c.id, i]));
  for (const c of caseRows) {
    const eff = resolveCaseEvalPack(c);
    if (!eff) continue;
    m.get(eff.pack_id)?.push(c);
  }
  for (const id of EVAL_PACK_IDS) {
    const list = m.get(id)!;
    list.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  }
  return m;
}

export function EvalPackRunner() {
  const { isOwner, bypassActive } = usePaywallStatus();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const OWNER_USER_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID ? [process.env.NEXT_PUBLIC_ADMIN_USER_ID] : [];
  const OWNER_EMAILS = ["gduffy1993@gmail.com"];

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) setUser({ id: u.id, email: u.email ?? undefined });
    })();
  }, []);

  const isOwnerHardcoded =
    (user?.id && OWNER_USER_IDS.includes(user.id)) ||
    (user?.email && OWNER_EMAILS.includes(user.email.toLowerCase()));
  const showRunner = isOwnerHardcoded || isOwner || bypassActive;

  const [cases, setCases] = useState<CaseApiRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPacks, setSelectedPacks] = useState<Set<EvalPackId>>(() => new Set(EVAL_PACK_IDS));
  const [running, setRunning] = useState(false);
  const [matrix, setMatrix] = useState<PackGoldenMatrixRow[]>([]);
  const [detailPackId, setDetailPackId] = useState<EvalPackId | null>(null);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [fixBrief, setFixBrief] = useState<string | null>(null);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const cancelRef = useRef(false);
  const stopAfterCurrentPackRef = useRef(false);
  const [progress, setProgress] = useState({
    currentPack: null as EvalPackId | null,
    packIndex: 0,
    packTotal: 0,
    doneInRun: 0,
    totalInRun: 0,
    currentLabel: "",
  });

  const [importModalPack, setImportModalPack] = useState<EvalPackId | null>(null);

  const refreshCases = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(CASES_LIST_EVAL_URL, { credentials: "include", cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { cases?: CaseApiRow[]; error?: string };
      if (!res.ok) throw new Error(json?.error || "Failed to load cases");
      setCases(Array.isArray(json.cases) ? json.cases : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setCases([]);
    }
  }, []);

  const onPackImportComplete = useCallback(
    async (s: PackImportCompleteSummary) => {
      try {
        await refreshCases();
        const list = await fetchCasesForEval();
        const st = packStatsFor(list, s.packId);
        const inf = st.inferredTitle + st.inferredDoc;
        const parts = [
          `Pack ${s.packId} imported: created ${s.created}, updated ${s.updated}, skipped ${s.skipped}.`,
          `Pack ${s.packId} — ${st.total} cases (tagged ${st.tagged} / inferred ${inf}).`,
        ];
        if (s.errors.length) parts.push(`Errors: ${s.errors.slice(0, 8).join(" · ")}`);
        if (s.warnings.length) parts.push(`Warnings: ${s.warnings.slice(0, 8).join(" · ")}`);
        setCloudMessage(parts.join(" "));
      } catch (e) {
        setCloudMessage(e instanceof Error ? e.message : String(e));
      }
    },
    [refreshCases]
  );

  useEffect(() => {
    if (showRunner) void refreshCases();
  }, [showRunner, refreshCases]);

  const casesByPack = useMemo(() => groupCasesByPack(cases), [cases]);

  const counts = useMemo(() => {
    const o: Record<EvalPackId, number> = {} as Record<EvalPackId, number>;
    for (const id of EVAL_PACK_IDS) o[id] = casesByPack.get(id)?.length ?? 0;
    return o;
  }, [casesByPack]);

  const packDiagnostics = useMemo(() => {
    const m = new Map<
      EvalPackId,
      { total: number; tagged: number; inferredTitle: number; inferredDoc: number }
    >();
    for (const id of EVAL_PACK_IDS) {
      m.set(id, { total: 0, tagged: 0, inferredTitle: 0, inferredDoc: 0 });
    }
    for (const c of cases) {
      const r = resolveCaseEvalPack(c);
      if (!r) continue;
      const cur = m.get(r.pack_id)!;
      cur.total += 1;
      if (r.source === "db") cur.tagged += 1;
      else if (r.source === "inferred_title") cur.inferredTitle += 1;
      else cur.inferredDoc += 1;
    }
    return m;
  }, [cases]);

  function togglePack(id: EvalPackId) {
    setSelectedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPacks() {
    setSelectedPacks(new Set(EVAL_PACK_IDS));
  }

  function selectPacksWithCases() {
    const next = new Set<EvalPackId>();
    for (const id of EVAL_PACK_IDS) {
      if ((counts[id] ?? 0) > 0) next.add(id);
    }
    setSelectedPacks(next);
  }

  async function runEvalPackBackfill() {
    setBackfillBusy(true);
    setCloudMessage(null);
    try {
      const res = await fetch("/api/cases/eval-pack-backfill", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        updated?: number;
        scanned?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setCloudMessage(json.error || "Backfill failed");
        return;
      }
      setCloudMessage(
        `Backfill: updated ${json.updated ?? 0} of ${json.scanned ?? 0} untagged cases.${json.message ? ` ${json.message}` : ""}`
      );
      await refreshCases();
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfillBusy(false);
    }
  }

  async function savePackSweep(packId: EvalPackId, caseCount: number, rows: GoldenSweepEvalRow[]) {
    const bulkRows = goldenSweepRowsToBulkInput(rows);
    const { rows_augmented } = bulkEvalBuildAugmentedRows(bulkRows, "golden_10");
    const summary_stats = {
      ...buildPackRunSummaryStatsForSave(rows),
      eval_pack_id: packId,
      eval_pack_name: EVAL_PACK_LABELS[packId],
      eval_pack_runner: true,
      eval_pack_case_count: caseCount,
    };
    const saveRes = await fetch("/api/eval-sweeps", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "golden",
        questions: [...GOLDEN_SWEEP_QUESTIONS],
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
    if (!saveRes.ok || !saved.runId) {
      throw new Error(saved.error || saveRes.statusText || "Cloud save failed");
    }
    return saved.runId as string;
  }

  async function runPacks(mode: "selected" | "all") {
    if (running) return;
    cancelRef.current = false;
    stopAfterCurrentPackRef.current = false;
    setRunning(true);
    setCloudMessage(null);
    setMatrix([]);
    setFixBrief(null);
    setDetailPackId(null);

    let latestCases: CaseApiRow[] = [];
    try {
      const res = await fetch(CASES_LIST_EVAL_URL, { credentials: "include", cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { cases?: CaseApiRow[]; error?: string };
      if (!res.ok) throw new Error(json?.error || "Failed to load cases");
      latestCases = Array.isArray(json.cases) ? json.cases : [];
      setCases(latestCases);
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : String(e));
      setRunning(false);
      return;
    }

    const byPack = groupCasesByPack(latestCases);
    const countLocal = (id: EvalPackId) => byPack.get(id)?.length ?? 0;

    const ordered = [...EVAL_PACK_IDS];
    const packsToRun =
      mode === "all"
        ? ordered.filter((id) => countLocal(id) > 0)
        : ordered.filter((id) => selectedPacks.has(id) && countLocal(id) > 0);

    if (packsToRun.length === 0) {
      setCloudMessage("No packs with cases to run (tag uploads or use filename patterns).");
      setRunning(false);
      return;
    }

    const totalInRun = packsToRun.reduce((acc, id) => acc + countLocal(id) * GOLDEN_QUESTIONS.length, 0);
    let doneInRun = 0;
    const matrixOut: PackGoldenMatrixRow[] = [];
    const saveNotes: string[] = [];

    try {
      for (let pi = 0; pi < packsToRun.length; pi++) {
        if (cancelRef.current) break;
        const packId = packsToRun[pi]!;
        const packCases = byPack.get(packId) ?? [];
        const sweepCases = packCases.map((c) => ({ id: c.id, title: c.title }));

        const packRowTotal = packCases.length * GOLDEN_QUESTIONS.length;
        const runStartDone = doneInRun;

        setProgress({
          currentPack: packId,
          packIndex: pi + 1,
          packTotal: packsToRun.length,
          doneInRun,
          totalInRun,
          currentLabel: `Pack ${packId}: starting ${packCases.length} cases`,
        });

        const rows = await runGoldenSweepForCases(sweepCases, {
          shouldCancel: () => cancelRef.current,
          onRow: (_row, { done, total }) => {
            setProgress({
              currentPack: packId,
              packIndex: pi + 1,
              packTotal: packsToRun.length,
              doneInRun: runStartDone + done,
              totalInRun,
              currentLabel: `Pack ${packId}: ${done}/${total} answers`,
            });
          },
          onProgress: (p) => {
            setProgress({
              currentPack: packId,
              packIndex: pi + 1,
              packTotal: packsToRun.length,
              doneInRun: runStartDone,
              totalInRun,
              currentLabel: p.current,
            });
          },
        });

        doneInRun += rows.length;

        if (cancelRef.current && rows.length < packRowTotal) {
          setCloudMessage([...saveNotes, "Run cancelled mid-pack."].join(" "));
          break;
        }

        const summaryRow = summarizePackGoldenRun(
          packId,
          EVAL_PACK_LABELS[packId],
          packCases.length,
          rows
        );
        matrixOut.push(summaryRow);
        setMatrix([...matrixOut]);

        try {
          const runId = await savePackSweep(packId, packCases.length, rows);
          saveNotes.push(`Pack ${packId} saved (${runId.slice(0, 8)}…).`);
          setCloudMessage(saveNotes.join(" "));
        } catch (e) {
          saveNotes.push(
            `Pack ${packId} in-memory only — save failed: ${e instanceof Error ? e.message : String(e)}.`
          );
          setCloudMessage(saveNotes.join(" "));
        }

        if (stopAfterCurrentPackRef.current) {
          stopAfterCurrentPackRef.current = false;
          saveNotes.push(`Stopped after pack ${packId}.`);
          setCloudMessage(saveNotes.join(" "));
          break;
        }
      }

      setProgress((p) => ({ ...p, currentLabel: "Done", currentPack: null }));
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      cancelRef.current = false;
    }
  }

  function cancelRun() {
    cancelRef.current = true;
  }

  function stopAfterCurrentPack() {
    stopAfterCurrentPackRef.current = true;
  }

  function copyFixBrief() {
    const text = buildCursorEvalFixBrief(matrix);
    setFixBrief(text);
    void navigator.clipboard.writeText(text).catch(() => {});
  }

  const detailMatrix = detailPackId ? matrix.find((m) => m.pack_id === detailPackId) : null;
  const weakOnlyExamples = detailMatrix?.rows.filter((r) => r.weak).slice(0, 12) ?? [];

  if (!showRunner) return null;

  return (
    <Card className="p-4 space-y-4 mt-6">
      <div>
        <h2 className="text-lg font-semibold">Eval Pack Runner (internal)</h2>
        <p className="text-sm text-muted-foreground">
          Runs Golden 10 per eval pack (A–J), one pack at a time, with a separate saved sweep per pack. Counts use{" "}
          <code className="text-xs">eval_pack_*</code> when set, then title patterns, then the earliest document filename
          per case.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void refreshCases()} disabled={running}>
          Refresh case counts
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void runEvalPackBackfill()}
          disabled={running || backfillBusy}
        >
          {backfillBusy ? "Backfilling…" : "Backfill pack tags (owner)"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={selectAllPacks} disabled={running}>
          Select all packs
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={selectPacksWithCases} disabled={running}>
          Select packs with cases
        </Button>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <div className="grid gap-2 text-sm">
        {EVAL_PACK_IDS.map((id) => {
          const d = packDiagnostics.get(id)!;
          const inf = d.inferredTitle + d.inferredDoc;
          const detail =
            d.inferredTitle > 0 && d.inferredDoc > 0
              ? `title ${d.inferredTitle} · doc ${d.inferredDoc}`
              : d.inferredTitle > 0
                ? `title ${d.inferredTitle}`
                : d.inferredDoc > 0
                  ? `doc ${d.inferredDoc}`
                  : null;
          const n = counts[id] ?? 0;
          return (
            <div
              key={id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPacks.has(id)}
                  onChange={() => togglePack(id)}
                  disabled={running}
                />
                <span className="shrink-0 font-mono font-medium">Pack {id}</span>
                <span className="text-muted-foreground min-w-0 text-xs leading-tight">
                  — {d.total} cases (tagged {d.tagged} / inferred {inf}
                  {detail ? ` · ${detail}` : ""})
                </span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setImportModalPack(id)}
                disabled={running}
              >
                {n > 0 ? "Import / replace pack" : "Import pack"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void runPacks("selected")} disabled={running}>
          {running ? "Running…" : "Run selected packs"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void runPacks("all")} disabled={running}>
          Run all packs (A–J with cases)
        </Button>
        <Button type="button" variant="outline" onClick={cancelRun} disabled={!running}>
          Cancel
        </Button>
        <Button type="button" variant="outline" onClick={stopAfterCurrentPack} disabled={!running}>
          Stop after current pack
        </Button>
        <Button type="button" variant="outline" onClick={copyFixBrief} disabled={matrix.length === 0}>
          Generate Cursor Fix Brief
        </Button>
      </div>

      {cloudMessage && <p className="text-xs text-muted-foreground">{cloudMessage}</p>}

      <div className="text-sm space-y-1">
        <div>
          Overall progress: {progress.doneInRun}/{progress.totalInRun || "—"}
        </div>
        <div>
          Pack progress: {progress.packTotal ? `${progress.packIndex}/${progress.packTotal}` : "—"}
          {progress.currentPack ? ` — current pack ${progress.currentPack}` : ""}
        </div>
        <div className="text-muted-foreground truncate">{progress.currentLabel}</div>
      </div>

      {matrix.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Pack results matrix</h3>
          <div className="max-h-72 overflow-auto rounded-md border border-border text-xs">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-muted/90">
                <tr>
                  <th className="p-2">Pack</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Cases</th>
                  <th className="p-2">Rows</th>
                  <th className="p-2">Pass</th>
                  <th className="p-2">Weak</th>
                  <th className="p-2">Fail</th>
                  <th className="p-2">Timeout</th>
                  <th className="p-2">Main issue</th>
                  <th className="p-2">Fallback</th>
                  <th className="p-2">Collapse Q</th>
                  <th className="p-2">Avg ms</th>
                  <th className="p-2">Routes</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((m) => (
                  <tr
                    key={m.pack_id}
                    className={`border-t border-border cursor-pointer hover:bg-muted/50 ${detailPackId === (m.pack_id as EvalPackId) ? "bg-muted/40" : ""}`}
                    onClick={() =>
                      setDetailPackId((prev) =>
                        prev === (m.pack_id as EvalPackId) ? null : (m.pack_id as EvalPackId)
                      )
                    }
                  >
                    <td className="p-2 font-mono">{m.pack_id}</td>
                    <td className="p-2 max-w-[140px] truncate" title={m.pack_name}>
                      {m.pack_name}
                    </td>
                    <td className="p-2">{m.case_count}</td>
                    <td className="p-2">{m.row_count}</td>
                    <td className="p-2">{m.pass}</td>
                    <td className="p-2">{m.weak}</td>
                    <td className="p-2">{m.fail}</td>
                    <td className="p-2">{m.timeout}</td>
                    <td className="p-2 max-w-[120px] truncate" title={m.main_issue}>
                      {m.main_issue}
                    </td>
                    <td className="p-2">{m.fallback_count}</td>
                    <td className="p-2">{m.collapse_warning_count}</td>
                    <td className="p-2">{m.avg_duration_ms}</td>
                    <td className="p-2 max-w-[180px] truncate" title={formatRouteCounts(m.route_counts)}>
                      {formatRouteCounts(m.route_counts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailMatrix && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">
              Pack {detailMatrix.pack_id} detail
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDetailPackId(null)}>
              Close detail
            </Button>
          </div>

          {detailMatrix.drift_warnings.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <p className="font-medium">Route drift ({detailMatrix.drift_warnings.length})</p>
              <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5">
                {detailMatrix.drift_warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-1">Weak rows — sample answers</p>
            <div className="max-h-48 overflow-auto rounded-md border border-border text-xs space-y-2 p-2">
              {weakOnlyExamples.length === 0 ? (
                <p className="text-muted-foreground">No weak rows in this pack.</p>
              ) : (
                weakOnlyExamples.map((r, i) => (
                  <div key={`${r.case_id}-${r.question_no}-${i}`} className="border-b border-border pb-2 last:border-0">
                    <div className="font-medium">
                      Q{r.question_no} · {r.case_title} · {r.route_tag ?? "—"}
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">{r.answer}</pre>
                  </div>
                ))
              )}
            </div>
          </div>

          <EvalSweepReviewPanel
            rows={toReviewRows(detailMatrix.rows)}
            questions={GOLDEN_SWEEP_QUESTIONS}
            baselineRows={null}
          />
        </div>
      )}

      {fixBrief && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Cursor Fix Brief (copied to clipboard)</p>
          <textarea
            readOnly
            className="w-full min-h-[200px] rounded-md border border-border bg-muted/30 p-2 font-mono text-xs"
            value={fixBrief}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {importModalPack && (
        <PackImportModal
          packId={importModalPack}
          isOpen
          existingPackCaseNos={existingTaggedPackSlots(cases, importModalPack)}
          onClose={() => setImportModalPack(null)}
          onComplete={onPackImportComplete}
        />
      )}
    </Card>
  );
}
