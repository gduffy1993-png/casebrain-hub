/**
 * Before/after status for the 43 essential controls after Batch-A adapters + six evaluators.
 * Schemas/adapters/evaluators never auto-promote into the immutable implemented registry.
 */

import type { BatchAAdapterId, BatchAControlStatus } from "./constants";
import { BATCH_A_ESSENTIAL_OWNERSHIP } from "./ownership";
import { BATCH_A_SIX_CONTROL_IDS, type BatchASixControlId } from "./evaluators/constants";

export type BatchABeforeAfterRow = {
  controlId: string;
  theme: string;
  batchAInScope: boolean;
  owningAdapterId: BatchAAdapterId | null;
  beforeStatus: BatchAControlStatus;
  afterStatus: BatchAControlStatus;
  blockerRemoved: string | null;
  blockersRemaining: string[];
  realEligibleDenominator: number;
  realPartialDenominator: number;
  realUnavailableDenominator: number;
  scanUniverse: 120;
  nextRequiredWork: string;
  calibrationPending: boolean;
  substantiveEvaluatorImplemented: boolean;
  promotedToImmutableImplementedRegistry: false;
};

export type SixControlExerciseCounts = Record<
  BatchASixControlId,
  { eligible: number; partial: number; unavailable: number; candidateCount: number }
>;

export function buildBeforeAfterMatrix(args: {
  adapterEligibleCounts: Record<BatchAAdapterId, { eligible: number; partial: number; unavailable: number }>;
  sixControlExerciseCounts?: SixControlExerciseCounts;
  sixEvaluatorsImplemented?: boolean;
}): {
  schemaVersion: "stage300-batch-a-43-before-after@1.1.0";
  controlCount: number;
  inScopeCount: number;
  outOfScopeCount: number;
  afterStatusTotals: Record<string, number>;
  rows: BatchABeforeAfterRow[];
} {
  const sixSet = new Set<string>(BATCH_A_SIX_CONTROL_IDS);
  const rows: BatchABeforeAfterRow[] = BATCH_A_ESSENTIAL_OWNERSHIP.map((own) => {
    if (!own.batchAInScope || !own.owningAdapterId) {
      return {
        controlId: own.controlId,
        theme: own.theme,
        batchAInScope: false,
        owningAdapterId: null,
        beforeStatus: own.beforeStatus,
        afterStatus: own.beforeStatus,
        blockerRemoved: null,
        blockersRemaining: [
          own.stage300AcceptanceRequirement,
          "Out of Batch-A shared structured-adapter / six-evaluator scope",
        ],
        realEligibleDenominator: 0,
        realPartialDenominator: 0,
        realUnavailableDenominator: 120,
        scanUniverse: 120,
        nextRequiredWork: own.stage300AcceptanceRequirement,
        calibrationPending: true,
        substantiveEvaluatorImplemented: false,
        promotedToImmutableImplementedRegistry: false,
      };
    }

    const isSix = sixSet.has(own.controlId);
    const exercise = isSix
      ? args.sixControlExerciseCounts?.[own.controlId as BatchASixControlId]
      : undefined;
    const adapterCounts = args.adapterEligibleCounts[own.owningAdapterId] ?? {
      eligible: 0,
      partial: 0,
      unavailable: 120,
    };

    if (isSix && args.sixEvaluatorsImplemented) {
      const eligible = exercise?.eligible ?? 0;
      const partial = exercise?.partial ?? 0;
      const unavailable = exercise?.unavailable ?? 120;
      let afterStatus: BatchAControlStatus = "substantive_evaluator_implemented_pending_review";
      if (eligible === 0 && partial === 0) {
        // Evaluator exists; corpus cannot exercise — still pending review, not foundation-only.
        afterStatus = "substantive_evaluator_implemented_pending_review";
      }

      return {
        controlId: own.controlId,
        theme: own.theme,
        batchAInScope: true,
        owningAdapterId: own.owningAdapterId,
        beforeStatus: "adapter_foundation_only",
        afterStatus,
        blockerRemoved:
          "Substantive named evaluator implemented with contracts; blind 120 calibration executed (not promoted)",
        blockersRemaining: [
          "Not promoted to immutable implemented registry",
          "Human rates unavailable; no FP/FN/recall claims",
          eligible === 0
            ? `Corpus eligible denominator=0 (partial=${partial}, unavailable=${unavailable}) — specialty structured fields largely absent on Stage-150 packets`
            : "Pending human technical review of calibration dispositions",
          own.stage300AcceptanceRequirement,
        ],
        realEligibleDenominator: eligible,
        realPartialDenominator: partial,
        realUnavailableDenominator: unavailable,
        scanUniverse: 120,
        nextRequiredWork:
          eligible === 0
            ? `Populate genuine specialty fields for ${own.controlId} on Stage-300 packets; re-calibrate; human review before any promotion.`
            : `Human review of candidates/dispositions for ${own.controlId}; promotion only after Stage-300 acceptance gates.`,
        calibrationPending: true,
        substantiveEvaluatorImplemented: true,
        promotedToImmutableImplementedRegistry: false,
      };
    }

    // Adapter-only path (should not hit for six once evaluators land)
    let afterStatus: BatchAControlStatus = "adapter_foundation_only";
    if (adapterCounts.eligible === 0 && adapterCounts.partial === 0) {
      afterStatus = "unavailable_missing_real_input";
    }
    return {
      controlId: own.controlId,
      theme: own.theme,
      batchAInScope: true,
      owningAdapterId: own.owningAdapterId,
      beforeStatus: own.beforeStatus,
      afterStatus,
      blockerRemoved: "Shared Batch-A structured adapter registered",
      blockersRemaining: [
        "Substantive evaluator still required",
        own.stage300AcceptanceRequirement,
      ],
      realEligibleDenominator: adapterCounts.eligible,
      realPartialDenominator: adapterCounts.partial,
      realUnavailableDenominator: adapterCounts.unavailable,
      scanUniverse: 120,
      nextRequiredWork: `Implement substantive evaluator for ${own.controlId}.`,
      calibrationPending: true,
      substantiveEvaluatorImplemented: false,
      promotedToImmutableImplementedRegistry: false,
    };
  });

  const afterStatusTotals: Record<string, number> = {};
  for (const r of rows) {
    afterStatusTotals[r.afterStatus] = (afterStatusTotals[r.afterStatus] ?? 0) + 1;
  }

  return {
    schemaVersion: "stage300-batch-a-43-before-after@1.1.0",
    controlCount: rows.length,
    inScopeCount: rows.filter((r) => r.batchAInScope).length,
    outOfScopeCount: rows.filter((r) => !r.batchAInScope).length,
    afterStatusTotals,
    rows,
  };
}
