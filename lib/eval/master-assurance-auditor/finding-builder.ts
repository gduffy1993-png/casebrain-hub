/**
 * Finding builder — always emits blank human-review fields.
 * Defects require actual CaseBrain wording; expected and source extracts stay separate.
 */

import { resolveMasterControl } from "./control-registry";
import { buildFindingId, sha256Hex, wordingHash } from "./hashes";
import type {
  MasterAuditorFinding,
  MasterConfidence,
  MasterControlId,
  MasterExitMode,
  MasterFindingVerdict,
  MasterSeverity,
} from "./types";
import { MASTER_AUDITOR_SCHEMA_VERSION } from "./types";

export function emitFinding(input: {
  controlId: MasterControlId;
  caseId: string;
  surface: string;
  /** Actual CaseBrain output only. */
  exactWording: string;
  verdict: MasterFindingVerdict;
  plainEnglish: string;
  expectedProfessionalBehaviour: string;
  rootCauseFamily: string;
  suggestedRemediation: string;
  code?: string;
  expectedWording?: string | null;
  sourceDocumentExtract?: string | null;
  severity?: MasterSeverity;
  confidence?: MasterConfidence;
  sourceDocument?: string | null;
  documentType?: string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
  pageIdentityKnown?: boolean | null;
  supportingExtract?: string | null;
  affectedExits?: MasterExitMode[];
  humanReviewRequired?: boolean;
  qualifiedLegalReviewRequired?: boolean;
  designFinding?: boolean;
  occurrenceUnit?: MasterAuditorFinding["occurrenceUnit"];
  blockedNotRepaired?: boolean | null;
  evidenceRefs?: string[];
  detectedAt?: string;
}): MasterAuditorFinding {
  const control = resolveMasterControl(input.controlId);
  const wording = input.exactWording ?? "";
  const sourceExtract = input.sourceDocumentExtract ?? null;
  const support = input.supportingExtract ?? sourceExtract ?? (wording || null);
  const supportForHash = support ?? wording ?? "";

  // Hard rule: confirmed defects must cite actual CaseBrain output.
  let verdict = input.verdict;
  if (verdict === "defect" && !wording.trim()) {
    verdict = "unresolved";
  }
  // Hard rule: candidate_pending_source cannot carry verdict=defect.
  // A mismatch may become defect only when canonical identity/version binding
  // proves the actual and expected rows refer to the same unit.
  if (input.code === "candidate_pending_source" && verdict === "defect") {
    verdict = "unresolved";
  }

  return {
    schemaVersion: MASTER_AUDITOR_SCHEMA_VERSION,
    findingId: buildFindingId({
      controlId: input.controlId,
      caseId: input.caseId,
      surface: input.surface,
      wording: wording || input.expectedWording || input.code || "empty",
      code: input.code,
    }),
    controlId: input.controlId,
    controlVersion: control.version,
    laneId: control.laneId,
    caseId: input.caseId,
    surface: input.surface,
    code: input.code ?? null,
    exactWording: wording,
    expectedWording: input.expectedWording ?? null,
    sourceDocumentExtract: sourceExtract,
    sourceDocument: input.sourceDocument ?? null,
    documentType: input.documentType ?? null,
    sourcePage: input.sourcePage ?? null,
    compiledPage: input.compiledPage ?? null,
    pageIdentityKnown: input.pageIdentityKnown ?? null,
    supportingExtract: support ? support.slice(0, 800) : null,
    supportingHash: sha256Hex(supportForHash),
    wordingHash: wordingHash(wording || input.expectedWording || ""),
    severity: input.severity ?? control.severity,
    confidence: input.confidence ?? "medium",
    verdict,
    plainEnglish: input.plainEnglish,
    expectedProfessionalBehaviour: input.expectedProfessionalBehaviour,
    rootCauseFamily: input.rootCauseFamily,
    affectedExits: input.affectedExits ?? control.affectedExits,
    suggestedRemediation: input.suggestedRemediation,
    humanReviewRequired: input.humanReviewRequired ?? verdict === "defect",
    qualifiedLegalReviewRequired: input.qualifiedLegalReviewRequired ?? false,
    humanReviewDisposition: null,
    humanReviewer: null,
    humanReviewedAt: null,
    designFinding: input.designFinding ?? false,
    occurrenceUnit: input.occurrenceUnit ?? "occurrence",
    blockedNotRepaired: input.blockedNotRepaired ?? null,
    evidenceRefs: input.evidenceRefs ?? [],
    detectedAt: input.detectedAt ?? new Date().toISOString(),
  };
}
