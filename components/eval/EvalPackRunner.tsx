"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EvalSweepReviewPanel, type ReviewEvalRow } from "@/components/eval/EvalSweepReviewPanel";
import {
  buildCombinedCursorEvalFixBrief,
  buildCombinedEvalPackSweepsExport,
  buildGoldenEvalSweepSavePayload,
  buildSingleSweepExportDocument,
  buildWeakRowsCsvForPack,
  buildWeakRowsCsvForPacks,
  buildWeakRowsJsonForPack,
  summarizePackGoldenRun,
  type PackGoldenMatrixRow,
} from "@/lib/eval-pack-run-summary";
import { GOLDEN_QUESTIONS, runGoldenSweepForCases, type GoldenSweepEvalRow } from "@/lib/eval/golden-sweep-client";
import { GOLDEN_SWEEP_QUESTIONS } from "@/lib/eval-golden-sweep";
import { sortCasesForEvalScan } from "@/lib/eval-case-sort";
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
  evalPackNameForStorage,
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
const EVAL_PACK_COUNTS_URL = "/api/eval-packs/counts";

type ServerPackCountRow = {
  tagged: number;
  inferredOnly: number;
  name: string;
};

function emptyServerPackCounts(): Record<EvalPackId, ServerPackCountRow> {
  const o = {} as Record<EvalPackId, ServerPackCountRow>;
  for (const id of EVAL_PACK_IDS) {
    o[id] = { tagged: 0, inferredOnly: 0, name: evalPackNameForStorage(id) };
  }
  return o;
}

