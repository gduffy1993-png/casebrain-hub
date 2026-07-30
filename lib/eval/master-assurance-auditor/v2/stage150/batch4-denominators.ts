/**
 * Batch-4 control-specific denominators — honest units and approval states.
 * No control may be APPROVED_FOR_SELECTION with minimumEligibleCases=0.
 * Do not blanket-approve Batch 1–3 merely because a handler exists.
 */

import {
  BATCH4_CLASSIFICATION_BY_ID,
  BATCH4_CONTROL_CLASSIFICATIONS,
  type DenominatorUnit,
} from "./batch4-control-classification";
import { STAGE150_PACKET_LOCAL_HANDLERS } from "./detector-registry";

export type DenominatorApprovalState =
  | "PENDING_INPUT_ADAPTER"
  | "PENDING_CALIBRATION"
  | "PENDING_REVIEW"
  | "APPROVED_FOR_SELECTION"
  | "DEFERRED_STAGE300";

export type ControlDenominatorRow = {
  controlId: string;
  denominatorUnit: DenominatorUnit;
  populationCount: number;
  eligibleCount: number;
  positiveCalibrationCount: number;
  negativeCalibrationCount: number;
  unavailableCount: number;
  minimumEligibleCases: number;
  approvalState: DenominatorApprovalState;
  reviewer: string;
  reviewDate: string;
  evidenceReferences: string[];
  insufficientDenominatorOutcome: "not_exercised";
  neverPassOnInsufficientDenominator: true;
  blocksStage150Selection: boolean;
  rationale: string;
};

function unitMinimum(unit: DenominatorUnit): number {
  switch (unit) {
    case "case":
      return 1;
    case "surface":
      return 1;
    case "version_pair":
      return 1;
    case "affected_sentence":
      return 1;
    case "authority_proposition":
      return 1;
    case "citation":
      return 1;
    case "run_receipt":
      return 1;
    case "artefact_receipt":
      return 1;
    case "audience_surface_set":
      return 1;
    case "perspective_surface_set":
      return 1;
    case "procedural_event":
      return 1;
    case "calc_ledger":
      return 1;
    case "source_binary":
      return 1;
    default:
      return 1;
  }
}

function batch4Row(controlId: string): ControlDenominatorRow {
  const c = BATCH4_CLASSIFICATION_BY_ID[controlId];
  if (!c) {
    throw new Error(`Missing Batch-4 classification for ${controlId}`);
  }
  if (c.status === "deferred_stage300") {
    return {
      controlId,
      denominatorUnit: c.denominatorUnit,
      populationCount: 0,
      eligibleCount: 0,
      positiveCalibrationCount: 0,
      negativeCalibrationCount: 0,
      unavailableCount: 0,
      minimumEligibleCases: unitMinimum(c.denominatorUnit),
      approvalState: "DEFERRED_STAGE300",
      reviewer: "",
      reviewDate: "",
      evidenceReferences: [
        "lib/eval/master-assurance-auditor/v2/stage150/batch4-control-classification.ts",
      ],
      insufficientDenominatorOutcome: "not_exercised",
      neverPassOnInsufficientDenominator: true,
      blocksStage150Selection: true,
      rationale: c.reason,
    };
  }
  // Adapter foundation: ESA eligible 0; never APPROVED_FOR_SELECTION.
  return {
    controlId,
    denominatorUnit: c.denominatorUnit,
    populationCount: 0,
    eligibleCount: 0,
    positiveCalibrationCount: 0,
    negativeCalibrationCount: 0,
    unavailableCount: 0,
    minimumEligibleCases: unitMinimum(c.denominatorUnit),
    approvalState: "PENDING_INPUT_ADAPTER",
    reviewer: "",
    reviewDate: "",
    evidenceReferences: [
      "lib/eval/master-assurance-auditor/v2/stage150/batch4-adapters.ts",
      "lib/eval/master-assurance-auditor/v2/stage150/batch4-control-classification.ts",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch4/batch4-control-classification.json",
    ],
    insufficientDenominatorOutcome: "not_exercised",
    neverPassOnInsufficientDenominator: true,
    blocksStage150Selection: true,
    rationale: `Adapter foundation only (${c.denominatorUnit}). ESA population/eligible=0. Not APPROVED_FOR_SELECTION. ${c.reason.slice(0, 180)}`,
  };
}

