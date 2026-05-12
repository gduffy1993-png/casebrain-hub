/**
 * Bulk eval / Golden sweep UI scoring — honest Pass vs Weak vs Fail for DefencePlanBox.
 * Heuristic only (no bundle text on client); does not change server answer generation.
 */

import { fingerprintAnswer, type EvalMetaV1 } from "@/lib/eval-observability";
import { isEvalWeakAnswer, TIMEOUT_OR_ABORT_ANSWER_RE } from "@/lib/eval-run-metadata";
import {
  GOLDEN_FALLBACK_ROUTE_TAGS,
  GOLDEN_STRICT_EXPECTED_ROUTE,
  isSuspiciouslyShortAnswer,
} from "@/lib/eval-sweep-review";

export type BulkEvalRunRowInput = {
  caseId: string;
  questionNo: number;
  answer: string;
  error?: string;
  ok: boolean;
  http_status: number;
  weak: boolean;
  route_tag: string | null;
  eval_meta?: EvalMetaV1 | null;
};

export type EvalRunLabel = "ok" | "timeout" | "error" | "skipped";

export type EvalQualityLabel = "pass" | "weak" | "fail" | "timeout" | "error";

const OFFENCE_OR_CASE_MARKERS =
  /\b(robbery|burglary|dwell|theft|snatch|assault|ABH|GBH|wound|battery|fraud|weapon|blade|knife|driv|drug|supply|possess|affray|damage|criminal damage|public order|handling|perverting|kidnap|rape|coercive|s\.?\s*47|s\.?\s*20|s\.?\s*18|pwits|grievous|bodily|harm)\b/i;

/** Exhibit / disclosure / procedural anchors (PART D). */
const CASE_ANCHOR_RE =
  /(EX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|NS-CPS-\d{4}-\d{4}|\bMG\s*\d+\b|\bCAD\b|\b999\b|\bCCTV\b|\bBWV\b|\bPACE\b|interview|witness|continuity|disclosure schedule|served|outstanding|awaited|partial extract|count\s*\d|indictment|charge sheet)/gi;

function rowText(r: BulkEvalRunRowInput): string {
  return (r.answer || r.error || "").trim();
}

export function bulkEvalRunLabel(r: Pick<BulkEvalRunRowInput, "ok" | "http_status" | "error">): EvalRunLabel {
  if (!r.ok && r.http_status === 0) {
    const e = (r.error || "").toLowerCase();
    if (/timed out|abort|timeout|browser limit|signal is aborted|aborted without reason/i.test(e)) return "timeout";
    return "error";
  }
  if (!r.ok) return "error";
  return "ok";
}

/** Transport + strict route + legacy weak flag (before issue-based downgrade). */
export function bulkEvalBaseQualityLabel(r: BulkEvalRunRowInput, sweepMode: "golden_10" | "manual" | null): EvalQualityLabel {
  const run = bulkEvalRunLabel(r);
  if (run === "timeout") return "timeout";
  if (run === "error") return "error";
  const text = r.answer || r.error || "";
  if (TIMEOUT_OR_ABORT_ANSWER_RE.test(text)) return "timeout";
  const tag = (r.route_tag ?? "").trim();
  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) return "fail";
  if (sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if (exp && tag !== exp) return "fail";
  }
  if (r.weak || isEvalWeakAnswer(text, { route_tag: r.route_tag })) return "weak";
  return "pass";
}

