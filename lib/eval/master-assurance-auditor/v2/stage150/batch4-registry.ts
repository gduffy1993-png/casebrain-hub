/**
 * Batch-4 foundation scaffolds — NOT packet-local detectors.
 * Registered separately for audit; never counted as partially_implemented.
 */

import { BATCH4_SELECTED, BATCH4_DISPOSITION_BY_ID } from "./batch4-disposition";
import { BATCH4_CLASSIFICATION_BY_ID } from "./batch4-control-classification";
import { BATCH4_FINDING_BY_CONTROL } from "./batch4-detectors";

export type Batch4FoundationScaffold = {
  controlId: string;
  adapterId: string;
  honestyStatus: string;
  denominatorUnit: string;
  findingCode: string | null;
  handlerId: string | null;
  claimedContracts: {
    positiveContract: string;
    negativeContract: string;
    receiptValidator: string;
  };
  contractResolution: {
    positiveResolves: false;
    negativesResolve: false;
    unavailableResolves: false;
    note: string;
  };
  ownershipNote: string;
};

const C = "scripts/maa-v2-stage150-batch4-contracts.test.ts";

/**
 * Scaffold metadata for the 48 adapter-foundation controls.
 * Contract IDs are recorded as unresolved — they do not map to executed checks.
 */
export const STAGE150_BATCH4_FOUNDATION_SCAFFOLDS: Batch4FoundationScaffold[] = BATCH4_SELECTED.map(
  (sel) => {
    const m = BATCH4_FINDING_BY_CONTROL[sel.controlId];
    const disp = BATCH4_DISPOSITION_BY_ID[sel.controlId]!;
    const cls = BATCH4_CLASSIFICATION_BY_ID[sel.controlId]!;
    const short = m?.handlerId ?? sel.controlId;
    return {
      controlId: sel.controlId,
      adapterId: disp.adapterId ?? "unknown",
      honestyStatus: cls.status,
      denominatorUnit: cls.denominatorUnit,
      findingCode: m?.findingCode ?? null,
      handlerId: m?.handlerId ?? null,
      claimedContracts: {
        positiveContract: `${C}#${short}_positive`,
        negativeContract: `${C}#${short}_negatives`,
        receiptValidator: "maa-v2-candidate-finding@1.0.0",
      },
      contractResolution: {
        positiveResolves: false,
        negativesResolve: false,
        unavailableResolves: false,
        note: "Prior Batch-4 registry claimed per-handler contract anchors that were never executed as control-specific checks. Remediation records them unresolved.",
      },
      ownershipNote: cls.reason,
    };
  },
);

/** @deprecated Empty — Batch-4 must not register as packet-local partial handlers. */
export const STAGE150_BATCH4_HANDLERS: never[] = [];

if (STAGE150_BATCH4_FOUNDATION_SCAFFOLDS.length !== BATCH4_SELECTED.length) {
  throw new Error(
    `BATCH4 scaffolds ${STAGE150_BATCH4_FOUNDATION_SCAFFOLDS.length} != selection ${BATCH4_SELECTED.length}`,
  );
}

export function buildBatch4ContractResolutionAudit(): {
  schemaVersion: string;
  scaffoldCount: number;
  resolvingPositive: number;
  resolvingNegatives: number;
  resolvingUnavailable: number;
  allUnresolved: true;
  rows: Array<{
    controlId: string;
    positiveContract: string;
    negativeContract: string;
    positiveResolves: boolean;
    negativesResolve: boolean;
    unavailableResolves: boolean;
  }>;
} {
  const rows = STAGE150_BATCH4_FOUNDATION_SCAFFOLDS.map((s) => ({
    controlId: s.controlId,
    positiveContract: s.claimedContracts.positiveContract,
    negativeContract: s.claimedContracts.negativeContract,
    positiveResolves: s.contractResolution.positiveResolves,
    negativesResolve: s.contractResolution.negativesResolve,
    unavailableResolves: s.contractResolution.unavailableResolves,
  }));
  return {
    schemaVersion: "batch4-contract-resolution-audit@1.0.0",
    scaffoldCount: rows.length,
    resolvingPositive: 0,
    resolvingNegatives: 0,
    resolvingUnavailable: 0,
    allUnresolved: true,
    rows,
  };
}