/**
 * Batch 1–3 packet-local handlers: handler existence ≠ calibrated approval.
 * Leave PENDING_CALIBRATION / PENDING_REVIEW with blank reviewer until genuine review.
 */
function batch123Row(controlId: string): ControlDenominatorRow {
  const family = controlId.split("-")[1] ?? "UNK";
  const unit: DenominatorUnit =
    family === "AUD" || family === "XPP"
      ? "surface"
      : family === "PRC" || family === "CHR"
        ? "procedural_event"
        : "case";
  return {
    controlId,
    denominatorUnit: unit,
    populationCount: 0,
    eligibleCount: 0,
    positiveCalibrationCount: 0,
    negativeCalibrationCount: 0,
    unavailableCount: 0,
    minimumEligibleCases: unitMinimum(unit),
    approvalState: "PENDING_CALIBRATION",
    reviewer: "",
    reviewDate: "",
    evidenceReferences: [
      "lib/eval/master-assurance-auditor/v2/stage150/detector-registry.ts",
      "Note: handler registration is not calibration evidence; no genuine denominator review recorded in Batch-4 remediation.",
    ],
    insufficientDenominatorOutcome: "not_exercised",
    neverPassOnInsufficientDenominator: true,
    blocksStage150Selection: true,
    rationale:
      "Packet-local handler exists but Batch-4 remediation does not blanket-approve with min=20. Calibration counts remain unset pending genuine review.",
  };
}

export function buildBatch4ControlDenominators(): {
  schemaVersion: string;
  policy: string;
  caseSelectionForbidden: true;
  rows: ControlDenominatorRow[];
  counts: Record<DenominatorApprovalState, number>;
  approvedWithZeroEligibleForbidden: true;
  approvedForSelectionCount: number;
} {
  const rows: ControlDenominatorRow[] = [];
  const batch4Ids = new Set(BATCH4_CONTROL_CLASSIFICATIONS.map((c) => c.controlId));

  for (const h of STAGE150_PACKET_LOCAL_HANDLERS) {
    if (batch4Ids.has(h.controlId)) {
      // Should not happen after unregistering Batch-4 from packet-local handlers
      rows.push(batch4Row(h.controlId));
      continue;
    }
    rows.push(batch123Row(h.controlId));
  }

  for (const c of BATCH4_CONTROL_CLASSIFICATIONS) {
    if (rows.some((r) => r.controlId === c.controlId)) continue;
    rows.push(batch4Row(c.controlId));
  }

  for (const r of rows) {
    if (r.approvalState === "APPROVED_FOR_SELECTION" && r.minimumEligibleCases <= 0) {
      throw new Error(
        `Honesty violation: ${r.controlId} APPROVED_FOR_SELECTION with minimumEligibleCases=${r.minimumEligibleCases}`,
      );
    }
    if (r.approvalState === "APPROVED_FOR_SELECTION" && r.eligibleCount < r.minimumEligibleCases) {
      throw new Error(
        `Honesty violation: ${r.controlId} APPROVED_FOR_SELECTION with eligibleCount ${r.eligibleCount} < minimum ${r.minimumEligibleCases}`,
      );
    }
  }

  const counts: Record<DenominatorApprovalState, number> = {
    PENDING_INPUT_ADAPTER: 0,
    PENDING_CALIBRATION: 0,
    PENDING_REVIEW: 0,
    APPROVED_FOR_SELECTION: 0,
    DEFERRED_STAGE300: 0,
  };
  for (const r of rows) counts[r.approvalState] += 1;

  return {
    schemaVersion: "stage150-batch4-control-denominators@2.0.0",
    policy:
      "No APPROVED_FOR_SELECTION with minimumEligibleCases=0. Denominator units are control-specific. Batch-4 adapter controls stay PENDING_INPUT_ADAPTER. Batch 1–3 stay PENDING_CALIBRATION until genuine review. Case selection forbidden.",
    caseSelectionForbidden: true,
    rows,
    counts,
    approvedWithZeroEligibleForbidden: true,
    approvedForSelectionCount: counts.APPROVED_FOR_SELECTION,
  };
}