/** Fingerprint collapse: ≥2 rows same Q + same fingerprint. */
export function bulkEvalFingerprintCollapseKeys(rows: BulkEvalRunRowInput[]): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const text = rowText(r);
    const fp = r.eval_meta?.answer_fingerprint ?? fingerprintAnswer(text);
    const key = `${r.questionNo}|${fp}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out = new Set<string>();
  for (const r of rows) {
    const text = rowText(r);
    const fp = r.eval_meta?.answer_fingerprint ?? fingerprintAnswer(text);
    if ((counts.get(`${r.questionNo}|${fp}`) ?? 0) >= 2) out.add(`${r.caseId}:${r.questionNo}`);
  }
  return out;
}

function openingStem(text: string, len: number): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, len);
}

/** Same opening stem on Q3/Q8/Q9/Q10 across ≥3 cases → repeated template (PART C). */
export function bulkEvalStemClusterKeys(rows: BulkEvalRunRowInput[], sweepMode: "golden_10" | "manual" | null): Set<string> {
  const out = new Set<string>();
  if (sweepMode !== "golden_10") return out;
  const targetQ = new Set([3, 8, 9, 10]);
  for (const qn of targetQ) {
    const stemCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.questionNo !== qn) continue;
      const t = rowText(r);
      if (t.length < 45) continue;
      const stem = openingStem(t, 95);
      if (stem.length < 28) continue;
      stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
    }
    for (const [stem, n] of stemCounts) {
      if (n < 3) continue;
      for (const r of rows) {
        if (r.questionNo !== qn) continue;
        const t = rowText(r);
        if (openingStem(t, 95) === stem) out.add(`${r.caseId}:${r.questionNo}`);
      }
    }
  }
  return out;
}

function anchorHitCount(text: string): number {
  const m = text.match(CASE_ANCHOR_RE);
  return m?.length ?? 0;
}

/** Enough anchors that a known-bad stem might still be redeemed (PART C tail). */
function hasStrongCaseAnchoring(text: string): boolean {
  if (text.length >= 260 && anchorHitCount(text) >= 2) return true;
  if (anchorHitCount(text) >= 4) return true;
  return false;
}

function goldenGenericStemIssue(qn: number, text: string): string | null {
  const t = text;
  if (qn === 1) {
    if (
      /matching the offence tag|Crown say events unfolded|At a Northshire location matching|offence tag\b/i.test(t) &&
      !hasStrongCaseAnchoring(t)
    ) {
      return "generic template";
    }
    if (t.length > 35 && !OFFENCE_OR_CASE_MARKERS.test(t) && !CASE_ANCHOR_RE.test(t)) {
      return "missing offence wording";
    }
  }
  if (qn === 2) {
    if (
      /check\s+mg6|refer to\s+mg6|see\s+mg6/i.test(t) &&
      !/served|outstanding|awaited|partial|extract|schedule row|mg6 table/i.test(t) &&
      t.length < 220
    ) {
      return "generic MG6 answer";
    }
  }
  if (qn === 3) {
    if (
      /Disclosure or outstanding items are flagged in the bundle text\.?\s*Check MG6/i.test(t) &&
      !hasStrongCaseAnchoring(t)
    ) {
      return "generic disclosure stem";
    }
  }
  if (qn === 4) {
    if (
      t.length > 0 &&
      t.length < 110 &&
      !/interview|PACE|prepared statement|no comment|den(y|ial)|admission|accept(ed)?|account|alibi|intoxicat/i.test(t)
    ) {
      return "thin interview summary";
    }
  }
  if (qn === 6) {
    if (
      /there may be inconsistencies|possible inconsistencies|inconsistencies may exist/i.test(t) &&
      !CASE_ANCHOR_RE.test(t) &&
      t.length < 200
    ) {
      return "generic inconsistency answer";
    }
  }
  if (qn === 7) {
    if (
      /beyond reasonable doubt|criminal standard|crown must prove|prosecution must prove/i.test(t) &&
      !OFFENCE_OR_CASE_MARKERS.test(t) &&
      anchorHitCount(t) < 2 &&
      t.length < 320
    ) {
      return "generic burden answer";
    }
  }
  if (qn === 8) {
    if (/disclosure gaps or incomplete scheduling may/i.test(t) && !hasStrongCaseAnchoring(t)) {
      return "generic prosecution weakness";
    }
  }
  if (qn === 9) {
    if (/narrative gaps or thin positive account/i.test(t) && !hasStrongCaseAnchoring(t)) {
      return "generic defence weakness";
    }
  }
  if (qn === 10) {
    const concreteNextSteps =
      /\b(999|master\s+audio|cad|cctv|continuity|engineer|mg\s*11|signed\s+mg11|lab\s+report|gp\s+records|proof\s+map|plea|element\s+chart|client\s+instructions|mg6\s+schedule|outstanding\s+cell|disclosure\s+request|hearing\s+note|charge\s+wording)\b/i.test(
        t
      );
    if (/Secure disclosure reconciliation/i.test(t) && !hasStrongCaseAnchoring(t) && !concreteNextSteps) {
      return "generic next steps";
    }
  }
  return null;
}

function goldenMissingAnchorIssue(qn: number, text: string): string | null {
  if (![3, 6, 7, 8, 9, 10].includes(qn)) return null;
  if (text.length < 55) return null;
  if (!CASE_ANCHOR_RE.test(text) && !OFFENCE_OR_CASE_MARKERS.test(text)) {
    return "missing case-specific anchor";
  }
  return null;
}

export type BulkEvalPresentCtx = {
  sweepMode: "golden_10" | "manual" | null;
  rows: BulkEvalRunRowInput[];
  fingerprintCollapseKeys: Set<string>;
  stemClusterKeys: Set<string>;
};

export function buildBulkEvalPresentCtx(
  rows: BulkEvalRunRowInput[],
  sweepMode: "golden_10" | "manual" | null
): BulkEvalPresentCtx {
  return {
    sweepMode,
    rows,
    fingerprintCollapseKeys: bulkEvalFingerprintCollapseKeys(rows),
    stemClusterKeys: bulkEvalStemClusterKeys(rows, sweepMode),
  };
}

/**
 * Single human-readable issue (highest-priority signal wins).
 */
export function bulkEvalIssue(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string {
  const run = bulkEvalRunLabel(r);
  const text = rowText(r);
  const tag = (r.route_tag ?? "").trim();

  if (run === "timeout" || TIMEOUT_OR_ABORT_ANSWER_RE.test(text)) return "timeout";
  if (run === "error") return "error";
  if (ctx.sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if (exp && tag !== exp) return "wrong route";
  }
  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) return "fallback";
  if (ctx.fingerprintCollapseKeys.has(`${r.caseId}:${r.questionNo}`)) return "collapse/repeated answer";
  if (ctx.stemClusterKeys.has(`${r.caseId}:${r.questionNo}`)) return "collapse/repeated answer";
  if (isSuspiciouslyShortAnswer(text, r.route_tag)) return "too short";

  if (ctx.sweepMode === "golden_10" && run === "ok") {
    const stemIssue = goldenGenericStemIssue(r.questionNo, text);
    if (stemIssue) return stemIssue;
    const anchorIssue = goldenMissingAnchorIssue(r.questionNo, text);
    if (anchorIssue) return anchorIssue;
  }

  const weakNow = r.weak || isEvalWeakAnswer(text, { route_tag: r.route_tag });
  if (!weakNow) return "—";

  if (ctx.sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if ((r.questionNo === 1 || r.questionNo === 2) && exp && tag === exp) return "missing expected bundle wording";
    if (r.questionNo === 5) return "invented fact risk";
  }
  return "vague";
}

/**
 * Human-readable issue for exports; never `"—"` when `bulkEvalQualityFinal` is weak/fail (aligns UI + sweep stats).
 */
export function bulkEvalResolvedFinalIssue(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string {
  const iss = bulkEvalIssue(r, ctx);
  if (iss !== "—") return iss;
  const qual = bulkEvalQualityFinal(r, ctx);
  if (qual === "weak") return "vague";
  if (qual === "fail") {
    const tag = (r.route_tag ?? "").trim();
    if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) return "fallback";
    return "wrong route";
  }
  return "—";
}

/**
 * Final quality: never Pass if Issue ≠ "—". Collapse / generic / anchor issues → Weak.
 */
export function bulkEvalQualityFinal(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): EvalQualityLabel {
  const run = bulkEvalRunLabel(r);
  if (run === "timeout") return "timeout";
  if (run === "error") return "error";
  const text = r.answer || r.error || "";
  if (TIMEOUT_OR_ABORT_ANSWER_RE.test(text)) return "timeout";

  const tag = (r.route_tag ?? "").trim();
  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) return "fail";
  if (ctx.sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if (exp && tag !== exp) return "fail";
  }

  const issue = bulkEvalIssue(r, ctx);
  if (issue !== "—") {
    if (issue === "wrong route" || issue === "fallback") return "fail";
    return "weak";
  }

  return bulkEvalBaseQualityLabel(r, ctx.sweepMode);
}

export function bulkEvalPreviewShort(text: string, max = 88): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 32 ? cut.slice(0, sp) : cut) + "…";
}

export function bulkEvalSweepSummary(rows: BulkEvalRunRowInput[], ctx: BulkEvalPresentCtx) {
  let pass = 0;
  let weak = 0;
  let fail = 0;
  let timeoutError = 0;
  for (const r of rows) {
    const q = bulkEvalQualityFinal(r, ctx);
    if (q === "pass") pass += 1;
    else if (q === "weak") weak += 1;
    else if (q === "fail") fail += 1;
    else timeoutError += 1;
  }

  let mainIssue = "None detected";
  if (rows.length === 0) mainIssue = "—";
  else {
    const issueRows = rows.filter((r) => bulkEvalResolvedFinalIssue(r, ctx) !== "—");
    if (issueRows.length === 0) {
      mainIssue = "None detected";
    } else {
      const byIssue = new Map<string, { n: number; qs: Set<number> }>();
      for (const r of issueRows) {
        const iss = bulkEvalResolvedFinalIssue(r, ctx);
        const cur = byIssue.get(iss) ?? { n: 0, qs: new Set<number>() };
        cur.n += 1;
        cur.qs.add(r.questionNo);
        byIssue.set(iss, cur);
      }
      const severityOrder = [
        "wrong route",
        "fallback",
        "timeout",
        "error",
        "collapse/repeated answer",
        "invented fact risk",
        "generic template",
        "missing offence wording",
        "generic MG6 answer",
        "generic disclosure stem",
        "thin interview summary",
        "generic inconsistency answer",
        "generic burden answer",
        "generic prosecution weakness",
        "generic defence weakness",
        "generic next steps",
        "missing case-specific anchor",
        "missing expected bundle wording",
        "too short",
        "vague",
      ];
      let bestIssue = "";
      let bestN = -1;
      let bestQs = new Set<number>();
      let bestSev = 999;
      for (const [iss, v] of byIssue) {
        const sev = severityOrder.indexOf(iss);
        const rank = sev === -1 ? 500 : sev;
        if (v.n > bestN || (v.n === bestN && rank < bestSev)) {
          bestN = v.n;
          bestIssue = iss;
          bestQs = v.qs;
          bestSev = rank;
        }
      }
      const qsStr = [...bestQs].sort((a, b) => a - b).map((q) => `Q${q}`).join("/");
      mainIssue = `${bestIssue} (${bestN} rows on ${qsStr})`;
    }
  }

  return {
    total: rows.length,
    pass,
    weak,
    fail,
    timeoutError,
    mainIssue,
    final_pass_count: pass,
    final_weak_count: weak,
    final_fail_count: fail,
    final_timeout_error_count: timeoutError,
  };
}

export type BulkEvalFinalSummary = ReturnType<typeof bulkEvalSweepSummary>;

/** Augments eval rows with `final_quality` / `final_issue` (same logic as Defence Plan UI). */
export function bulkEvalBuildAugmentedRows<T extends BulkEvalRunRowInput>(
  rows: T[],
  sweepMode: "golden_10" | "manual" | null
): {
  ctx: BulkEvalPresentCtx;
  final_summary: BulkEvalFinalSummary;
  rows_augmented: Array<T & { final_quality: EvalQualityLabel; final_issue: string }>;
} {
  const ctx = buildBulkEvalPresentCtx(rows, sweepMode);
  const final_summary = bulkEvalSweepSummary(rows, ctx);
  const rows_augmented = rows.map((r) => ({
    ...r,
    final_quality: bulkEvalQualityFinal(r, ctx),
    final_issue: bulkEvalResolvedFinalIssue(r, ctx),
  }));
  return { ctx, final_summary, rows_augmented };
}
