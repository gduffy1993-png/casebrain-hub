/**
 * Shared truth-map ↔ expectation binding for MAA-EVIDENCE-STATE.
 * No case-ID / fixture-specific patches — unit identity only.
 */

import {
  evidenceUnitsAreDistinct,
  sameEvidenceUnitIdentity,
} from "./evidence-unit-identity";
import {
  isAggregateLedgerLabel,
  isCustodyPaceBlendLabel,
  isMg6ClarificationMetaLabel,
  isRecordingTranscriptBlendLabel,
} from "@/lib/eval/evidence-state-audit/partial-media";
import { wordingIndicatesReferredOnly } from "@/lib/criminal/evidence-state-reconcile";
import { normaliseStateToken } from "./evidence-state-compare";

export type TruthMapBindRow = {
  label: string;
  existence: string;
  reliability: string;
};

export type BindResult =
  | { ok: true; row: TruthMapBindRow; score: number; reason: string }
  | {
      ok: false;
      reason:
        | "no_candidate"
        | "aggregate_meta_row"
        | "mg6_clarification_meta"
        | "blended_identity"
        | "distinct_unit_version"
        | "weak_score";
      detail: string;
    };

function stripStatusTail(label: string): string {
  return label
    .replace(/^\*+/, "")
    .replace(/\*\*/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*[—\-]\s*(outstanding|partial on export|served on export|referred on mg6.*)$/i, "")
    .trim();
}

function tokenOverlapScore(a: string, b: string): number {
  const stop = new Set([
    "record",
    "records",
    "material",
    "evidence",
    "document",
    "file",
    "copy",
    "full",
    "the",
    "and",
    "for",
    "with",
  ]);
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !stop.has(t));
  const A = new Set(tokens(a));
  const B = tokens(b);
  if (!A.size || !B.length) return 0;
  const hit = B.filter((t) => A.has(t)).length;
  return hit / Math.max(A.size, B.length);
}

function isNonBindableMetaRow(label: string): boolean {
  if (isAggregateLedgerLabel(label)) return true;
  if (isMg6ClarificationMetaLabel(label)) return true;
  if (isRecordingTranscriptBlendLabel(label)) return true;
  if (isCustodyPaceBlendLabel(label)) return true;
  if (/^\*Source (?:section|A|B)/i.test(label) || /^Source (?:section|A|B)/i.test(label)) {
    return true;
  }
  // Index / section chrome
  if (/^===\s*section:/i.test(label)) return true;
  if (/^\|/.test(label) || /\|\s*\d/.test(label) && /charge sheet|mg5 case summary/i.test(label)) {
    // "Charge sheet | 1 |" index rows — allow bind only if no better candidate later
  }
  if (/^uncertain on papers:/i.test(label)) return true;
  return false;
}

function stateAlignmentBonus(
  expectedState: string | undefined,
  row: TruthMapBindRow,
): number {
  if (!expectedState) return 0;
  const exp = normaliseStateToken(expectedState);
  const act = normaliseStateToken(row.existence);
  if (exp === act) return 0.45;
  if (exp === "referred_only" && wordingIndicatesReferredOnly(row.label)) return 0.4;
  if (exp === "referred_only" && act === "missing" && !wordingIndicatesReferredOnly(row.label)) {
    return -0.35;
  }
  if (exp === "missing" && wordingIndicatesReferredOnly(row.label)) return -0.5;
  if (exp === "missing" && act === "referred_only") return -0.5;
  if (exp === "served" && act === "incomplete" && /\bpartial\b/i.test(row.label)) return -0.25;
  if (exp === "served" && act !== "served") return -0.55;
  if (exp === "incomplete" && act === "served" && /\bserved on bundle\b/i.test(row.label)) {
    // Prefer not to bind a clean served schedule line to an incomplete expectation
    // when a better incomplete sibling may exist; small penalty only.
    return -0.15;
  }
  return 0;
}

/**
 * Find the best truth-map row for an expected evidence item.
 * Aggregate/meta/blended rows are never eligible.
 * Prefer state-aligned schedule lines over chase generic labels.
 */
export function bindTruthMapRowForExpectation(input: {
  evidenceItem: string;
  rows: TruthMapBindRow[];
  expectedState?: string | null;
}): BindResult {
  const item = input.evidenceItem.trim();
  if (!item) {
    return { ok: false, reason: "no_candidate", detail: "empty evidence item" };
  }

  let best: { row: TruthMapBindRow; score: number; reason: string } | null = null;

  for (const row of input.rows) {
    if (isNonBindableMetaRow(row.label)) continue;

    const core = stripStatusTail(row.label);
    if (evidenceUnitsAreDistinct(item, core) || evidenceUnitsAreDistinct(item, row.label)) {
      continue;
    }

    if (/^mg6$/i.test(item) && /clarification|unused schedule/i.test(row.label)) {
      continue;
    }

    let score = 0;
    let reason = "token_overlap";

    if (sameEvidenceUnitIdentity(item, core) || sameEvidenceUnitIdentity(item, row.label)) {
      score = 0.9;
      reason = "same_unit_identity";
    } else {
      const overlap = Math.max(tokenOverlapScore(item, core), tokenOverlapScore(item, row.label));
      const contains =
        core.toLowerCase().includes(item.toLowerCase()) ||
        row.label.toLowerCase().includes(item.toLowerCase()) ||
        item.toLowerCase().includes(core.toLowerCase().slice(0, Math.min(24, core.length)));
      score = overlap;
      if (contains && item.length >= 4) score = Math.max(score, 0.55);
      reason = contains ? "label_contains" : "token_overlap";
    }

    const itemCode = item.match(/\bMG6C\/[A-Z0-9]+\b/i)?.[0];
    const rowCode = row.label.match(/\bMG6C\/[A-Z0-9]+\b/i)?.[0];
    if (itemCode && rowCode && itemCode.toLowerCase() === rowCode.toLowerCase()) {
      score = Math.max(score, 0.95);
      reason = "schedule_code";
    }
    // Prefer MG6C schedule lines over short chase labels for the same unit
    if (/\bMG6C\//i.test(row.label) && score >= 0.45) {
      score += 0.12;
      reason = `${reason}+schedule_line`;
    }
    // Prefer longer, more specific labels when overlap is similar
    if (row.label.length > item.length + 10 && score >= 0.5) {
      score += 0.05;
    }

    score += stateAlignmentBonus(input.expectedState ?? undefined, row);

    if (!best || score > best.score) {
      best = { row, score, reason };
    }
  }

  if (!best) {
    return {
      ok: false,
      reason: "no_candidate",
      detail: `No non-meta truth-map row for "${item}"`,
    };
  }
  if (best.score < 0.5) {
    return {
      ok: false,
      reason: "weak_score",
      detail: `Best score ${best.score.toFixed(2)} below bind threshold for "${item}" vs "${best.row.label}"`,
    };
  }
  return { ok: true, row: best.row, score: best.score, reason: best.reason };
}

export function isEligibleTruthMapBindLabel(label: string): boolean {
  return !isNonBindableMetaRow(label);
}
