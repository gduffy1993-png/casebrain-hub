/**
 * Truth blinding until candidate freeze.
 */

import type { CaseLineage, TruthVisibility } from "./types";

export type BlindingGate = {
  candidateFrozen: boolean;
  truthVisibility: TruthVisibility;
};

export function initialBlindingGate(): BlindingGate {
  return {
    candidateFrozen: false,
    truthVisibility: "sealed",
  };
}

/**
 * Reveal truth only after the candidate for this case is frozen (content hashed).
 * Generators never receive this gate's reveal path.
 */
export function revealTruthAfterCandidateFreeze(
  lineage: CaseLineage,
): BlindingGate {
  if (!lineage.candidateContentSha256) {
    throw new Error(
      `cannot reveal truth for ${lineage.identity.caseId}: candidate not frozen`,
    );
  }
  if (lineage.truthVisibility === "revealed_after_candidate_freeze") {
    return {
      candidateFrozen: true,
      truthVisibility: "revealed_after_candidate_freeze",
    };
  }
  return {
    candidateFrozen: true,
    truthVisibility: "revealed_after_candidate_freeze",
  };
}

export function assertTruthSealedForGenerator(
  gate: BlindingGate,
  attemptingTruthRead: boolean,
): void {
  if (attemptingTruthRead && gate.truthVisibility === "sealed") {
    throw new Error("truth plane is sealed; generator must not read truth");
  }
}
