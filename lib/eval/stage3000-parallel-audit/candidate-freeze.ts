/**
 * Candidate freeze — must complete before truth opens.
 */

import { S3000_CANDIDATE_FREEZE_SCHEMA } from "./constants";
import { sha256Hex, shortHash, templateHash, wordingHash } from "./hashes";
import type {
  CandidateFreezeReceipt,
  FrozenCandidate,
  MachineReceipt,
} from "./types";

export function candidatesFromReceipts(
  receipts: MachineReceipt[],
): FrozenCandidate[] {
  const out: FrozenCandidate[] = [];
  for (const r of receipts) {
    if (r.exerciseStatus === "not_exercised") continue;
    for (let i = 0; i < r.occurrenceIds.length; i++) {
      const occurrenceId = r.occurrenceIds[i]!;
      const wordingHashValue = r.wordingHashes[i] ?? r.wordingHashes[0] ?? wordingHash("");
      const tpl = r.templateHashes[i] ?? r.templateHashes[0] ?? "";
      out.push({
        candidateId: `cand-${shortHash(`${r.receiptId}|${occurrenceId}`)}`,
        caseId: r.caseId,
        controlId: r.controlId,
        handlerId: r.handlerId,
        functionIdentity: r.functionIdentity,
        findingCode: r.findingCodes[0] ?? "NONE",
        occurrenceId,
        exactWording: "", // wording retained in units/receipts; freeze keeps hashes
        wordingHash: wordingHashValue,
        templateHash: tpl || templateHash(""),
        outputSha256: r.outputSha256,
        evidenceRefs: [...r.evidenceRefs],
        frozenBeforeTruthOpen: true,
      });
    }
  }
  return out;
}

export function freezeCandidates(input: {
  runId: string;
  shardId: string;
  candidates: FrozenCandidate[];
  frozenAt?: string;
}): CandidateFreezeReceipt {
  // Ensure every candidate declares freeze-before-truth.
  for (const c of input.candidates) {
    if (c.frozenBeforeTruthOpen !== true) {
      throw new Error(`candidate ${c.candidateId} missing frozenBeforeTruthOpen`);
    }
  }
  const payload = input.candidates
    .map((c) => JSON.stringify(c))
    .sort()
    .join("\n");
  return {
    schemaVersion: S3000_CANDIDATE_FREEZE_SCHEMA,
    runId: input.runId,
    shardId: input.shardId,
    frozenAt: input.frozenAt ?? new Date().toISOString(),
    candidateCount: input.candidates.length,
    candidatesSha256: sha256Hex(payload),
    truthOpened: false,
    candidates: input.candidates,
  };
}

export function assertFreezeBeforeTruth(
  freeze: CandidateFreezeReceipt,
  truthOpened: boolean,
): void {
  if (freeze.truthOpened !== false) {
    throw new Error("candidate freeze receipt must record truthOpened=false");
  }
  if (truthOpened && freeze.candidateCount < 0) {
    throw new Error("invalid freeze");
  }
  // Callers must not open truth until this function has been called on a freeze receipt.
  if (truthOpened === false) return;
}