async function fetchServerPackCounts(): Promise<Record<EvalPackId, ServerPackCountRow>> {
  const res = await fetch(EVAL_PACK_COUNTS_URL, { credentials: "include", cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as {
    counts?: Record<string, ServerPackCountRow>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || "Failed to load pack counts");
  const base = emptyServerPackCounts();
  for (const id of EVAL_PACK_IDS) {
    const row = json.counts?.[id];
    if (row) base[id] = { tagged: row.tagged ?? 0, inferredOnly: row.inferredOnly ?? 0, name: row.name || base[id].name };
  }
  return base;
}

async function fetchTaggedEvalCases(packIds?: EvalPackId[]): Promise<CaseApiRow[]> {
  const url =
    packIds && packIds.length > 0
      ? `/api/eval-packs/cases?packIds=${packIds.join(",")}`
      : "/api/eval-packs/cases";
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as { cases?: CaseApiRow[]; error?: string };
  if (!res.ok) throw new Error(json.error || "Failed to load tagged eval cases");
  return Array.isArray(json.cases) ? json.cases : [];
}

function mergeTaggedAndInferredCases(tagged: CaseApiRow[], clientCases: CaseApiRow[]): CaseApiRow[] {
  const byId = new Map<string, CaseApiRow>();
  for (const c of tagged) byId.set(c.id, c);
  for (const c of clientCases) {
    if (parseEvalPackId(c.eval_pack_id)) continue;
    const r = resolveCaseEvalPack(c);
    if (r && r.source !== "db") byId.set(c.id, c);
  }
  return [...byId.values()];
}

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
  const [selectedPacks, setSelectedPacks] = useState<Set<EvalPackId>>(() => new Set());
  const [running, setRunning] = useState(false);
  const [matrix, setMatrix] = useState<PackGoldenMatrixRow[]>([]);
  const [detailPackId, setDetailPackId] = useState<EvalPackId | null>(null);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [fixBrief, setFixBrief] = useState<{
    text: string;
    title: string;
    filenameSuffix: string;
  } | null>(null);
  const [fixBriefMessage, setFixBriefMessage] = useState<string | null>(null);
  /** Matrix result rows selected for combined brief / exports */
  const [matrixCheckedIds, setMatrixCheckedIds] = useState<Set<EvalPackId>>(() => new Set());
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
  const [importPackSlots, setImportPackSlots] = useState<Set<number>>(() => new Set());
  const [serverPackCounts, setServerPackCounts] = useState<Record<EvalPackId, ServerPackCountRow>>(
    () => emptyServerPackCounts()
  );

  const refreshPackCounts = useCallback(async () => {
    try {
      const counts = await fetchServerPackCounts();
      setServerPackCounts(counts);
    } catch (e) {
      console.warn("[EvalPackRunner] pack counts:", e);
    }
  }, []);

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

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshPackCounts(), refreshCases()]);
  }, [refreshPackCounts, refreshCases]);

  useEffect(() => {
    if (!importModalPack) {
      setImportPackSlots(new Set());
      return;
    }
    void fetchTaggedEvalCases([importModalPack])
      .then((list) => setImportPackSlots(existingTaggedPackSlots(list, importModalPack)))
      .catch(() => setImportPackSlots(new Set()));
  }, [importModalPack]);

  const onPackImportComplete = useCallback(
    async (s: PackImportCompleteSummary) => {
      try {
        setServerPackCounts((prev) => ({
          ...prev,
          [s.packId]: {
            tagged: s.final_pack_count,
            inferredOnly: 0,
            name: evalPackNameForStorage(s.packId),
          },
        }));
        setMatrix((prev) => prev.filter((m) => m.pack_id !== s.packId));

        const importedCount = s.replaced + s.created + s.updated;
        const parts = [
          `Pack ${s.packId} import complete: ${s.selected_count} selected, ${importedCount} imported/replaced, final Pack ${s.packId} count ${s.final_pack_count}.`,
        ];

        if (s.will_import_count > 0 && s.final_pack_count !== s.will_import_count) {
          parts.push(
            `Warning: expected ${s.will_import_count} Pack ${s.packId} cases after import but final_pack_count is ${s.final_pack_count}.`
          );
        }
        if (s.errors.length) parts.push(`Errors: ${s.errors.slice(0, 8).join(" · ")}`);
        if (s.warnings.length) parts.push(`Warnings: ${s.warnings.slice(0, 8).join(" · ")}`);
        setCloudMessage(parts.join(" "));

        void refreshAll();
      } catch (e) {
        setCloudMessage(e instanceof Error ? e.message : String(e));
      }
    },
    [refreshAll]
  );

  useEffect(() => {
    if (showRunner) void refreshAll();
  }, [showRunner, refreshAll]);

  const counts = useMemo(() => {
    const o: Record<EvalPackId, number> = {} as Record<EvalPackId, number>;
    for (const id of EVAL_PACK_IDS) o[id] = serverPackCounts[id]?.tagged ?? 0;
    return o;
  }, [serverPackCounts]);

  const selectedCount = selectedPacks.size;
  const allSelected = selectedCount === EVAL_PACK_IDS.length;

  const primaryRunLabel = (() => {
    if (selectedCount === 0) return "Select packs to run";
    if (allSelected) return "Run all selected packs";
    if (selectedCount === 1) return "Run selected pack";
    return "Run selected packs";
  })();

  function selectNoPacks() {
    setSelectedPacks(new Set());
  }

  function selectLockedBaselineAT() {
    setSelectedPacks(new Set(EVAL_PACK_LOCKED_BASELINE_IDS));
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

  function selectAllPacks() {
    setSelectedPacks(new Set(EVAL_PACK_A_THROUGH_Z_IDS));
  }

  function selectAllPacksAA() {
    setSelectedPacks(new Set(EVAL_PACK_A_THROUGH_AA_IDS));
  }

  function selectAllPacksAY() {
    setSelectedPacks(new Set(EVAL_PACK_A_THROUGH_Y_IDS));
  }

  function selectPacksWithCases() {
    const next = new Set<EvalPackId>();
    for (const id of EVAL_PACK_IDS) {
      const d = serverPackCounts[id];
      if (d && (d.tagged > 0 || d.inferredOnly > 0)) next.add(id);
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
      await refreshAll();
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfillBusy(false);
    }
  }

  async function savePackSweep(packId: EvalPackId, caseCount: number, rows: GoldenSweepEvalRow[]) {
    const body = buildGoldenEvalSweepSavePayload(packId, caseCount, rows);
    const saveRes = await fetch("/api/eval-sweeps", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    setFixBriefMessage(null);
    setMatrix([]);
    setFixBrief(null);
    setMatrixCheckedIds(new Set());
    setDetailPackId(null);

    let latestCases: CaseApiRow[] = [];
    try {
      const [taggedCases, clientCases] = await Promise.all([
        fetchTaggedEvalCases(),
        fetchCasesForEval(),
      ]);
      latestCases = mergeTaggedAndInferredCases(taggedCases, clientCases);
      setCases(clientCases);
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : String(e));
      setRunning(false);
      return;
    }

    const byPack = groupCasesByPack(latestCases);
    const countForRun = (id: EvalPackId) => {
      const serverTagged = serverPackCounts[id]?.tagged ?? 0;
      if (serverTagged > 0) return serverTagged;
      return byPack.get(id)?.length ?? 0;
    };

    const ordered = [...EVAL_PACK_IDS];
    const packsToRun =
      mode === "all"
        ? ordered.filter((id) => countForRun(id) > 0)
        : ordered.filter((id) => selectedPacks.has(id) && countForRun(id) > 0);

    if (packsToRun.length === 0) {
      setCloudMessage(
        mode === "all"
          ? "No packs with cases to run (tag uploads or use filename patterns)."
          : "No selected packs have cases to run (import cases for that pack or adjust selection)."
      );
      setRunning(false);
      return;
    }

    const totalInRun = packsToRun.reduce((acc, id) => acc + countForRun(id) * GOLDEN_QUESTIONS.length, 0);
    let doneInRun = 0;
    let packsCompleted = 0;
    const matrixOut: PackGoldenMatrixRow[] = [];
    const saveNotes: string[] = [];

    setProgress({
      currentPack: null,
      packIndex: 0,
      packTotal: packsToRun.length,
      doneInRun: 0,
      totalInRun,
      currentLabel: "Starting…",
    });

    try {
      for (let pi = 0; pi < packsToRun.length; pi++) {
        if (cancelRef.current) break;
        const packId = packsToRun[pi]!;
        let packCases = byPack.get(packId) ?? [];
        if ((serverPackCounts[packId]?.tagged ?? 0) > 0) {
          packCases = packCases.filter((c) => parseEvalPackId(c.eval_pack_id) === packId);
        }
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
            setProgress((prev) => ({
              currentPack: packId,
              packIndex: pi + 1,
              packTotal: packsToRun.length,
              doneInRun: prev.doneInRun,
              totalInRun,
              currentLabel: p.current,
            }));
          },
        });

        doneInRun += rows.length;

        setProgress({
          currentPack: packId,
          packIndex: pi + 1,
          packTotal: packsToRun.length,
          doneInRun,
          totalInRun,
          currentLabel: `Pack ${packId}: sweep complete (${rows.length} answers)`,
        });

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
        packsCompleted += 1;

        try {
          const runId = await savePackSweep(packId, packCases.length, rows);
          saveNotes.push(`Pack ${packId} saved (${runId.slice(0, 8)}…).`);
          setCloudMessage(saveNotes.join(" "));
          const last = matrixOut.length - 1;
          if (last >= 0) {
            matrixOut[last] = {
              ...matrixOut[last]!,
              sweep_run_id: runId,
              sweep_saved_at: new Date().toISOString(),
            };
            setMatrix([...matrixOut]);
          }
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

      const runPartial = packsCompleted < packsToRun.length;
      setProgress({
        currentPack: null,
        packIndex: packsCompleted,
        packTotal: packsToRun.length,
        doneInRun,
        totalInRun,
        currentLabel: runPartial ? `Stopped after ${packsCompleted} of ${packsToRun.length} pack(s)` : "Complete",
      });
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

  function downloadJsonFile(obj: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTextFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleMatrixRowChecked(pid: EvalPackId) {
    setMatrixCheckedIds((prev) => {
      const n = new Set(prev);
      if (n.has(pid)) n.delete(pid);
      else n.add(pid);
      return n;
    });
    setFixBriefMessage(null);
  }

  function clearMatrixSelection() {
    setMatrixCheckedIds(new Set());
    setFixBriefMessage(null);
  }

  function selectAllMatrixRowsVisible() {
    setMatrixCheckedIds(new Set(matrix.map((m) => m.pack_id as EvalPackId)));
    setFixBriefMessage(null);
  }

  function matrixRowsForCheckedIds(ids: Set<EvalPackId>): PackGoldenMatrixRow[] {
    return matrix.filter((m) => ids.has(m.pack_id as EvalPackId));
  }

  function generateBriefForPacks(packs: PackGoldenMatrixRow[], title: string, filenameSuffix: string) {
    if (packs.length === 0) {
      setFixBriefMessage("Select at least one pack result (row checkboxes).");
      return;
    }
    const text = buildCombinedCursorEvalFixBrief(packs);
    setFixBrief({ text, title, filenameSuffix });
    setFixBriefMessage(null);
  }

  function generateBriefForCheckedMatrixRows() {
    const packs = matrixRowsForCheckedIds(matrixCheckedIds);
    const suffix = packs.map((p) => p.pack_id).join("-") || "none";
    generateBriefForPacks(packs, `Cursor fix brief — ${packs.length} pack(s) selected`, suffix);
  }

  function generateBriefForAllMatrixRows() {
    generateBriefForPacks(
      matrix,
      `Cursor fix brief — all ${matrix.length} visible pack(s)`,
      matrix.map((m) => m.pack_id).join("-") || "all"
    );
  }

  function generateFixBriefForPack(packId: EvalPackId) {
    const row = matrix.find((m) => m.pack_id === packId);
    if (!row) return;
    generateBriefForPacks([row], `Cursor fix brief — Pack ${row.pack_id}`, row.pack_id);
  }

  function copyFixBriefToClipboard() {
    if (!fixBrief) return;
    void navigator.clipboard.writeText(fixBrief.text).catch(() => {});
  }

  function downloadFixBriefTxt() {
    if (!fixBrief) return;
    downloadTextFile(fixBrief.text, `cursor-eval-fix-brief-${fixBrief.filenameSuffix}.txt`, "text/plain;charset=utf-8");
  }

  function downloadSweepJsonForPack(m: PackGoldenMatrixRow) {
    downloadJsonFile(buildSingleSweepExportDocument(m), `eval-sweep-pack-${m.pack_id}.json`);
  }

  function downloadWeakRowsJsonForPack(m: PackGoldenMatrixRow) {
    downloadJsonFile(buildWeakRowsJsonForPack(m), `eval-weak-rows-pack-${m.pack_id}.json`);
  }

  function downloadWeakRowsCsvForPack(m: PackGoldenMatrixRow) {
    downloadTextFile(
      buildWeakRowsCsvForPack(m),
      `eval-weak-rows-pack-${m.pack_id}.csv`,
      "text/csv;charset=utf-8"
    );
  }

  function downloadSelectedSweepsCombinedJson() {
    const packs = matrixRowsForCheckedIds(matrixCheckedIds);
    if (packs.length === 0) {
      setFixBriefMessage("Select at least one pack result (checkboxes).");
      return;
    }
    setFixBriefMessage(null);
    downloadJsonFile(
      buildCombinedEvalPackSweepsExport(packs, new Date().toISOString()),
      `eval-packs-sweeps-selected-${packs.map((p) => p.pack_id).join("-")}.json`
    );
  }

  function downloadAllVisibleSweepsCombinedJson() {
    if (matrix.length === 0) return;
    downloadJsonFile(
      buildCombinedEvalPackSweepsExport(matrix, new Date().toISOString()),
      `eval-packs-sweeps-all-${matrix.map((p) => p.pack_id).join("-")}.json`
    );
  }

  function downloadSelectedWeakRowsCsv() {
    const packs = matrixRowsForCheckedIds(matrixCheckedIds);
    if (packs.length === 0) {
      setFixBriefMessage("Select at least one pack result (checkboxes).");
      return;
    }
    setFixBriefMessage(null);
    downloadTextFile(
      buildWeakRowsCsvForPacks(packs),
      `eval-weak-rows-selected-${packs.map((p) => p.pack_id).join("-")}.csv`,
      "text/csv;charset=utf-8"
    );
  }

  const detailMatrix = detailPackId ? matrix.find((m) => m.pack_id === detailPackId) : null;
  const weakOnlyExamples = detailMatrix?.rows.filter((r) => r.weak).slice(0, 12) ?? [];

  if (!showRunner) return null;

  return (
    <Card className="p-4 space-y-4 mt-6">
      <div>
        <h2 className="text-lg font-semibold">Eval Pack Runner (internal)</h2>
        <p className="text-sm text-muted-foreground">
          Golden 10 sweep per pack (A–Z). Pack row counts come from server{" "}
          <code className="text-xs">eval_pack_id</code> aggregates; sweeps use tagged cases plus untagged
          title/doc inference.
        </p>
        {selectedCount === 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-500 mt-2">
            No packs selected. Choose one pack to run, use quick-select below, choose &quot;Select all&quot; for every
            pack, or &quot;A–T locked baseline&quot; for the documented regression set — then run.
          </p>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground">What each part does</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <span className="text-foreground font-medium">Import pack</span> — uploads files and creates or updates cases
            tagged for that pack (adds evidence; does not run questions).
          </li>
          <li>
            <span className="text-foreground font-medium">Run selected packs</span> — runs the Golden 10 questions
            against cases in the packs you tick (A–Y); primary button stays off until at least one pack is selected.
          </li>
          <li>
            <span className="text-foreground font-medium">Pack results matrix</span> — shows the saved run outcomes from the
            current session (one row per pack completed in this run).
          </li>
          <li>
            <span className="text-foreground font-medium">Cursor Fix Brief</span> — combined repair prompt from one or more
            checked pack results (summary + grouped issues). Use matrix checkboxes and the brief/export buttons below.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void refreshAll()} disabled={running}>
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
        <Button type="button" variant="outline" size="sm" onClick={selectNoPacks} disabled={running}>
          Select none
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={selectAllPacks} disabled={running}>
          A–Z all packs
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={selectAllPacksAA} disabled={running}>
          A–AA all packs
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={selectAllPacksAY} disabled={running}>
          A–Y all packs
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={selectLockedBaselineAT} disabled={running}>
          A–T locked baseline
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedPacks(new Set(EVAL_PACK_Y_ONLY_IDS))}
          disabled={running}
        >
          Y only
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedPacks(new Set(EVAL_PACK_Z_ONLY_IDS))}
          disabled={running}
        >
          Z only
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedPacks(new Set(EVAL_PACK_AA_ONLY_IDS))}
          disabled={running}
        >
          AA only
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => selectOnlyPack("U")} disabled={running}>
          U only
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => selectOnlyPack("V")} disabled={running}>
          V only
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => selectOnlyPack("W")} disabled={running}>
          W only
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => selectOnlyPack("X")} disabled={running}>
          X only
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={selectPacksWithCases} disabled={running}>
          Select packs with cases
        </Button>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <div className="grid gap-2 text-sm">
        {EVAL_PACK_IDS.map((id) => {
          const d = serverPackCounts[id] ?? {
            tagged: 0,
            inferredOnly: 0,
            name: evalPackNameForStorage(id),
          };
          const taggedN = d.tagged;
          const n = counts[id] ?? 0;
          const countLabel =
            taggedN > 0
              ? `${d.name} — ${taggedN} case${taggedN === 1 ? "" : "s"}`
              : d.inferredOnly > 0
                ? `${d.inferredOnly} case${d.inferredOnly === 1 ? "" : "s"} (inferred — not tagged)`
                : `0 cases`;
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
                <span className="text-muted-foreground min-w-0 text-xs leading-tight">— {countLabel}</span>
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
        <Button type="button" onClick={() => void runPacks("selected")} disabled={running || selectedCount === 0}>
          {running ? "Running…" : primaryRunLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void runPacks("all")} disabled={running}>
          Run every pack with cases (ignores checkboxes)
        </Button>
        <Button type="button" variant="outline" onClick={cancelRun} disabled={!running}>
          Cancel
        </Button>
        <Button type="button" variant="outline" onClick={stopAfterCurrentPack} disabled={!running}>
          Stop after current pack
        </Button>
      </div>

      {fixBriefMessage && <p className="text-sm text-amber-600 dark:text-amber-500">{fixBriefMessage}</p>}
      {cloudMessage && <p className="text-xs text-muted-foreground">{cloudMessage}</p>}

      <div className="text-sm space-y-1 rounded-md border border-border bg-muted/20 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Run progress</p>
        <div>
          Overall:{" "}
          {progress.totalInRun > 0
            ? `${progress.doneInRun} / ${progress.totalInRun} answers (${GOLDEN_QUESTIONS.length} per case)`
            : "—"}
        </div>
        <div>
          Packs:{" "}
          {progress.packTotal > 0
            ? running
              ? `${progress.packIndex} / ${progress.packTotal} — ${
                  progress.currentPack ? `running pack ${progress.currentPack}` : "in progress"
                }`
              : `${progress.packIndex} / ${progress.packTotal} complete`
            : "—"}
        </div>
        <div className="text-muted-foreground truncate text-xs">{progress.currentLabel}</div>
      </div>

      {matrix.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">Pack results matrix</h3>
              <p className="text-xs text-muted-foreground">
                This session&apos;s completed packs. Tick rows to combine briefs or multi-file exports. Row actions download
                one pack at a time.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/15 px-2 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateBriefForCheckedMatrixRows}
              disabled={matrixCheckedIds.size === 0}
            >
              Generate Cursor brief (selected)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={generateBriefForAllMatrixRows}>
              Generate Cursor brief (all visible)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={selectAllMatrixRowsVisible}>
              Select all visible
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearMatrixSelection}>
              Clear selection
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/15 px-2 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSelectedSweepsCombinedJson}
              disabled={matrixCheckedIds.size === 0}
            >
              Download selected sweeps JSON
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={downloadAllVisibleSweepsCombinedJson}>
              Download all visible sweeps JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSelectedWeakRowsCsv}
              disabled={matrixCheckedIds.size === 0}
            >
              Download selected weak rows CSV
            </Button>
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-slate-700 bg-slate-950 text-xs text-slate-100">
            <table className="w-full min-w-[1040px] text-left text-slate-100">
              <thead className="sticky top-0 z-[1] border-b border-slate-700 bg-slate-800">
                <tr className="text-slate-200">
                  <th className="w-8 p-2" aria-label="Select for export" />
                  <th className="p-2 font-medium">Pack</th>
                  <th className="p-2 font-medium">Name</th>
                  <th className="p-2 font-medium">Cases</th>
                  <th className="p-2 font-medium">Rows</th>
                  <th className="p-2 font-medium">Pass</th>
                  <th className="p-2 font-medium">Weak</th>
                  <th className="p-2 font-medium">Fail</th>
                  <th className="p-2 font-medium">Timeout</th>
                  <th className="p-2 font-medium">Main issue</th>
                  <th className="p-2 font-medium">Fallback</th>
                  <th className="p-2 font-medium">Collapse Q</th>
                  <th className="p-2 font-medium">Avg ms</th>
                  <th className="p-2 font-medium">Routes</th>
                  <th className="p-2 min-w-[220px] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((m) => {
                  const pid = m.pack_id as EvalPackId;
                  const checked = matrixCheckedIds.has(pid);
                  return (
                    <tr
                      key={m.pack_id}
                      className={`border-t border-slate-700 odd:bg-slate-950 even:bg-slate-900 hover:bg-slate-800 ${
                        checked ? "bg-cyan-950/50 ring-1 ring-inset ring-cyan-700/70" : ""
                      }`}
                    >
                      <td className="p-2 align-middle text-slate-100" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-cyan-400"
                          checked={checked}
                          onChange={() => toggleMatrixRowChecked(pid)}
                          aria-label={`Select pack ${m.pack_id} for combined export`}
                        />
                      </td>
                      <td className="p-2 font-mono font-medium text-slate-100">{m.pack_id}</td>
                      <td className="p-2 max-w-[140px] truncate font-medium text-slate-100" title={m.pack_name}>
                        {m.pack_name}
                      </td>
                      <td className="p-2 font-medium text-slate-100">{m.case_count}</td>
                      <td className="p-2 font-medium text-slate-100">{m.row_count}</td>
                      <td className="p-2 font-medium text-slate-100">{m.pass}</td>
                      <td className="p-2 font-medium text-slate-100">{m.weak}</td>
                      <td className="p-2 font-medium text-slate-100">{m.fail}</td>
                      <td className="p-2 font-medium text-slate-100">{m.timeout}</td>
                      <td className="p-2 max-w-[120px] truncate text-slate-300" title={m.main_issue}>
                        {m.main_issue}
                      </td>
                      <td className="p-2 text-slate-100">{m.fallback_count}</td>
                      <td className="p-2 text-slate-100">{m.collapse_warning_count}</td>
                      <td className="p-2 text-slate-100">{m.avg_duration_ms}</td>
                      <td className="p-2 max-w-[180px] truncate text-slate-300" title={formatRouteCounts(m.route_counts)}>
                        {formatRouteCounts(m.route_counts)}
                      </td>
                      <td className="p-2 align-top text-slate-100">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 justify-start border-slate-600 bg-slate-900 px-2 text-[10px] text-slate-100 hover:bg-slate-800"
                            onClick={() => setDetailPackId(pid)}
                          >
                            View details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 justify-start border-slate-600 bg-slate-900 px-2 text-[10px] text-slate-100 hover:bg-slate-800"
                            onClick={() => generateFixBriefForPack(pid)}
                          >
                            Generate Cursor brief
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 justify-start border-slate-600 bg-slate-900 px-2 text-[10px] text-slate-100 hover:bg-slate-800"
                            onClick={() => downloadSweepJsonForPack(m)}
                          >
                            Download sweep JSON
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 justify-start border-slate-600 bg-slate-900 px-2 text-[10px] text-slate-100 hover:bg-slate-800"
                            onClick={() => downloadWeakRowsJsonForPack(m)}
                          >
                            Download weak rows JSON
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 justify-start border-slate-600 bg-slate-900 px-2 text-[10px] text-slate-100 hover:bg-slate-800"
                            onClick={() => downloadWeakRowsCsvForPack(m)}
                          >
                            Download weak rows CSV
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        <div className="space-y-3 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100 shadow-inner dark:border-zinc-600">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-50">Cursor Fix Brief</p>
              <p className="text-xs text-zinc-400">{fixBrief.title}. Use Copy or Download; nothing is sent automatically.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                onClick={copyFixBriefToClipboard}
              >
                Copy brief
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                onClick={downloadFixBriefTxt}
              >
                Download .txt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                onClick={() => setFixBrief(null)}
              >
                Clear
              </Button>
            </div>
          </div>
          <textarea
            readOnly
            className="w-full min-h-[220px] resize-y rounded-md border border-zinc-700 bg-black/50 p-3 font-mono text-xs leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            value={fixBrief.text}
            spellCheck={false}
          />
        </div>
      )}

      {importModalPack && (
        <PackImportModal
          packId={importModalPack}
          isOpen
          existingPackCaseNos={importPackSlots}
          onClose={() => setImportModalPack(null)}
          onComplete={onPackImportComplete}
        />
      )}
    </Card>
  );
}
