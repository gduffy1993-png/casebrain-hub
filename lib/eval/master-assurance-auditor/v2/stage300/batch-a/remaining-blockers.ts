/**
 * Remaining essential blockers after Batch-A shared adapters.
 */

import type { BatchABeforeAfterRow } from "./before-after";
import { BATCH_A_ESSENTIAL_OWNERSHIP } from "./ownership";

export function buildRemainingEssentialBlockerRegister(args: {
  beforeAfterRows: BatchABeforeAfterRow[];
}): {
  schemaVersion: "stage300-batch-a-remaining-essential-blocker-register@1.0.0";
  essentialControlCount: 43;
  fullyImplementedCount: 0;
  rows: Array<{
    controlId: string;
    afterStatus: string;
    batchAInScope: boolean;
    owningAdapterId: string | null;
    blockersRemaining: string[];
    nextRequiredWork: string;
    realEligibleDenominator: number;
  }>;
  summary: {
    adapter_foundation_only: number;
    unavailable_missing_real_input: number;
    specified_not_implemented: number;
    partially_implemented_pending_calibration: number;
    substantive_evaluator_implemented: number;
    substantive_evaluator_implemented_pending_review: number;
    outOfBatchAScope: number;
  };
  note: string;
} {
  const summary = {
    adapter_foundation_only: 0,
    unavailable_missing_real_input: 0,
    specified_not_implemented: 0,
    partially_implemented_pending_calibration: 0,
    substantive_evaluator_implemented: 0,
    substantive_evaluator_implemented_pending_review: 0,
    outOfBatchAScope: 0,
  };

  const rows = args.beforeAfterRows.map((r) => {
    if (r.afterStatus in summary) {
      (summary as Record<string, number>)[r.afterStatus] += 1;
    }
    if (!r.batchAInScope) summary.outOfBatchAScope += 1;
    return {
      controlId: r.controlId,
      afterStatus: r.afterStatus,
      batchAInScope: r.batchAInScope,
      owningAdapterId: r.owningAdapterId,
      blockersRemaining: r.blockersRemaining,
      nextRequiredWork: r.nextRequiredWork,
      realEligibleDenominator: r.realEligibleDenominator,
    };
  });

  if (rows.length !== BATCH_A_ESSENTIAL_OWNERSHIP.length) {
    throw new Error("Remaining blocker register must cover all 43 essential controls");
  }

  return {
    schemaVersion: "stage300-batch-a-remaining-essential-blocker-register@1.0.0",
    essentialControlCount: 43,
    fullyImplementedCount: 0,
    rows,
    summary,
    note:
      "No essential control is fully implemented after Batch A. Adapters ≠ evaluators ≠ calibration ≠ Stage-300 PASS.",
  };
}
