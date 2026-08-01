/** Shared result/candidate shapes for the Stage-300 essential-43 execution bridge. */

import type { EssentialBacking, EssentialControlId, NamedControlExerciseStatus } from "./constants";

export type EssentialHit = {
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  plainEnglish: string;
  evidenceRefs: string[];
  /**
   * Never `confirmed_casebrain_defect` at emission time — that is a post-triage disposition.
   * `candidate_defect` | `contradiction` | `omission` | `professional_wording_review_required` |
   * `not_exercised` | `pass_candidate`.
   */
  candidateClass:
    | "candidate_defect"
    | "contradiction"
    | "omission"
    | "professional_wording_review_required"
    | "not_exercised"
    | "pass_candidate";
};

export type EssentialControlResult = {
  controlId: EssentialControlId;
  namedControlExerciseStatus: NamedControlExerciseStatus;
  applicable: boolean;
  missingInputReason: string | null;
  evidenceRefs: string[];
  hits: EssentialHit[];
  /** Never `production` unless the finding is backed by genuine casebrain-output.json content. */
  backing: EssentialBacking;
  phraseProbeUsed: false;
};

export type EssentialCandidate = {
  candidateId: string;
  runId: string;
  evaluatorVersion: string;
  caseId: string;
  controlId: EssentialControlId;
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  plainEnglish: string;
  candidateClass: EssentialHit["candidateClass"];
  evidenceRefs: string[];
  backing: EssentialBacking;
  packetSha256: string | null;
  outputSha256: string | null;
  wordingHash: string;
};
