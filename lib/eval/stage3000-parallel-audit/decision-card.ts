/**
 * Compact decision cards — human-skimmable; full detail lives in machine receipts.
 */

import { S3000_DECISION_CARD_SCHEMA } from "./constants";
import { shortHash } from "./hashes";
import { summariseSurfaces } from "./surface-availability";
import type { DecisionCard, MachineReceipt } from "./types";

export function buildDecisionCard(
  receipt: MachineReceipt,
  rootCauseIds: string[],
): DecisionCard {
  const surfaces = summariseSurfaces(receipt.surfaceAvailability);
  const cardId = `card-${shortHash(receipt.receiptId)}`;
  return {
    schemaVersion: S3000_DECISION_CARD_SCHEMA,
    cardId,
    runId: receipt.runId,
    caseId: receipt.caseId,
    controlId: receipt.controlId,
    handlerId: receipt.handlerId,
    functionIdentity: receipt.functionIdentity,
    exerciseStatus: receipt.exerciseStatus,
    applicability: receipt.applicability,
    findingCodeCount: receipt.findingCodes.length,
    occurrenceCount: receipt.occurrenceIds.length,
    rootCauseIds: [...rootCauseIds],
    ...surfaces,
    compactSummary: `${receipt.controlId}/${receipt.handlerId}: ${receipt.exerciseStatus} (${receipt.applicability}); occ=${receipt.occurrenceIds.length}`,
    machineReceiptId: receipt.receiptId,
  };
}
