/**
 * Batch-B adapter registry + remaining blockers + evaluator honesty.
 */

import { BATCH_A_ADAPTER_IDS, type BatchAAdapterId } from "../batch-a/constants";
import { BATCH_A_ESSENTIAL_OWNERSHIP } from "../batch-a/ownership";
import { BATCH_A_SIX_CONTROL_IDS } from "../batch-a/evaluators/constants";
import {
  BATCH_B_BASELINE,
  BATCH_B_FOCUS_ADAPTER_IDS,
  BATCH_B_SCHEMA_VERSION,
  type BatchBFocusAdapterId,
} from "./constants";
import type { CapabilityCounts } from "./before-after";

export function buildBatchBAdapterRegistry(args: {
  after: Record<BatchBFocusAdapterId, CapabilityCounts>;
}): {
  schemaVersion: "stage300-batch-b-adapter-registry@1.1.0";
  baselineCommit: typeof BATCH_B_BASELINE;
  batchBSchemaVersion: typeof BATCH_B_SCHEMA_VERSION;
  focusAdapterCount: 4;
  adapters: Array<{
    adapterId: BatchBFocusAdapterId;
    status: "adapter_foundation_dual_status";
    substantiveEvaluatorImplemented: false;
    calibrationPending: true;
    namedControlExerciseStatus: "not_exercised";
    afterNamedPrerequisite: CapabilityCounts;
    note: string;
  }>;
  note: string;
} {
  return {
    schemaVersion: "stage300-batch-b-adapter-registry@1.1.0",
    baselineCommit: BATCH_B_BASELINE,
    batchBSchemaVersion: BATCH_B_SCHEMA_VERSION,
    focusAdapterCount: 4,
    adapters: BATCH_B_FOCUS_ADAPTER_IDS.map((adapterId) => ({
      adapterId,
      status: "adapter_foundation_dual_status" as const,
      substantiveEvaluatorImplemented: false as const,
      calibrationPending: true as const,
      namedControlExerciseStatus: "not_exercised" as const,
      afterNamedPrerequisite: args.after[adapterId],
      note:
        "capabilityStatus = namedControlPrerequisiteComplete. See dual-status-capability-summary for schemaValidRepresentation. Adapters ≠ detectors.",
    })),
    note: "Four shared engineering jobs with dual-status honesty. Never count as 43 control completions.",
  };
}

export function buildBatchBEvaluatorRegistry(): {
  schemaVersion: "stage300-batch-b-evaluator-registry@1.0.0";
  evaluatorsImplemented: 0;
  unlockedEssentialControlIds: [];
  statuses: [];
  note: string;
} {
  return {
    schemaVersion: "stage300-batch-b-evaluator-registry@1.0.0",
    evaluatorsImplemented: 0,
    unlockedEssentialControlIds: [],
    statuses: [],
    note:
      "No essential-43 control gained exact structured prerequisites for a new substantive evaluator in Batch B. AUD/XPP still need audience/perspective packs; ELD/VDR need version pairs; SRC need OCR; EVS/CHS/ATR/XEX deepen-partials are outside the essential register.",
  };
}

export function buildBatchBRemainingBlockers(args: {
  afterStatusTotals: Record<string, number>;
}): {
  schemaVersion: "stage300-batch-b-remaining-essential-blocker-register@1.0.0";
  essentialControlCount: 43;
  fullyImplementedCount: 0;
  unlockedByBatchB: 0;
  afterStatusTotals: Record<string, number>;
  rows: Array<{
    controlId: string;
    afterStatus: string;
    blockersRemaining: string[];
    nextRequiredWork: string;
  }>;
  note: string;
} {
  const sixSet = new Set<string>(BATCH_A_SIX_CONTROL_IDS);
  const rows = BATCH_A_ESSENTIAL_OWNERSHIP.map((own) => ({
    controlId: own.controlId,
    afterStatus: sixSet.has(own.controlId)
      ? "substantive_evaluator_implemented_pending_review"
      : own.beforeStatus,
    blockersRemaining: [own.stage300AcceptanceRequirement],
    nextRequiredWork: own.stage300AcceptanceRequirement,
  }));
  return {
    schemaVersion: "stage300-batch-b-remaining-essential-blocker-register@1.0.0",
    essentialControlCount: 43,
    fullyImplementedCount: 0,
    unlockedByBatchB: 0,
    afterStatusTotals: args.afterStatusTotals,
    rows,
    note: "Batch B adapter eligibility does not promote or unlock essential evaluators.",
  };
}

export function emptySixAdapterCounts(): Record<BatchAAdapterId, CapabilityCounts> {
  return Object.fromEntries(
    BATCH_A_ADAPTER_IDS.map((id) => [id, { eligible: 0, partial: 0, unavailable: 120 }]),
  ) as Record<BatchAAdapterId, CapabilityCounts>;
}
