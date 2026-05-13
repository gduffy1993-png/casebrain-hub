/**
 * Bulk eval / Golden sweep UI scoring — honest Pass vs Weak vs Fail for DefencePlanBox.
 * Heuristic only (no bundle text on client); does not change server answer generation.
 * Final quality and blocking issue are derived together via {@link computeBulkEvalRowPresent}
 * so weak/fail rows always carry a non-empty issue; optional advisory hints never force weak alone.
 * “Collapse” weak rows align with {@link semanticCollapseByQuestion} for the semantic label; other
 * repeat heuristics use distinct issue strings and {@link BulkEvalPresentOutcome.collapse_rule}.
 */

import { fingerprintAnswer, semanticCollapseByQuestion, type EvalMetaV1 } from "@/lib/eval-observability";
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
  /\b(robbery|burglary|dwell|theft|snatch|assault|ABH|GBH|wound|battery|fraud|weapon|blade|knife|driv|drug|supply|possess|affray|damage|criminal damage|public order|handling|perverting|kidnap|rape|coercive|stalk|harass|manslaughter|murder|s\.?\s*47|s\.?\s*20|s\.?\s*18|pwits|grievous|bodily|harm)\b/i;

/** Charge / statutory shape (Q1 “offence wording” beyond a single generic token). */
const CHARGE_OR_PARTICULARS_RE =
  /\b(contrary\s+to|contrary\s+to\s+section|section\s*\d+|s\.?\s*\d+\s*of\s*the|count\s*\d|on\s+the\s+\d{1,2}(st|nd|rd|th)?\s+day\s+of|particulars|statement\s+of\s+offence|indictment|charge\s+sheet)\b/i;

/** Exhibit / disclosure / procedural anchors (PART D). Source duplicated so tests don’t share `/g` lastIndex. */
const CASE_ANCHOR_PATTERN =
  "EX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|NS-CPS-\\d{4}-\\d{4}|\\bMG\\s*\\d+\\b|\\bCAD\\b|\\b999\\b|\\bCCTV\\b|\\bBWV\\b|\\bPACE\\b|interview|witness|continuity|disclosure schedule|served|outstanding|awaited|partial extract|count\\s*\\d|indictment|charge sheet";
const CASE_ANCHOR_RE_ANY = new RegExp(`(?:${CASE_ANCHOR_PATTERN})`, "i");

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

function evalFingerprintForRow(r: BulkEvalRunRowInput): string {
  return r.eval_meta?.answer_fingerprint ?? fingerprintAnswer(rowText(r));
}

function fingerprintCountKey(r: BulkEvalRunRowInput): string {
  return `${r.questionNo}|${evalFingerprintForRow(r)}`;
}

