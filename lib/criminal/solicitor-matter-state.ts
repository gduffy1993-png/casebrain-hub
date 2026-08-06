/**
 * One matter-state VM for solicitor tabs + exports — always derived from CanonicalMatterStateV1.
 * Independent recount paths are removed; fingerprint is the canonical fingerprint.
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  buildCanonicalMatterStateV1,
  type CanonicalMatterStateV1,
} from "@/lib/criminal/canonical-matter-state";
import { dedupeEvidenceAliases } from "@/lib/criminal/evidence-alias-dedupe";

export { dedupeEvidenceAliases } from "@/lib/criminal/evidence-alias-dedupe";

export type EvidenceExistenceBucket =
  | "served"
  | "referred"
  | "missing"
  | "incomplete"
  | "notSafelyConfirmed";

export type ChaseStatusBucket =
  | "total"
  | "overdue"
  | "dueSoon"
  | "chased"
  | "received"
  | "notStarted";

export type Mg11Status = "served" | "draft_or_unsigned" | "referred" | "missing" | "not_on_file";

export type SolicitorMatterStateVm = {
  evidence: {
    rows: FiveAnswersEvidenceRow[];
    counts: Record<EvidenceExistenceBucket, number>;
  };
  chase: {
    counts: Record<ChaseStatusBucket, number>;
  };
  mg11: {
    status: Mg11Status;
    label: string;
  };
  /** CanonicalMatterStateV1.fingerprint — cross-tab equality. */
  fingerprint: string;
  /** Schema version consumed. */
  canonicalSchemaVersion: string;
};

export type ChaseCounterInput = {
  total: number;
  overdue: number;
  dueSoon: number;
  chased: number;
  received: number;
  notStarted: number;
};

function projectFromCanonical(
  canonical: CanonicalMatterStateV1,
  rows: FiveAnswersEvidenceRow[],
): SolicitorMatterStateVm {
  return {
    evidence: {
      rows,
      counts: {
        served: canonical.evidence.counts.served,
        referred: canonical.evidence.counts.referred,
        missing: canonical.evidence.counts.missing,
        incomplete: canonical.evidence.counts.incomplete,
        notSafelyConfirmed: canonical.evidence.counts.notSafelyConfirmed,
      },
    },
    chase: {
      counts: {
        total: canonical.chase.counts.total,
        overdue: canonical.chase.counts.overdue,
        dueSoon: canonical.chase.counts.dueSoon,
        chased: canonical.chase.counts.chased,
        received: canonical.chase.counts.received,
        notStarted: canonical.chase.counts.notStarted,
      },
    },
    mg11: {
      status: canonical.mg11.status as Mg11Status,
      label: canonical.mg11.label,
    },
    fingerprint: canonical.fingerprint,
    canonicalSchemaVersion: canonical.schemaVersion,
  };
}

/** Build matter-state VM from CanonicalMatterStateV1 (preferred). */
export function buildSolicitorMatterStateVmFromCanonical(
  canonical: CanonicalMatterStateV1,
  evidenceRows: FiveAnswersEvidenceRow[],
): SolicitorMatterStateVm {
  return projectFromCanonical(canonical, dedupeEvidenceAliases(evidenceRows));
}

/**
 * Build the single matter-state VM — counts/MG11/fingerprint from canonical only.
 */
export function buildSolicitorMatterStateVm(input: {
  evidenceRows: FiveAnswersEvidenceRow[];
  chaseCounters: ChaseCounterInput;
  allegation?: string | null;
  bundleHay?: string | null;
  caseId?: string | null;
  chaseLabels?: string[];
}): SolicitorMatterStateVm {
  const rows = dedupeEvidenceAliases(input.evidenceRows);
  const chaseItems = input.chaseLabels?.length
    ? input.chaseLabels.map((label, i) => ({
        id: `ch_label_${i}`,
        label,
        baseStatus: "Overdue",
      }))
    : Array.from({ length: Math.max(0, input.chaseCounters.total) }, (_, i) => {
        let baseStatus = "Not started";
        if (i < input.chaseCounters.overdue) baseStatus = "Overdue";
        else if (i < input.chaseCounters.overdue + input.chaseCounters.dueSoon) baseStatus = "Due soon";
        else if (i < input.chaseCounters.overdue + input.chaseCounters.dueSoon + input.chaseCounters.chased) {
          baseStatus = "Chased";
        } else if (
          i <
          input.chaseCounters.overdue +
            input.chaseCounters.dueSoon +
            input.chaseCounters.chased +
            input.chaseCounters.received
        ) {
          baseStatus = "Received";
        }
        return { id: `ch_slot_${i}`, label: `Chase item ${i + 1}`, baseStatus };
      });

  const canonical = buildCanonicalMatterStateV1({
    caseId: input.caseId,
    allegation: input.allegation,
    bundleHay: input.bundleHay,
    evidenceRows: rows,
    chaseItems,
  });

  return projectFromCanonical(canonical, rows);
}

export function formatEvidenceCountsLine(counts: Record<EvidenceExistenceBucket, number>): string {
  const parts: string[] = [];
  if (counts.served) parts.push(`${counts.served} served`);
  if (counts.referred) parts.push(`${counts.referred} referred`);
  if (counts.missing) parts.push(`${counts.missing} missing`);
  if (counts.incomplete) parts.push(`${counts.incomplete} incomplete`);
  if (counts.notSafelyConfirmed) parts.push(`${counts.notSafelyConfirmed} not safely confirmed`);
  return parts.length ? parts.join(" · ") : "No evidence states listed";
}
