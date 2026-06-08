"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  battleboardSweepWeakFailRowsToCsv,
  buildBattleboardPerPackResultsExport,
  buildBattleboardSweepFullExport,
  groupRowsByPackOrdered,
  scoreBattleboardOutput,
  computeRouteDistribution,
  sortBattleboardSweepRows,
  summarizeBattleboardSweep,
  type BattleboardPackSweepResult,
  type BattleboardSweepRow,
} from "@/lib/battleboard-sweep";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import {
  EVAL_PACK_IDS,
  EVAL_PACK_LABELS,
  EVAL_PACK_A_THROUGH_AA_IDS,
  EVAL_PACK_A_THROUGH_Y_IDS,
  EVAL_PACK_A_THROUGH_Z_IDS,
  EVAL_PACK_AA_ONLY_IDS,
  EVAL_PACK_LOCKED_BASELINE_IDS,
  EVAL_PACK_Y_ONLY_IDS,
  EVAL_PACK_Z_ONLY_IDS,
  parseEvalPackId,
  resolveCaseEvalPack,
  type EvalPackId,
} from "@/lib/eval-packs";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";

type CaseApiRow = {
  id: string;
  title?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  eval_case_no?: number | null;
  eval_doc_hint?: string | null;
};

const CASES_LIST_URL = "/api/cases?eval_doc_hints=1";

function groupCasesByPack(caseRows: CaseApiRow[]): Map<EvalPackId, CaseApiRow[]> {
  const m = new Map<EvalPackId, CaseApiRow[]>();
  for (const id of EVAL_PACK_IDS) m.set(id, []);
  for (const c of caseRows) {
    const eff = resolveCaseEvalPack(c);
    if (!eff) continue;
    m.get(eff.pack_id)!.push(c);
  }
  for (const id of EVAL_PACK_IDS) {
    m.get(id)!.sort((a, b) => {
      const na =
        typeof a.eval_case_no === "number" && Number.isFinite(a.eval_case_no)
          ? a.eval_case_no
          : 999;
      const nb =
        typeof b.eval_case_no === "number" && Number.isFinite(b.eval_case_no)
          ? b.eval_case_no
          : 999;
      return na - nb;
    });
  }
  return m;
}

