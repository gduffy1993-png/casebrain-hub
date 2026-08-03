/**
 * Machine receipts — reject generic “detector ran” claims.
 * Require handler/function identity, inputs, applicability, contracts.
 */

import { S3000_MACHINE_RECEIPT_SCHEMA } from "./constants";
import { shortHash, wordingHash } from "./hashes";
import { validateHandlerIdentity } from "./handler-gate";
import type {
  ExerciseStatus,
  HandlerApplicability,
  HandlerInvocationInput,
  MachineReceipt,
  RegisteredHandlerRef,
} from "./types";

export class GenericReceiptRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenericReceiptRejectedError";
  }
}

function rejectGeneric(plainEnglish: string, handler: RegisteredHandlerRef): void {
  validateHandlerIdentity(handler);
  const lowered = plainEnglish.toLowerCase();
  const genericPatterns = [
    /detector ran/,
    /handler ran/,
    /check executed/,
    /control executed/,
    /ran successfully/,
    /invoked successfully without identity/,
  ];
  if (genericPatterns.some((p) => p.test(lowered))) {
    throw new GenericReceiptRejectedError(
      `generic receipt claim rejected for ${handler.controlId}: ${plainEnglish}`,
    );
  }
  if (!handler.functionIdentity.includes("#") && !handler.functionIdentity.includes("→") && !handler.functionIdentity.includes(".")) {
    // Allow module#export, a→b, or dotted paths; bare tokens already rejected in validateHandlerIdentity
  }
}

export function buildMachineReceipt(input: {
  runId: string;
  phase: MachineReceipt["phase"];
  invocation: HandlerInvocationInput;
  exerciseStatus: ExerciseStatus;
  occurrenceIds: string[];
  exactWordings: string[];
  templateHashes: string[];
  evidenceRefs: string[];
  plainEnglish: string;
  recordedAt?: string;
}): MachineReceipt {
  const h = input.invocation.handler;
  rejectGeneric(input.plainEnglish, h);

  if (!h.handlerId || !h.functionIdentity || !h.positiveContract || !h.negativeContract) {
    throw new GenericReceiptRejectedError(
      `receipt missing required identity/contracts for ${h.controlId}`,
    );
  }

  const receiptId = `rcpt-${shortHash(
    [
      input.runId,
      input.invocation.caseId,
      h.controlId,
      h.handlerId,
      h.functionIdentity,
      input.exerciseStatus,
      input.occurrenceIds.join(","),
    ].join("|"),
  )}`;

  return {
    schemaVersion: S3000_MACHINE_RECEIPT_SCHEMA,
    receiptId,
    runId: input.runId,
    phase: input.phase,
    caseId: input.invocation.caseId,
    controlId: h.controlId,
    handlerId: h.handlerId,
    functionIdentity: h.functionIdentity,
    engineId: h.engineId,
    inputs: {
      present: [...input.invocation.presentInputs],
      missing: [...input.invocation.missingInputs],
      eligibility: h.inputEligibility,
    },
    applicability: input.invocation.applicability,
    contracts: {
      positive: h.positiveContract,
      negative: h.negativeContract,
      receiptValidator: h.receiptValidator,
    },
    exerciseStatus: input.exerciseStatus,
    findingCodes: [...h.findingCodes],
    occurrenceIds: [...input.occurrenceIds],
    wordingHashes: input.exactWordings.map((w) => wordingHash(w)),
    templateHashes: [...input.templateHashes],
    outputSha256: input.invocation.outputSha256,
    surfaceAvailability: { ...input.invocation.surfaceAvailability },
    evidenceRefs: [...input.evidenceRefs],
    plainEnglish: input.plainEnglish,
    genericClaimRejected: true,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
}

export function assertReceiptHasIdentity(receipt: MachineReceipt): void {
  if (
    !receipt.handlerId ||
    !receipt.functionIdentity ||
    !receipt.contracts.positive ||
    !receipt.contracts.negative ||
    receipt.applicability == null
  ) {
    throw new GenericReceiptRejectedError(
      `machine receipt ${receipt.receiptId} lacks required identity fields`,
    );
  }
  if (receipt.genericClaimRejected !== true) {
    throw new GenericReceiptRejectedError(
      `machine receipt ${receipt.receiptId} missing genericClaimRejected marker`,
    );
  }
}

export type { HandlerApplicability, RegisteredHandlerRef };
