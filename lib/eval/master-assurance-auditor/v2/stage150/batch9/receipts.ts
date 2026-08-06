/**
 * Batch-9 honest named-control exercise receipts (behavioural-proof remediation).
 */

import { adaptAllBatch8 } from "../batch8/adapters";
import type { Stage150EvalContext, Stage150Hit } from "../detectors";
import { BATCH9_CONTROL_SPECS, BATCH9_SPEC_BY_ID } from "./control-specs";
import {
  adapterMeetsPrerequisite,
  evaluateBatch9Control,
  getAdapter,
  type Batch9AdaptedBundle,
} from "./evaluators";
import {
  BATCH9_RECEIPT_SCHEMA,
  countsAsNamedEvaluator,
  type Batch9ExerciseReceipt,
} from "./schemas";

export function buildBatch9ExerciseReceipt(args: {
  ctx: Stage150EvalContext;
  controlId: string;
  adapted?: Batch9AdaptedBundle;
  hits?: Stage150Hit[];
}): Batch9ExerciseReceipt {
  const spec = BATCH9_SPEC_BY_ID.get(args.controlId);
  if (!spec) throw new Error(`Unknown Batch-9 control ${args.controlId}`);
  const adapted = args.adapted ?? adaptAllBatch8(args.ctx.caseId, args.ctx.output);
  const adapter = getAdapter(adapted, spec.adapterId);
  const gate = adapterMeetsPrerequisite(spec, adapter, args.ctx.output);
  const hits = args.hits ?? evaluateBatch9Control(args.ctx, args.controlId, adapted);
  const findingCodes = [...new Set(hits.map((h) => h.findingCode))];
  const evidenceRefs = [...new Set(hits.flatMap((h) => h.evidenceRefs))];
  const candidateOccurrenceIds = hits.map(
    (h) => `${args.ctx.caseId}::${h.occurrenceRef}::${h.findingCode}`,
  );

  let namedControlExerciseStatus = gate.exerciseStatus;
  if (
    gate.ok &&
    hits.length > 0 &&
    hits.every((h) => h.candidateClass === "unresolved")
  ) {
    namedControlExerciseStatus = "unresolved";
  }

  const named = countsAsNamedEvaluator(spec.evaluatorImplementationClass);
  return {
    schemaVersion: BATCH9_RECEIPT_SCHEMA,
    caseId: args.ctx.caseId,
    controlId: spec.controlId,
    adapterId: spec.adapterId,
    evaluatorImplementationClass: spec.evaluatorImplementationClass,
    executionAvailability: spec.executionAvailability,
    evaluatorClass: spec.evaluatorImplementationClass,
    countsAsNamedEvaluator: named,
    adapterCapabilityStatus: adapter.capabilityStatus,
    namedControlExerciseStatus,
    applicableRecordCount: adapter.applicableRecordCount,
    completeRecordCount: adapter.completeRecordCount,
    incompleteRecordCount: adapter.incompleteRecordCount,
    ambiguousRelationshipCount: adapter.ambiguousRelationshipCount,
    applicableCase: gate.ok,
    missingInputReason: gate.reason,
    eligibilityReason: adapter.eligibilityReason,
    findingCount: hits.length,
    findingCodes,
    evidenceRefs,
    candidateOccurrenceIds,
    ownership: "batch9_adapter_gated",
    emptyHitsDoNotImplyPass: true,
    note: gate.ok
      ? `impl=${spec.evaluatorImplementationClass}; availability=${spec.executionAvailability}; namedEvaluator=${named}; status=${namedControlExerciseStatus}; findings=${hits.length}; emptyHits≠PASS. ${spec.findingOwnership}`
      : `impl=${spec.evaluatorImplementationClass}; availability=${spec.executionAvailability}; namedEvaluator=${named}; not_exercised (${gate.reason}). ${spec.unavailableBehaviour}`,
  };
}

export function buildAllBatch9Receipts(ctx: Stage150EvalContext): Batch9ExerciseReceipt[] {
  const adapted = adaptAllBatch8(ctx.caseId, ctx.output);
  return BATCH9_CONTROL_SPECS.map((spec) => {
    const hits = evaluateBatch9Control(ctx, spec.controlId, adapted);
    return buildBatch9ExerciseReceipt({ ctx, controlId: spec.controlId, adapted, hits });
  });
}