async function fetchCases(): Promise<CaseApiRow[]> {
  const res = await fetch(CASES_LIST_URL, { credentials: "include", cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as { cases?: CaseApiRow[]; error?: string };
  if (!res.ok) throw new Error(json?.error || "Failed to load cases");
  return Array.isArray(json.cases) ? json.cases : [];
}

async function fetchBattleboard(caseId: string): Promise<{
  board: BattleboardOutput | null;
  error: string | null;
  duration_ms: number;
}> {
  const started = Date.now();
  const res = await fetch(`/api/criminal/${caseId}/strategy-battleboard`, {
    credentials: "include",
    cache: "no-store",
  });
  const duration_ms = Date.now() - started;
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: BattleboardOutput;
    error?: string;
  };
  if (!res.ok) {
    return { board: null, error: json.error || `HTTP ${res.status}`, duration_ms };
  }
  if (!json.ok || !json.data) {
    return { board: null, error: json.error || "No battleboard data", duration_ms };
  }
  return { board: json.data, error: null, duration_ms };
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BattleboardSweepRunner() {
  const { isOwner, bypassActive } = usePaywallStatus();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const OWNER_USER_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID
    ? [process.env.NEXT_PUBLIC_ADMIN_USER_ID]
    : [];
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
  const [selectedPacks, setSelectedPacks] = useState<Set<EvalPackId>>(() => new Set());
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<BattleboardSweepRow[]>([]);
  const [packResults, setPackResults] = useState<BattleboardPackSweepResult[]>([]);
  const [runMode, setRunMode] = useState<"combined" | "by_pack" | null>(null);
  const [runComplete, setRunComplete] = useState(false);
  const [runPartial, setRunPartial] = useState(false);
  const [currentPack, setCurrentPack] = useState<EvalPackId | null>(null);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    current: "",
    packLabel: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const refreshCases = useCallback(async () => {
    setLoadError(null);
    try {
      setCases(await fetchCases());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setCases([]);
    }
  }, []);

  useEffect(() => {
    if (showRunner) void refreshCases();
  }, [showRunner, refreshCases]);

  const casesByPack = useMemo(() => groupCasesByPack(cases), [cases]);

  const counts = useMemo(() => {
    const o: Record<EvalPackId, number> = {} as Record<EvalPackId, number>;
    for (const id of EVAL_PACK_IDS) o[id] = casesByPack.get(id)?.length ?? 0;
    return o;
  }, [casesByPack]);

  const sortedRows = useMemo(() => sortBattleboardSweepRows(rows), [rows]);

  const summary = useMemo(() => summarizeBattleboardSweep(sortedRows), [sortedRows]);

  const selectedPacksList = useMemo(
    () => EVAL_PACK_IDS.filter((id) => selectedPacks.has(id)),
    [selectedPacks],
  );

  const displayPackGroups = useMemo(() => {
    if (packResults.length > 0) return packResults;
    return groupRowsByPackOrdered(sortedRows);
  }, [packResults, sortedRows]);

  const problemRows = useMemo(
    () => sortedRows.filter((r) => r.quality === "weak" || r.quality === "fail"),
    [sortedRows],
  );

  const exportsReady = rows.length > 0 && !running && runComplete;

  async function scoreCaseRow(c: CaseApiRow): Promise<BattleboardSweepRow> {
    const packMeta = resolveCaseEvalPack(c);
    const evalCaseNo =
      typeof c.eval_case_no === "number" && Number.isFinite(c.eval_case_no)
        ? c.eval_case_no
        : (packMeta?.eval_case_no ?? null);
    const { board, error, duration_ms } = await fetchBattleboard(c.id);
    return scoreBattleboardOutput({
      case_id: c.id,
      case_title: c.title ?? "Untitled",
      eval_pack_id: packMeta?.pack_id ?? parseEvalPackId(c.eval_pack_id) ?? null,
      eval_pack_name: packMeta?.pack_name ?? c.eval_pack_name ?? null,
      eval_case_no: evalCaseNo,
      battleboard: board,
      duration_ms,
      fetch_error: error,
    });
  }

  function persistLastRun(buffer: BattleboardSweepRow[], mode: "combined" | "by_pack") {
    try {
      localStorage.setItem(
        "casebrain:battleboard-sweep:last-run",
        JSON.stringify({
          created_at: new Date().toISOString(),
          run_mode: mode,
          rows: sortBattleboardSweepRows(buffer),
        }),
      );
    } catch {
      // non-fatal
    }
  }

  function selectNoPacks() {
    setSelectedPacks(new Set());
  }

  function selectAllPacksWithCases() {
    const next = new Set<EvalPackId>();
    for (const id of EVAL_PACK_IDS) {
      if ((counts[id] ?? 0) > 0) next.add(id);
    }
    setSelectedPacks(next);
  }

  /** All packs A–Z (excludes Pack AA). */
  function selectAllPacksAXZ() {
    setSelectedPacks(new Set(EVAL_PACK_A_THROUGH_Z_IDS));
  }

  /** All packs A–AA. */
  function selectAllPacksAA() {
    setSelectedPacks(new Set(EVAL_PACK_A_THROUGH_AA_IDS));
  }

  /** All packs A–Y (excludes Pack Z and AA). */
  function selectAllPacksAY() {
    setSelectedPacks(new Set(EVAL_PACK_A_THROUGH_Y_IDS));
  }

  function selectPackYOnly() {
    setSelectedPacks(new Set(EVAL_PACK_Y_ONLY_IDS));
  }

  function selectPackZOnly() {
    setSelectedPacks(new Set(EVAL_PACK_Z_ONLY_IDS));
  }

  function selectPackAAOnly() {
    setSelectedPacks(new Set(EVAL_PACK_AA_ONLY_IDS));
  }

  function selectOnlyPack(id: EvalPackId) {
    setSelectedPacks(new Set([id]));
  }

  function togglePack(id: EvalPackId) {
    setSelectedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const casesToRun = useMemo(() => {
    const out: CaseApiRow[] = [];
    for (const packId of EVAL_PACK_IDS) {
      if (!selectedPacks.has(packId)) continue;
      out.push(...(casesByPack.get(packId) ?? []));
    }
    return out;
  }, [selectedPacks, casesByPack]);

  async function runSweep() {
    if (running || casesToRun.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setRunComplete(false);
    setRunPartial(false);
    setRunMode("combined");
    setMessage(null);
    setRows([]);
    setPackResults([]);
    setCurrentPack(null);
    setProgress({ done: 0, total: casesToRun.length, current: "Starting…", packLabel: "" });

    const buffer: BattleboardSweepRow[] = [];

    try {
      for (let i = 0; i < casesToRun.length; i++) {
        if (cancelRef.current) break;
        const c = casesToRun[i]!;
        const packMeta = resolveCaseEvalPack(c);
        setProgress({
          done: i,
          total: casesToRun.length,
          current: `${c.title ?? c.id} (${packMeta?.pack_id ?? "?"})`,
          packLabel: "",
        });

        const row = await scoreCaseRow(c);
        buffer.push(row);
        setRows(sortBattleboardSweepRows([...buffer]));
        setProgress({
          done: i + 1,
          total: casesToRun.length,
          current: row.quality === "pass" ? `✓ ${c.title}` : `⚠ ${c.title} — ${row.issue}`,
          packLabel: "",
        });
      }

      const cancelled = cancelRef.current;
      const sorted = sortBattleboardSweepRows(buffer);
      setRows(sorted);
      setPackResults(groupRowsByPackOrdered(sorted));

      if (cancelled) {
        setRunPartial(true);
        setMessage(`Cancelled — ${sorted.length} completed row(s) exported if you download partial results.`);
      } else {
        setMessage(`Completed ${sorted.length} battleboard check(s) (combined run).`);
        persistLastRun(sorted, "combined");
      }
      setRunComplete(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setRunPartial(true);
      setRunComplete(buffer.length > 0);
    } finally {
      setRunning(false);
      setCurrentPack(null);
    }
  }

  async function runSweepByPack() {
    if (running || selectedPacksList.length === 0) return;
    const packsWithCases = selectedPacksList.filter((id) => (casesByPack.get(id)?.length ?? 0) > 0);
    if (!packsWithCases.length) return;

    cancelRef.current = false;
    setRunning(true);
    setRunComplete(false);
    setRunPartial(false);
    setRunMode("by_pack");
    setMessage(null);
    setRows([]);
    setPackResults([]);
    setCurrentPack(null);

    const totalCases = packsWithCases.reduce(
      (n, id) => n + (casesByPack.get(id)?.length ?? 0),
      0,
    );
    setProgress({ done: 0, total: totalCases, current: "Starting…", packLabel: "" });

    const allRows: BattleboardSweepRow[] = [];
    const completedPacks: BattleboardPackSweepResult[] = [];
    let doneGlobal = 0;

    try {
      for (const packId of packsWithCases) {
        if (cancelRef.current) break;
        const packCases = casesByPack.get(packId) ?? [];
        if (!packCases.length) continue;

        setCurrentPack(packId);
        setProgress((p) => ({
          ...p,
          packLabel: `Pack ${packId} — ${EVAL_PACK_LABELS[packId]}`,
          current: `Pack ${packId}: 0/${packCases.length}`,
        }));

        const packRows: BattleboardSweepRow[] = [];

        for (let i = 0; i < packCases.length; i++) {
          if (cancelRef.current) break;
          const c = packCases[i]!;
          setProgress({
            done: doneGlobal,
            total: totalCases,
            packLabel: `Pack ${packId} — ${EVAL_PACK_LABELS[packId]}`,
            current: `Pack ${packId}: ${i + 1}/${packCases.length} — ${c.title ?? c.id}`,
          });

          const row = await scoreCaseRow(c);
          packRows.push(row);
          allRows.push(row);
          doneGlobal += 1;
          setRows(sortBattleboardSweepRows([...allRows]));
        }

        if (packRows.length > 0) {
          const sortedPackRows = sortBattleboardSweepRows(packRows);
          const packResult: BattleboardPackSweepResult = {
            pack_id: packId,
            pack_name: sortedPackRows[0]?.eval_pack_name ?? EVAL_PACK_LABELS[packId],
            summary: summarizeBattleboardSweep(sortedPackRows),
            rows: sortedPackRows,
          };
          completedPacks.push(packResult);
          setPackResults([...completedPacks]);
        }
      }

      const cancelled = cancelRef.current;
      const sorted = sortBattleboardSweepRows(allRows);
      setRows(sorted);
      setPackResults(completedPacks);

      if (cancelled) {
        setRunPartial(true);
        setMessage(
          `Cancelled — ${sorted.length} row(s) across ${completedPacks.length} pack(s). Partial export available.`,
        );
      } else {
        setMessage(
          `Completed ${sorted.length} check(s) across ${completedPacks.length} pack(s) (by-pack run).`,
        );
        persistLastRun(sorted, "by_pack");
      }
      setRunComplete(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setRunPartial(true);
      setRunComplete(allRows.length > 0);
    } finally {
      setRunning(false);
      setCurrentPack(null);
    }
  }

  function cancelRun() {
    cancelRef.current = true;
  }

  function downloadFullJson() {
    const payload = buildBattleboardSweepFullExport({
      rows: sortedRows,
      selected_packs: selectedPacksList,
      run_mode: runMode ?? "combined",
      partial: runPartial,
    });
    downloadText(
      `battleboard-sweep-full${runPartial ? "-partial" : ""}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
  }

  function downloadPerPackSummaryJson() {
    const payload = buildBattleboardPerPackResultsExport({
      packResults: displayPackGroups,
      selected_packs: selectedPacksList,
      partial: runPartial,
    });
    downloadText(
      `battleboard-sweep-by-pack${runPartial ? "-partial" : ""}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
  }

  function downloadProblemsCsv() {
    downloadText(
      `battleboard-sweep-weak-fail${runPartial ? "-partial" : ""}-${new Date().toISOString().slice(0, 10)}.csv`,
      battleboardSweepWeakFailRowsToCsv(sortedRows),
      "text/csv",
    );
  }

  if (!showRunner) {
    return (
      <Card className="p-6">
        <p className="text-sm text-accent/70">
          Battleboard Sweep is restricted to owner/dev accounts. Sign in as admin or enable eval bypass.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Battleboard Sweep (Phase 1)</h1>
        <p className="mt-1 text-sm text-accent/60">
          One Strategy Battleboard check per case via{" "}
          <code className="text-xs">GET /api/criminal/[caseId]/strategy-battleboard</code>. Separate
          from Golden Sweep — does not call defence-plan-chat.
        </p>
      </header>

      {loadError && (
        <p className="text-sm text-destructive">
          {loadError}{" "}
          <button type="button" className="underline" onClick={() => void refreshCases()}>
            Retry
          </button>
        </p>
      )}

      <Card title="Pack selection" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectNoPacks}>
            Select none
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectAllPacksWithCases}>
            Select all packs with cases
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectAllPacksAXZ}>
            A–Z all packs
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectAllPacksAA}>
            A–AA all packs
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectAllPacksAY}>
            A–Y all packs
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectPackYOnly}>
            Y only
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectPackZOnly}>
            Z only
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectPackAAOnly}>
            AA only
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedPacks(new Set(EVAL_PACK_LOCKED_BASELINE_IDS))}
          >
            A–T regression lock
          </Button>
          {(["U", "V", "W", "X"] as const).map((id) => (
            <Button key={id} type="button" variant="outline" size="sm" onClick={() => selectOnlyPack(id)}>
              {id} only
            </Button>
          ))}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[320px] overflow-y-auto border border-primary/10 rounded-xl p-3">
          {EVAL_PACK_IDS.map((id) => {
            const n = counts[id] ?? 0;
            const checked = selectedPacks.has(id);
            return (
              <li key={id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePack(id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Pack {id}</span>
                    <span className="block text-xs text-accent/50">{EVAL_PACK_LABELS[id]}</span>
                    <span className="text-xs text-accent/60">{n} case{n === 1 ? "" : "s"}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={running || casesToRun.length === 0}
            onClick={() => void runSweep()}
          >
            {running && runMode === "combined"
              ? `Running… ${progress.done}/${progress.total}`
              : casesToRun.length === 0
                ? "Select packs to run"
                : `Run ${casesToRun.length} battleboard check(s)`}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={running || selectedPacksList.length === 0}
            onClick={() => void runSweepByPack()}
          >
            {running && runMode === "by_pack"
              ? `By pack… ${progress.done}/${progress.total}`
              : "Run selected packs separately"}
          </Button>
          {running && (
            <Button type="button" variant="outline" size="sm" onClick={cancelRun}>
              Cancel
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshCases()} disabled={running}>
            Refresh cases
          </Button>
        </div>
        {progress.packLabel && (
          <p className="text-xs font-medium text-primary truncate">{progress.packLabel}</p>
        )}
        {progress.current && (
          <p className="text-xs text-accent/50 truncate">{progress.current}</p>
        )}
        {currentPack && running && (
          <p className="text-xs text-accent/60">Active pack: {currentPack}</p>
        )}
        {message && <p className="text-sm text-accent/70">{message}</p>}
      </Card>

      {rows.length > 0 && (
        <>
          <Card title="Summary">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              <div>
                <dt className="text-accent/50">Total</dt>
                <dd className="font-semibold">{summary.total}</dd>
              </div>
              <div>
                <dt className="text-accent/50">Pass</dt>
                <dd className="font-semibold text-success">{summary.pass}</dd>
              </div>
              <div>
                <dt className="text-accent/50">Weak</dt>
                <dd className="font-semibold text-warning">{summary.weak}</dd>
              </div>
              <div>
                <dt className="text-accent/50">Fail</dt>
                <dd className="font-semibold text-destructive">{summary.fail}</dd>
              </div>
              <div>
                <dt className="text-accent/50">Avg duration</dt>
                <dd className="font-semibold">{summary.avg_duration_ms} ms</dd>
              </div>
            </dl>

            {summary.route_distribution && summary.total > 0 && (
              <div className="mt-4 space-y-3 text-xs">
                <p className="font-medium text-accent/70">Route distribution (Phase 2)</p>
                {summary.route_distribution.disclosure_overuse_warning && (
                  <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
                    {summary.route_distribution.disclosure_overuse_warning} (
                    {summary.route_distribution.disclosure_primary_pct}% disclosure primary)
                  </p>
                )}
                <p className="text-accent/60">
                  Disclosure primary: {summary.route_distribution.disclosure_primary_count} /{" "}
                  {summary.total} ({summary.route_distribution.disclosure_primary_pct}%)
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.route_distribution.route_type_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <span
                        key={type}
                        className="rounded-md border border-primary/15 bg-surface-muted/50 px-2 py-0.5"
                      >
                        {type}: {count}
                      </span>
                    ))}
                </div>
                {summary.route_distribution.top_primary_titles.length > 0 && (
                  <div>
                    <p className="text-accent/50 mb-1">Top primary route titles</p>
                    <ul className="space-y-0.5 text-accent/70">
                      {summary.route_distribution.top_primary_titles.slice(0, 8).map((t) => (
                        <li key={t.title}>
                          {t.count}× {t.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {summary.issue_groups.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-accent/60 mb-2">Main issue groups</p>
                <ul className="text-xs space-y-1 text-accent/70">
                  {summary.issue_groups.slice(0, 12).map((g) => (
                    <li key={g.issue}>
                      {g.count}× {g.issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(summary.by_pack).length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-xs font-medium text-accent/60 mb-2">Per-pack breakdown</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-accent/50">
                      <th className="pr-3 py-1">Pack</th>
                      <th className="pr-3">Total</th>
                      <th className="pr-3">Pass</th>
                      <th className="pr-3">Weak</th>
                      <th>Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVAL_PACK_IDS.filter((id) => summary.by_pack[id]).map((id) => {
                      const p = summary.by_pack[id]!;
                      return (
                        <tr key={id} className="border-t border-primary/5">
                          <td className="pr-3 py-1 font-medium">{id}</td>
                          <td className="pr-3">{p.total}</td>
                          <td className="pr-3 text-success">{p.pass}</td>
                          <td className="pr-3 text-warning">{p.weak}</td>
                          <td className="text-destructive">{p.fail}</td>
                        </tr>
                      );
                    })}
                    {summary.by_pack.untagged && (
                      <tr className="border-t border-primary/5">
                        <td className="pr-3 py-1 font-medium">untagged</td>
                        <td className="pr-3">{summary.by_pack.untagged.total}</td>
                        <td className="pr-3">{summary.by_pack.untagged.pass}</td>
                        <td className="pr-3">{summary.by_pack.untagged.weak}</td>
                        <td>{summary.by_pack.untagged.fail}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {displayPackGroups.length > 0 && (
            <Card title={runMode === "by_pack" ? "Per-pack progress" : "Per-pack breakdown"}>
              <div className="space-y-4 max-h-[520px] overflow-y-auto">
                {displayPackGroups.map((pack) => (
                  <div
                    key={pack.pack_id}
                    className="rounded-xl border border-primary/10 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-accent">
                        Pack {pack.pack_id}
                        <span className="ml-2 font-normal text-accent/50">{pack.pack_name}</span>
                      </p>
                      <p className="text-accent/60">{pack.summary.total} cases</p>
                    </div>
                    <p className="mt-1 text-accent/70">
                      <span className="text-success">{pack.summary.pass} pass</span>
                      {" · "}
                      <span className="text-warning">{pack.summary.weak} weak</span>
                      {" · "}
                      <span className="text-destructive">{pack.summary.fail} fail</span>
                      {" · "}
                      avg {pack.summary.avg_duration_ms} ms
                    </p>
                    {pack.summary.issue_groups.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-accent/60">
                        {pack.summary.issue_groups.slice(0, 5).map((g) => (
                          <li key={g.issue}>
                            {g.count}× {g.issue}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(() => {
                      const dist = computeRouteDistribution(pack.rows);
                      if (pack.rows.length <= 0) return null;
                      return (
                        <p className="mt-2 text-accent/50">
                          Primary types:{" "}
                          {Object.entries(dist.route_type_counts)
                            .map(([k, v]) => `${k} ${v}`)
                            .join(" · ")}
                          {dist.disclosure_primary_pct > 0 &&
                            ` · disclosure ${dist.disclosure_primary_pct}%`}
                        </p>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Problems only (by pack)">
            {problemRows.length === 0 ? (
              <p className="text-sm text-accent/60">No weak or fail rows.</p>
            ) : (
              <div className="space-y-6 max-h-[560px] overflow-y-auto">
                {displayPackGroups.map((pack) => {
                  const packProblems = pack.rows.filter(
                    (r) => r.quality === "weak" || r.quality === "fail",
                  );
                  if (!packProblems.length) return null;
                  return (
                    <div key={pack.pack_id}>
                      <p className="text-xs font-semibold text-accent mb-2">
                        Pack {pack.pack_id} — {packProblems.length} issue
                        {packProblems.length === 1 ? "" : "s"}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-accent/50">
                              <th className="pr-2 py-1">#</th>
                              <th className="pr-2">Case</th>
                              <th className="pr-2">Q</th>
                              <th className="pr-2">Route</th>
                              <th className="pr-2">Match</th>
                              <th>Issue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {packProblems.map((r) => (
                              <tr key={r.case_id} className="border-t border-primary/5 align-top">
                                <td className="pr-2 py-1 whitespace-nowrap">
                                  {r.eval_case_no ?? "—"}
                                </td>
                                <td className="pr-2 max-w-[140px] truncate" title={r.case_title}>
                                  {r.case_title}
                                </td>
                                <td className="pr-2 whitespace-nowrap">
                                  <span
                                    className={
                                      r.quality === "fail"
                                        ? "text-destructive font-medium"
                                        : "text-warning font-medium"
                                    }
                                  >
                                    {r.quality}
                                  </span>
                                </td>
                                <td
                                  className="pr-2 max-w-[100px] truncate"
                                  title={r.primary_route_title ?? ""}
                                >
                                  {r.primary_route_type ?? "—"}
                                </td>
                                <td
                                  className="pr-2 max-w-[88px] truncate"
                                  title={r.route_family_match_reason ?? ""}
                                >
                                  {r.route_family_match ? "yes" : "no"}
                                  {r.corpus_markers ? ` · ${r.corpus_markers}` : ""}
                                </td>
                                <td className="text-accent/70">{r.issue}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Exports">
            <p className="text-xs text-accent/60 mb-3">
              {exportsReady
                ? runPartial
                  ? "Run ended early — exports contain completed rows only."
                  : "Full run complete — exports include all rows in pack/case order."
                : running
                  ? "Exports disabled while a run is in progress."
                  : "Finish or cancel a run to enable exports."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadFullJson}
                disabled={!exportsReady}
              >
                Download full Battleboard sweep JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadProblemsCsv}
                disabled={!exportsReady || problemRows.length === 0}
              >
                Download weak/fail rows CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadPerPackSummaryJson}
                disabled={!exportsReady || displayPackGroups.length === 0}
              >
                Download per-pack summary JSON
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