function buildQuestionFingerprintCounts(rows: BulkEvalRunRowInput[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = fingerprintCountKey(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Mirrors `sweep_observability.semantic_collapse_by_question` (eval-observability thresholds). */
function buildSemanticCollapseWarningByQuestion(rows: BulkEvalRunRowInput[]): Map<number, boolean> {
  const prepared = rows.map((r) => ({
    question_no: r.questionNo,
    answer_fingerprint: evalFingerprintForRow(r),
  }));
  const m = new Map<number, boolean>();
  for (const row of semanticCollapseByQuestion(prepared)) {
    m.set(row.question_no, row.collapse_warning);
  }
  return m;
}

/** Weak only when semantic collapse_warning is true for that Q (same fingerprint cluster as observability). */
function buildSemanticFingerprintCollapseRowKeys(
  rows: BulkEvalRunRowInput[],
  warnByQ: Map<number, boolean>
): Set<string> {
  const counts = buildQuestionFingerprintCounts(rows);
  const out = new Set<string>();
  for (const r of rows) {
    if (!warnByQ.get(r.questionNo)) continue;
    if ((counts.get(fingerprintCountKey(r)) ?? 0) >= 2) {
      out.add(`${r.caseId}:${r.questionNo}`);
    }
  }
  return out;
}

/**
 * Same answer fingerprint across ≥2 cases but distinct route tags — only when semantic collapse_warning is false.
 */
function buildSameAnswerDifferentRouteRowKeys(
  rows: BulkEvalRunRowInput[],
  warnByQ: Map<number, boolean>
): Set<string> {
  const counts = buildQuestionFingerprintCounts(rows);
  const routesByFpKey = new Map<string, Set<string>>();
  const rowKeysByFpKey = new Map<string, string[]>();

  for (const r of rows) {
    const qn = r.questionNo;
    if (warnByQ.get(qn)) continue;
    const fk = fingerprintCountKey(r);
    if ((counts.get(fk) ?? 0) < 2) continue;
    const tag = (r.route_tag ?? "").trim() || "";
    const rt = tag.length ? tag : "—";
    const routeSet = routesByFpKey.get(fk) ?? new Set<string>();
    routeSet.add(rt);
    routesByFpKey.set(fk, routeSet);
    const arr = rowKeysByFpKey.get(fk) ?? [];
    arr.push(`${r.caseId}:${qn}`);
    rowKeysByFpKey.set(fk, arr);
  }

  const out = new Set<string>();
  for (const [fk, routeSet] of routesByFpKey) {
    if (routeSet.size < 2) continue;
    for (const k of rowKeysByFpKey.get(fk) ?? []) out.add(k);
  }
  return out;
}

/** ≥2 cases share fingerprint; semantic collapse_warning false; not already “different route” split. */
function buildRepeatFingerprintPairRowKeys(
  rows: BulkEvalRunRowInput[],
  warnByQ: Map<number, boolean>,
  sameAnswerDifferentRouteRowKeys: Set<string>
): Set<string> {
  const counts = buildQuestionFingerprintCounts(rows);
  const out = new Set<string>();
  for (const r of rows) {
    const qn = r.questionNo;
    if (warnByQ.get(qn)) continue;
    const rowKey = `${r.caseId}:${qn}`;
    if (sameAnswerDifferentRouteRowKeys.has(rowKey)) continue;
    if ((counts.get(fingerprintCountKey(r)) ?? 0) >= 2) {
      out.add(rowKey);
    }
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
  return [...text.matchAll(new RegExp(CASE_ANCHOR_PATTERN, "gi"))].length;
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
    const hasOffenceOrChargeWording =
      OFFENCE_OR_CASE_MARKERS.test(t) || CHARGE_OR_PARTICULARS_RE.test(t) || CASE_ANCHOR_RE_ANY.test(t);
    if (t.length > 35 && !hasOffenceOrChargeWording) {
      return "missing offence wording";
    }
    if (
      t.length > 120 &&
      /\b(in general|typically|generic case|without reviewing the bundle|not case-specific)\b/i.test(t) &&
      !hasStrongCaseAnchoring(t)
    ) {
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
      !CASE_ANCHOR_RE_ANY.test(t) &&
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

/**
 * Missing EX/MG-style anchors on long-form golden questions: blocking vs advisory-only
 * (advisory does not downgrade pass — surfaced via `bulkEvalAdvisoryNote`).
 */
function classifyGoldenAnchorFinding(qn: number, text: string): "blocking" | "advisory" | null {
  if (![3, 6, 7, 8, 9, 10].includes(qn)) return null;
  if (text.length < 55) return null;
  if (CASE_ANCHOR_RE_ANY.test(text) || OFFENCE_OR_CASE_MARKERS.test(text)) return null;
  if (
    text.length >= 480 &&
    /\b(Crown|defence|defense|disclosure|trial|witness|evidence|jury|PACE|burden|bundle|prosecution)\b/i.test(text)
  ) {
    return "advisory";
  }
  return "blocking";
}

export type BulkEvalCollapseRule =
  | null
  | "semantic_fingerprint"
  | "same_answer_different_source"
  | "repeat_fingerprint_pair"
  | "stem_clustering";

export type BulkEvalPresentCtx = {
  sweepMode: "golden_10" | "manual" | null;
  rows: BulkEvalRunRowInput[];
  semanticCollapseWarningByQuestion: Map<number, boolean>;
  semanticFingerprintCollapseRowKeys: Set<string>;
  sameAnswerDifferentRouteRowKeys: Set<string>;
  repeatFingerprintPairRowKeys: Set<string>;
  stemClusterKeys: Set<string>;
};

export function buildBulkEvalPresentCtx(
  rows: BulkEvalRunRowInput[],
  sweepMode: "golden_10" | "manual" | null
): BulkEvalPresentCtx {
  const semanticCollapseWarningByQuestion = buildSemanticCollapseWarningByQuestion(rows);
  const semanticFingerprintCollapseRowKeys = buildSemanticFingerprintCollapseRowKeys(
    rows,
    semanticCollapseWarningByQuestion
  );
  const sameAnswerDifferentRouteRowKeys = buildSameAnswerDifferentRouteRowKeys(rows, semanticCollapseWarningByQuestion);
  const repeatFingerprintPairRowKeys = buildRepeatFingerprintPairRowKeys(
    rows,
    semanticCollapseWarningByQuestion,
    sameAnswerDifferentRouteRowKeys
  );
  return {
    sweepMode,
    rows,
    semanticCollapseWarningByQuestion,
    semanticFingerprintCollapseRowKeys,
    sameAnswerDifferentRouteRowKeys,
    repeatFingerprintPairRowKeys,
    stemClusterKeys: bulkEvalStemClusterKeys(rows, sweepMode),
  };
}

export type BulkEvalPresentOutcome = {
  quality: EvalQualityLabel;
  /** Blocking / primary label for UI & exports. */
  issue: string;
  /** Non-downgrading QA hint (e.g. sparse EX/MG lines on an otherwise strong narrative). */
  advisory: string | null;
  /** Which repeat/collapse heuristic fired (debug bundle); null if not a collapse-class issue. */
  collapse_rule: BulkEvalCollapseRule;
};

/**
 * Single source of truth for final quality + blocking issue (+ optional advisory).
 * Keeps pass/weak/fail aligned with the issue string (no weak + "—", no pass + blocking anchor).
 */
export function computeBulkEvalRowPresent(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): BulkEvalPresentOutcome {
  const run = bulkEvalRunLabel(r);
  const text = rowText(r);
  const raw = r.answer || r.error || "";
  const tag = (r.route_tag ?? "").trim();
  const rowKey = `${r.caseId}:${r.questionNo}`;

  if (run === "timeout" || TIMEOUT_OR_ABORT_ANSWER_RE.test(raw)) {
    return { quality: "timeout", issue: "timeout", advisory: null, collapse_rule: null };
  }
  if (run === "error") {
    return { quality: "error", issue: "error", advisory: null, collapse_rule: null };
  }

  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) {
    return { quality: "fail", issue: "fallback", advisory: null, collapse_rule: null };
  }

  if (ctx.sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if (exp && tag !== exp) {
      return { quality: "fail", issue: "wrong route", advisory: null, collapse_rule: null };
    }
  }

  if (ctx.semanticFingerprintCollapseRowKeys.has(rowKey)) {
    return {
      quality: "weak",
      issue: "collapse/repeated answer (semantic fingerprint)",
      advisory: null,
      collapse_rule: "semantic_fingerprint",
    };
  }
  if (ctx.sameAnswerDifferentRouteRowKeys.has(rowKey)) {
    return {
      quality: "weak",
      issue: "same answer fingerprint, different route",
      advisory: null,
      collapse_rule: "same_answer_different_source",
    };
  }
  if (ctx.repeatFingerprintPairRowKeys.has(rowKey)) {
    return {
      quality: "weak",
      issue: "repeat source digest (≥2 cases)",
      advisory: null,
      collapse_rule: "repeat_fingerprint_pair",
    };
  }
  if (ctx.stemClusterKeys.has(rowKey)) {
    return {
      quality: "weak",
      issue: "stem clustering",
      advisory: null,
      collapse_rule: "stem_clustering",
    };
  }

  if (isSuspiciouslyShortAnswer(text, r.route_tag)) {
    return { quality: "weak", issue: "too short", advisory: null, collapse_rule: null };
  }

  let advisory: string | null = null;

  if (ctx.sweepMode === "golden_10" && run === "ok") {
    const stemIssue = goldenGenericStemIssue(r.questionNo, text);
    if (stemIssue) return { quality: "weak", issue: stemIssue, advisory: null, collapse_rule: null };

    const anchorTier = classifyGoldenAnchorFinding(r.questionNo, text);
    if (anchorTier === "blocking") {
      return { quality: "weak", issue: "missing case-specific anchor", advisory: null, collapse_rule: null };
    }
    if (anchorTier === "advisory") {
      advisory = "sparse bundle anchors (advisory)";
    }
  }

  const weakNow = r.weak || isEvalWeakAnswer(text, { route_tag: r.route_tag });
  if (weakNow) {
    let issue = "vague";
    if (ctx.sweepMode === "golden_10") {
      const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
      if ((r.questionNo === 1 || r.questionNo === 2) && exp && tag === exp) issue = "missing expected bundle wording";
      else if (r.questionNo === 5) issue = "invented fact risk";
    }
    return { quality: "weak", issue, advisory, collapse_rule: null };
  }

  const base = bulkEvalBaseQualityLabel(r, ctx.sweepMode);
  if (base === "pass") {
    return { quality: "pass", issue: "—", advisory, collapse_rule: null };
  }

  if (base === "timeout") return { quality: "timeout", issue: "timeout", advisory: null, collapse_rule: null };
  if (base === "error") return { quality: "error", issue: "error", advisory: null, collapse_rule: null };
  if (base === "fail") {
    const issue = tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag) ? "fallback" : "wrong route";
    return { quality: "fail", issue, advisory: null, collapse_rule: null };
  }

  let issue = "vague";
  if (ctx.sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if ((r.questionNo === 1 || r.questionNo === 2) && exp && tag === exp) issue = "missing expected bundle wording";
    else if (r.questionNo === 5) issue = "invented fact risk";
  }
  return { quality: "weak", issue, advisory, collapse_rule: null };
}

/**
 * Single human-readable blocking issue (same priority as {@link computeBulkEvalRowPresent}).
 */
export function bulkEvalIssue(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string {
  return computeBulkEvalRowPresent(r, ctx).issue;
}

/** Optional advisory line when quality stays pass (does not imply weak). */
export function bulkEvalAdvisoryNote(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string | null {
  return computeBulkEvalRowPresent(r, ctx).advisory;
}

function resolvedIssueFromPresent(p: BulkEvalPresentOutcome, r: BulkEvalRunRowInput): string {
  if (p.quality === "weak" || p.quality === "fail") {
    if (p.issue !== "—" && p.issue.trim().length > 0) return p.issue;
    const tag = (r.route_tag ?? "").trim();
    if (p.quality === "fail") return tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag) ? "fallback" : "wrong route";
    return "vague";
  }
  return p.issue;
}

/**
 * Human-readable issue for exports; never `"—"` when quality is weak/fail.
 */
export function bulkEvalResolvedFinalIssue(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string {
  return resolvedIssueFromPresent(computeBulkEvalRowPresent(r, ctx), r);
}

/** Final pass / weak / fail / timeout / error (same rules as {@link computeBulkEvalRowPresent}). */
export function bulkEvalQualityFinal(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): EvalQualityLabel {
  return computeBulkEvalRowPresent(r, ctx).quality;
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
  const snapshots = rows.map((r) => computeBulkEvalRowPresent(r, ctx));
  for (let i = 0; i < rows.length; i++) {
    const p = snapshots[i]!;
    if (p.quality === "pass") pass += 1;
    else if (p.quality === "weak") weak += 1;
    else if (p.quality === "fail") fail += 1;
    else timeoutError += 1;
  }

  let mainIssue = "None detected";
  if (rows.length === 0) mainIssue = "—";
  else {
    const issueRows = rows
      .map((r, i) => ({ r, iss: resolvedIssueFromPresent(snapshots[i]!, r) }))
      .filter((x) => x.iss !== "—");
    if (issueRows.length === 0) {
      mainIssue = "None detected";
    } else {
      const byIssue = new Map<string, { n: number; qs: Set<number> }>();
      for (const { r, iss } of issueRows) {
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
        "collapse/repeated answer (semantic fingerprint)",
        "same answer fingerprint, different route",
        "repeat source digest (≥2 cases)",
        "stem clustering",
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

/** Augments eval rows with `final_quality` / `final_issue` / `final_collapse_rule` (same logic as Defence Plan UI). */
export function bulkEvalBuildAugmentedRows<T extends BulkEvalRunRowInput>(
  rows: T[],
  sweepMode: "golden_10" | "manual" | null
): {
  ctx: BulkEvalPresentCtx;
  final_summary: BulkEvalFinalSummary;
  rows_augmented: Array<T & { final_quality: EvalQualityLabel; final_issue: string; final_collapse_rule: BulkEvalCollapseRule }>;
} {
  const ctx = buildBulkEvalPresentCtx(rows, sweepMode);
  const final_summary = bulkEvalSweepSummary(rows, ctx);
  const rows_augmented = rows.map((r) => {
    const p = computeBulkEvalRowPresent(r, ctx);
    return {
      ...r,
      final_quality: p.quality,
      final_issue: resolvedIssueFromPresent(p, r),
      final_collapse_rule: p.collapse_rule,
    };
  });
  return { ctx, final_summary, rows_augmented };
}
