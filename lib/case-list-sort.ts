import {
  EVAL_PACK_IDS,
  inferEvalPackFromTitle,
  parseEvalPackId,
  type EvalPackId,
} from "@/lib/eval-packs";

/** Row shape for criminal / eval case list ordering (read-only; no DB writes). */
export type CaseListSortRow = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  eval_case_no?: number | null;
  next_hearing_date?: string | null;
};

type EvalListSortKey = {
  packIdx: number;
  caseNo: number;
  title: string;
};

function titleKey(title: string | null | undefined): string {
  return (title ?? "").trim();
}

function evalListSortKey(row: CaseListSortRow): EvalListSortKey | null {
  const fromDb = parseEvalPackId(row.eval_pack_id ?? undefined);
  const inferred = inferEvalPackFromTitle(row.title ?? "");
  const packId: EvalPackId | null = fromDb ?? inferred?.pack_id ?? null;
  if (!packId) return null;

  const packIdx = EVAL_PACK_IDS.indexOf(packId);
  if (packIdx < 0) return null;

  const fromDbNo =
    typeof row.eval_case_no === "number" && Number.isFinite(row.eval_case_no) ? row.eval_case_no : null;
  const caseNo = fromDbNo ?? inferred?.eval_case_no ?? Number.MAX_SAFE_INTEGER;

  return { packIdx, caseNo, title: titleKey(row.title) };
}

function hearingTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function recencyTime(row: CaseListSortRow): number {
  for (const iso of [row.updated_at, row.created_at]) {
    const t = hearingTime(iso);
    if (t != null) return t;
  }
  return 0;
}

function compareEvalKeys(a: EvalListSortKey, b: EvalListSortKey): number {
  if (a.packIdx !== b.packIdx) return a.packIdx - b.packIdx;
  if (a.caseNo !== b.caseNo) return a.caseNo - b.caseNo;
  const t = a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });
  return t;
}

function compareNonEvalRows(a: CaseListSortRow, b: CaseListSortRow): number {
  const ha = hearingTime(a.next_hearing_date);
  const hb = hearingTime(b.next_hearing_date);
  if (ha != null && hb != null && ha !== hb) return ha - hb;
  if (ha != null && hb == null) return -1;
  if (ha == null && hb != null) return 1;

  const ua = recencyTime(a);
  const ub = recencyTime(b);
  if (ua !== ub) return ub - ua;

  const t = titleKey(a.title).localeCompare(titleKey(b.title), undefined, {
    sensitivity: "base",
    numeric: true,
  });
  return t !== 0 ? t : a.id.localeCompare(b.id);
}

/**
 * Stable display order for criminal case lists:
 * - Eval-tagged rows: pack A→X, then eval_case_no ascending, then title.
 * - Other rows: soonest next hearing, else most recently updated/created, then title.
 */
export function sortCasesForDisplay<T extends CaseListSortRow>(cases: T[]): T[] {
  return [...cases].sort((a, b) => {
    const ea = evalListSortKey(a);
    const eb = evalListSortKey(b);
    if (ea && eb) {
      const c = compareEvalKeys(ea, eb);
      return c !== 0 ? c : a.id.localeCompare(b.id);
    }
    if (ea && !eb) return -1;
    if (!ea && eb) return 1;
    const c = compareNonEvalRows(a, b);
    return c !== 0 ? c : a.id.localeCompare(b.id);
  });
}
