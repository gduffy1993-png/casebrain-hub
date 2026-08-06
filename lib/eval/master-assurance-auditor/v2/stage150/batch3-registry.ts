/**
 * Batch-3 handler registry — ESA-feasible remaining SNI controls (partially_implemented).
 * Probe prerequisites ≠ named-control exercise prerequisites (see batch3-control-classification).
 */

import type { Stage150HandlerDef } from "./detector-registry";
import { BATCH3_SELECTED } from "./batch3-selection";
import { BATCH3_FINDING_BY_CONTROL } from "./batch3-detectors";
import {
  assertClassificationsCoverSelection,
  BATCH3_CLASSIFICATION_BY_ID,
} from "./batch3-control-classification";

const C = "scripts/maa-v2-stage150-batch3-contracts.test.ts";

export type Batch3HandlerDef = Stage150HandlerDef;

assertClassificationsCoverSelection(BATCH3_SELECTED.map((s) => s.controlId));

export const STAGE150_BATCH3_HANDLERS: Batch3HandlerDef[] = BATCH3_SELECTED.map((sel) => {
  const meta = BATCH3_FINDING_BY_CONTROL[sel.controlId];
  if (!meta) throw new Error(`Missing Batch-3 finding meta for ${sel.controlId}`);
  const cls = BATCH3_CLASSIFICATION_BY_ID[sel.controlId];
  if (!cls) throw new Error(`Missing Batch-3 classification for ${sel.controlId}`);
  if (cls.classification === "unavailable_missing_adapter") {
    throw new Error(
      `${sel.controlId} classified unavailable_missing_adapter — must not register as partial handler`,
    );
  }
  return {
    controlId: sel.controlId,
    engineId: meta.engineId,
    handlerId: meta.handlerId,
    findingCodes: [meta.findingCode],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#${meta.handlerId}_positive`,
    negativeContract: `${C}#${meta.handlerId}_negatives`,
    runtimePath: `evaluateAllBatch3→${meta.handlerId}`,
    inputEligibility: `${cls.classification}: probe=${cls.probeRequiredInputs.join("+")}; named=${cls.namedControlRequiredInputs.join("+")}`,
    intelligenceFamily: sel.intelligenceFamily,
    /** Probe eligibility inputs (narrow detector may run). */
    requiredInputs: [...cls.probeRequiredInputs],
    /** Named assurance-control exercise inputs (stricter). */
    namedControlRequiredInputs: [...cls.namedControlRequiredInputs],
    detectorClassification: cls.classification,
    capabilityScope: cls.capabilityScope,
    exercisedInvariant: cls.exercisedInvariant,
    unexercisedInvariant: cls.unexercisedInvariant,
    exactPrerequisiteEvidenceRefs: [...cls.exactPrerequisiteEvidenceRefs],
    unavailableVerdict: "not_exercised" as const,
    ownershipNote: cls.note,
  };
});

if (STAGE150_BATCH3_HANDLERS.length !== BATCH3_SELECTED.length) {
  throw new Error(
    `BATCH3 handlers ${STAGE150_BATCH3_HANDLERS.length} != selection ${BATCH3_SELECTED.length}`,
  );
}
for (let i = 0; i < STAGE150_BATCH3_HANDLERS.length; i++) {
  if (STAGE150_BATCH3_HANDLERS[i].controlId !== BATCH3_SELECTED[i].controlId) {
    throw new Error(`BATCH3 handler order mismatch at ${i}`);
  }
}
