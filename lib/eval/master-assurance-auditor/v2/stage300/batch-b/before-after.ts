/**
 * Batch-B before/after matrix for the four focus adapters + 43-control rollup.
 */

import type { BatchAAdapterId, BatchAControlStatus } from "../batch-a/constants";
import { BATCH_A_ESSENTIAL_OWNERSHIP } from "../batch-a/ownership";
import { BATCH_A_SIX_CONTROL_IDS } from "../batch-a/evaluators/constants";
import { BATCH_B_FOCUS_ADAPTER_IDS, type BatchBFocusAdapterId } from "./constants";

export type CapabilityCounts = {
  eligible: number;
  partial: number;
  unavailable: number;
};

export type AdapterBeforeAfter = {
  adapterId: BatchBFocusAdapterId;
  before: CapabilityCounts;
  after: CapabilityCounts;
  strongestHonestState: string;
};

/** Batch-A committed before totals for the four focus adapters (authority). */
export const BATCH_B_ADAPTER_BEFORE: Record<BatchBFocusAdapterId, CapabilityCounts> = {
  evidence_unit_identity_with_aliases: { eligible: 0, partial: 120, unavailable: 0 },
  source_vs_compiled_page_binding: { eligible: 0, partial: 120, unavailable: 0 },
  chase_item_to_evidence_unit_edges: { eligible: 0, partial: 120, unavailable: 0 },
  view_copy_export_api_pdf_composed_prose_capture: { eligible: 0, partial: 120, unavailable: 0 },
};

export function buildAdapterBeforeAfterMatrix(after: Record<BatchBFocusAdapterId, CapabilityCounts>): {
  schemaVersion: "stage300-batch-b-adapter-before-after@1.0.0";
  rows: AdapterBeforeAfter[];
  note: string;
} {
  const rows: AdapterBeforeAfter[] = BATCH_B_FOCUS_ADAPTER_IDS.map((adapterId) => ({
    adapterId,
    before: BATCH_B_ADAPTER_BEFORE[adapterId],
    after: after[adapterId],
    strongestHonestState:
      after[adapterId].eligible === 120
        ? "eligible_on_all_120_cohort_b_packets"
        : after[adapterId].partial > 0
          ? "partial_remaining"
          : "unavailable_remaining",
  }));
  return {
    schemaVersion: "stage300-batch-b-adapter-before-after@1.0.0",
    rows,
    note: "Four shared adapters hardened; adapter eligibility ≠ essential-control evaluator implementation.",
  };
}

export function buildEssential43BeforeAfter(args: {
  adapterEligibleCounts: Record<BatchAAdapterId, CapabilityCounts>;
}): {
  schemaVersion: "stage300-batch-b-43-before-after@1.0.0";
  controlCount: 43;
  unlockedEssentialControlIds: string[];
  remainingBlockedEssentialControlIds: string[];
  afterStatusTotals: Record<string, number>;
  rows: Array<{
    controlId: string;
    beforeStatus: BatchAControlStatus;
    afterStatus: BatchAControlStatus;
    batchBUnlocked: boolean;
    blockersRemaining: string[];
    realEligibleDenominator: number;
  }>;
  note: string;
} {
  const sixSet = new Set<string>(BATCH_A_SIX_CONTROL_IDS);
  const unlockedEssentialControlIds: string[] = [];
  const remainingBlockedEssentialControlIds: string[] = [];
  const afterStatusTotals: Record<string, number> = {};

  const rows = BATCH_A_ESSENTIAL_OWNERSHIP.map((own) => {
    // Batch B does not unlock any of the 43 essential controls for substantive evaluators:
    // EVS/CHS/ATR/XEX deepen-partials are outside the essential register; AUD/XPP need audience packs;
    // ELD/VDR need version-pair adapters; SRC need OCR; Batch-A six remain specialty-field blocked.
    const afterStatus: BatchAControlStatus = sixSet.has(own.controlId)
      ? "substantive_evaluator_implemented_pending_review"
      : own.beforeStatus;

    afterStatusTotals[afterStatus] = (afterStatusTotals[afterStatus] ?? 0) + 1;
    remainingBlockedEssentialControlIds.push(own.controlId);

    const adapterCounts =
      own.owningAdapterId && args.adapterEligibleCounts[own.owningAdapterId]
        ? args.adapterEligibleCounts[own.owningAdapterId]
        : { eligible: 0, partial: 0, unavailable: 120 };

    return {
      controlId: own.controlId,
      beforeStatus: sixSet.has(own.controlId)
        ? ("substantive_evaluator_implemented_pending_review" as BatchAControlStatus)
        : own.beforeStatus,
      afterStatus,
      batchBUnlocked: false,
      blockersRemaining: [
        own.stage300AcceptanceRequirement,
        sixSet.has(own.controlId)
          ? "Batch-A evaluator pending review; specialty bags still absent (eligible denominator 0)"
          : "Out of Batch-B evidence/provenance/chase/multi-exit evaluator unlock set",
      ],
      realEligibleDenominator: sixSet.has(own.controlId) ? 0 : adapterCounts.eligible > 0 && own.batchAInScope ? 0 : 0,
    };
  });

  return {
    schemaVersion: "stage300-batch-b-43-before-after@1.0.0",
    controlCount: 43,
    unlockedEssentialControlIds,
    remainingBlockedEssentialControlIds,
    afterStatusTotals,
    rows,
    note:
      "Batch B completed four adapter foundations to eligible@120. Zero essential-43 controls gained genuine structured prerequisites for new substantive evaluators. Do not count adapters as detectors.",
  };
}
