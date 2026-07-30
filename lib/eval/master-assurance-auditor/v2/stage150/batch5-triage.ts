/**
 * Batch-5 candidate triage — separates detector FPs, source uncertainty, app defects.
 * Does not repair CaseBrain application wording.
 */

import crypto from "node:crypto";
import { classifyFid10Quotation } from "./fid10-calibration";
import type { Stage150Hit } from "./detectors";
import { ZERO_CANDIDATE_RATE_NOTE } from "./batch5-implemented";

export type Batch5TriageBucket =
  | "confirmed_app_defect"
  | "output_intrinsic_confirmed_app_defect"
  | "detector_false_positive"
  | "unresolved_source"
  | "truth_key_defect"
  | "duplicate_occurrence"
  | "safe_qualified_output";

export type Batch5Candidate = {
  candidateId: string;
  caseId: string;
  controlId: string;
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  plainEnglish: string;
  surface: string;
  outputSha256: string;
  candidateClass: string;
};

export type Batch5TriageRow = Batch5Candidate & {
  bucket: Batch5TriageBucket;
  rootCauseFamily: string;
  reason: string;
  truthOpened: false;
};

export type Batch5ControlRateRow = {
  total: number;
  byBucket: Partial<Record<Batch5TriageBucket, number>>;
  /** null when candidate denominator is 0 — never report 0/0 as a zero rate. */
  fpRate: number | null;
  unresolvedRate: number | null;
  confirmedRate: number | null;
  humanFpFnRecall: "unavailable" | "measured";
  rateHonestyNote: string | null;
  occurrenceDenominator: number;
  caseDenominatorNote: string;
  stringDenominatorNote: string;
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function candidateIdFromHit(caseId: string, h: Stage150Hit): string {
  return `B5C-${sha256(`${h.controlId}|${h.occurrenceRef}|${h.findingCode}|${caseId}|${h.exactWording}`).slice(0, 28)}`;
}

export function hitToCandidate(
  caseId: string,
  h: Stage150Hit,
  outputSha256: string,
): Batch5Candidate {
  return {
    candidateId: candidateIdFromHit(caseId, h),
    caseId,
    controlId: h.controlId,
    findingCode: h.findingCode,
    occurrenceRef: h.occurrenceRef,
    exactWording: h.exactWording,
    plainEnglish: h.plainEnglish,
    surface: h.occurrenceRef,
    outputSha256,
    candidateClass: h.candidateClass,
  };
}

/**
 * Output-only triage (truthOpened=false). Control-specific root-cause families.
 */
export function triageCandidate(c: Batch5Candidate): Batch5TriageRow {
  const t = c.exactWording.trim();

  if (c.candidateClass === "formatting_or_noise") {
    return {
      ...c,
      bucket: "detector_false_positive",
      rootCauseFamily: "formatting_noise",
      reason: "Candidate class formatting_or_noise — detector FP.",
      truthOpened: false,
    };
  }

  if (c.controlId === "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK") {
    return {
      ...c,
      bucket: "output_intrinsic_confirmed_app_defect",
      rootCauseFamily: "solicitor_visible_internal_audit_leak",
      reason:
        "Internal/audit text is visible on a solicitor-facing output surface. Confirmable from output alone — does not require opening the source truth. Occurrence/case/string denominators kept separate.",
      truthOpened: false,
    };
  }

  if (c.controlId === "MAA2-FID-10-QUOTATION-FIDELITY") {
    const classified = classifyFid10Quotation({
      ref: c.occurrenceRef,
      text: c.exactWording,
      output: {},
    });
    if (classified.family === "detector_false_positive" || classified.family === "heading_label_formatting") {
      return {
        ...c,
        bucket: "detector_false_positive",
        rootCauseFamily: classified.family,
        reason: classified.reason,
        truthOpened: false,
      };
    }
    if (classified.family === "qualified_unknown_provenance") {
      return {
        ...c,
        bucket: "safe_qualified_output",
        rootCauseFamily: classified.family,
        reason: classified.reason,
        truthOpened: false,
      };
    }
    if (classified.family === "provenance_in_linked_field") {
      return {
        ...c,
        bucket: "safe_qualified_output",
        rootCauseFamily: classified.family,
        reason: classified.reason,
        truthOpened: false,
      };
    }
    if (classified.emitUnresolvedCandidate) {
      return {
        ...c,
        bucket: "unresolved_source",
        rootCauseFamily: classified.family,
        reason: classified.reason,
        truthOpened: false,
      };
    }
  }

  if (c.controlId === "MAA2-WRD-02-NO-MID-TRUNCATION") {
    if (/^[A-Z][A-Za-z]{0,20}-\s*$/.test(t) && !/[a-z]{3,}-\s*$/.test(t)) {
      return {
        ...c,
        bucket: "detector_false_positive",
        rootCauseFamily: "hyphen_soft_wrap_or_heading",
        reason: "Title-case token with trailing hyphen — soft-wrap/heading FP, not mid-word truncation.",
        truthOpened: false,
      };
    }
  }

  if (c.controlId === "MAA2-WRD-10-NO-PLACEHOLDERS") {
    if (/\bfixture\b/i.test(t) && !/\b(TODO|FIXME|\{\{)/i.test(t) && !/\bCaseBrain\s+dev\b/i.test(t)) {
      if (/\b(light|plumbing|tenant|landlord|fitting)\b/i.test(t)) {
        return {
          ...c,
          bucket: "detector_false_positive",
          rootCauseFamily: "legal_fixture_homonym",
          reason: "Homonym 'fixture' in property/fitting sense — not developer leak.",
          truthOpened: false,
        };
      }
    }
  }

  if (c.controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF") {
    if (/\bdo\s+not\s+(state|say|claim).{0,40}proves beyond/i.test(t)) {
      return {
        ...c,
        bucket: "safe_qualified_output",
        rootCauseFamily: "meta_do_not_state_warning",
        reason: "Meta do-not-state warning wrapping absolute-proof phrase — safe qualified output.",
        truthOpened: false,
      };
    }
  }

  if (c.candidateClass === "human_review_required" || c.candidateClass === "unresolved") {
    return {
      ...c,
      bucket: "unresolved_source",
      rootCauseFamily: "human_review_or_unresolved_class",
      reason: `Candidate class ${c.candidateClass} — unresolved pending source/review; truth not opened.`,
      truthOpened: false,
    };
  }

  return {
    ...c,
    bucket: "confirmed_app_defect",
    rootCauseFamily: "solicitor_visible_wording_defect",
    reason: "Output-only triage: candidate_defect on included solicitor-visible wording.",
    truthOpened: false,
  };
}

export function markDuplicateOccurrences(rows: Batch5TriageRow[]): Batch5TriageRow[] {
  const seen = new Map<string, string>();
  return rows.map((r) => {
    const key = `${r.controlId}|${r.occurrenceRef}|${sha256(r.exactWording).slice(0, 16)}`;
    const first = seen.get(key);
    if (first && first !== r.candidateId) {
      return {
        ...r,
        bucket: "duplicate_occurrence" as const,
        rootCauseFamily: "duplicate_occurrence",
        reason: `Duplicate of ${first}`,
        truthOpened: false as const,
      };
    }
    if (!first) seen.set(key, r.candidateId);
    return r;
  });
}

function emptyBucketCounts(): Record<Batch5TriageBucket, number> {
  return {
    confirmed_app_defect: 0,
    output_intrinsic_confirmed_app_defect: 0,
    detector_false_positive: 0,
    unresolved_source: 0,
    truth_key_defect: 0,
    duplicate_occurrence: 0,
    safe_qualified_output: 0,
  };
}

export function buildControlRateRow(
  controlId: string,
  rows: Batch5TriageRow[],
): Batch5ControlRateRow {
  const mine = rows.filter((r) => r.controlId === controlId);
  const byBucket: Partial<Record<Batch5TriageBucket, number>> = {};
  for (const r of mine) {
    byBucket[r.bucket] = (byBucket[r.bucket] ?? 0) + 1;
  }
  const total = mine.length;
  if (total === 0) {
    return {
      total: 0,
      byBucket,
      fpRate: null,
      unresolvedRate: null,
      confirmedRate: null,
      humanFpFnRecall: "unavailable",
      rateHonestyNote: ZERO_CANDIDATE_RATE_NOTE,
      occurrenceDenominator: 0,
      caseDenominatorNote: "case denominator = 499 calibration population (separate from candidates)",
      stringDenominatorNote: "string/template denominators not conflated with candidate rates",
    };
  }
  const confirmed =
    (byBucket.confirmed_app_defect ?? 0) + (byBucket.output_intrinsic_confirmed_app_defect ?? 0);
  return {
    total,
    byBucket,
    fpRate: (byBucket.detector_false_positive ?? 0) / total,
    unresolvedRate: (byBucket.unresolved_source ?? 0) / total,
    confirmedRate: confirmed / total,
    humanFpFnRecall: "unavailable",
    rateHonestyNote: null,
    occurrenceDenominator: total,
    caseDenominatorNote: "case denominator = 499 calibration population (separate from candidates)",
    stringDenominatorNote: "string/template denominators not conflated with candidate rates",
  };
}

export function triageSummary(rows: Batch5TriageRow[]): {
  total: number;
  byBucket: Record<Batch5TriageBucket, number>;
  byControl: Record<string, Batch5ControlRateRow>;
} {
  const byBucket = emptyBucketCounts();
  const controlIds = new Set(rows.map((r) => r.controlId));
  for (const r of rows) byBucket[r.bucket] += 1;
  const byControl: Record<string, Batch5ControlRateRow> = {};
  for (const id of controlIds) {
    byControl[id] = buildControlRateRow(id, rows);
  }
  return { total: rows.length, byBucket, byControl };
}

/**
 * Advisory check only — does not mutate the immutable promotion registry.
 */
export function promotionDecision(args: {
  controlId: string;
  contractResolutionOk: boolean;
  triage: Batch5ControlRateRow;
}): { promote: boolean; reason: string } {
  if (!args.contractResolutionOk) {
    return { promote: false, reason: "Contract IDs do not all resolve to executed checks." };
  }
  if (args.triage.total === 0) {
    return {
      promote: true,
      reason: ZERO_CANDIDATE_RATE_NOTE,
    };
  }
  if (args.triage.fpRate != null && args.triage.fpRate > 0.25) {
    return {
      promote: false,
      reason: `FP rate ${args.triage.fpRate.toFixed(3)} > 0.25 — remains partially_implemented pending detector correction.`,
    };
  }
  if (args.triage.unresolvedRate != null && args.triage.unresolvedRate > 0.5) {
    return {
      promote: false,
      reason: `Unresolved rate ${args.triage.unresolvedRate.toFixed(3)} > 0.5 — remains partially_implemented.`,
    };
  }
  return {
    promote: true,
    reason: `Contracts resolve; FP=${args.triage.fpRate?.toFixed(3)}; unresolved=${args.triage.unresolvedRate?.toFixed(3)}; confirmed=${args.triage.confirmedRate?.toFixed(3)}.`,
  };
}
