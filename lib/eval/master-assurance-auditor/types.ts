/**
 * Master Assurance Auditor — core types.
 *
 * Findings are evidence-backed, not vague scores. Blank human-review fields
 * stay blank. Blocked vs repaired meaning is preserved from the integrity programme.
 */

export const MASTER_AUDITOR_SCHEMA_VERSION = "1.1.0" as const;
export const MASTER_AUDITOR_PIPELINE_VERSION = "master-assurance-auditor@v1.1" as const;

export type MasterFindingVerdict =
  | "pass"
  | "defect"
  | "containment"
  | "unresolved"
  | "not_exercised";

export type MasterSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type MasterConfidence = "high" | "medium" | "low";

export type MasterExitMode =
  | "view"
  | "copy"
  | "export"
  | "api"
  | "pdf"
  | "composed_prose";

export type MasterLaneId =
  | "LANE-01-INGESTION"
  | "LANE-02-DOCUMENT-IDENTITY"
  | "LANE-03-PARTIES-ATTRIBUTION"
  | "LANE-04-CHARGE-MODEL"
  | "LANE-05-EVIDENCE-STATE"
  | "LANE-06-CHRONOLOGY-HEARING"
  | "LANE-07-PROVENANCE"
  | "LANE-08-RELIABILITY"
  | "LANE-09-COMPLETENESS"
  | "LANE-10-DEFENCE-LENS"
  | "LANE-11-PROSECUTION-LENS"
  | "LANE-12-JUDICIAL-LENS"
  | "LANE-13-LEGAL-CURRENTNESS"
  | "LANE-14-AUDIENCE-WORDING"
  | "LANE-15-ACTION-QUALITY"
  | "LANE-16-CROSS-EXIT"
  | "LANE-17-CROSS-SURFACE"
  | "LANE-18-CHASE-QUALITY"
  | "LANE-19-HALLUCINATION"
  | "LANE-20-SECURITY-PRIVACY"
  | "LANE-21-RESILIENCE"
  | "LANE-22-OUTPUT-DESIGN"
  | "LANE-23-HUMAN-SUPERVISION"
  | "LANE-24-BIAS-FAIRNESS";

export type MasterControlId = `MAA-${string}`;

export type CalibrationStage = "contracts" | "20" | "50" | "150" | "300" | "3000";

export type MasterAuditorFinding = {
  schemaVersion: typeof MASTER_AUDITOR_SCHEMA_VERSION;
  findingId: string;
  controlId: MasterControlId;
  controlVersion: string;
  laneId: MasterLaneId;
  caseId: string;
  surface: string;
  /** Detector code / sub-reason (also embedded in findingId). */
  code: string | null;
  /**
   * Actual CaseBrain output wording only. Never an expected inventory label.
   * Empty when the detector could not cite actual output (verdict must not be defect).
   */
  exactWording: string;
  /** Expected truth / reference wording when comparing against gold/expected. */
  expectedWording: string | null;
  /** Supporting source-document extract (bundle/page text), distinct from expected. */
  sourceDocumentExtract: string | null;
  sourceDocument: string | null;
  documentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean | null;
  /** Hash of sourceDocumentExtract when present, else supporting evidence blob. */
  supportingExtract: string | null;
  supportingHash: string;
  wordingHash: string;
  severity: MasterSeverity;
  confidence: MasterConfidence;
  verdict: MasterFindingVerdict;
  plainEnglish: string;
  expectedProfessionalBehaviour: string;
  rootCauseFamily: string;
  affectedExits: MasterExitMode[];
  suggestedRemediation: string;
  humanReviewRequired: boolean;
  qualifiedLegalReviewRequired: boolean;
  /** Blank until a human fills it — never auto-fabricated. */
  humanReviewDisposition: string | null;
  humanReviewer: string | null;
  humanReviewedAt: string | null;
  designFinding: boolean;
  occurrenceUnit: "exact_string" | "normalised_template" | "occurrence" | "case";
  blockedNotRepaired: boolean | null;
  evidenceRefs: string[];
  detectedAt: string;
};

export type MasterControlDefinition = {
  id: MasterControlId;
  version: string;
  laneId: MasterLaneId;
  label: string;
  intent: string;
  severity: MasterSeverity;
  affectedExits: MasterExitMode[];
  reusedModules: string[];
  historicalSources: string[];
  mutationOrContract: string | null;
};

export type MigrationDisposition = "retained" | "upgraded" | "superseded" | "rejected";

export type MigrationRegisterEntry = {
  migrationId: string;
  originalSource: string;
  originalVersion: string;
  disposition: MigrationDisposition;
  reason: string;
  newControlId: MasterControlId;
  newControlVersion: string;
  regressionTestOrMutation: string | null;
  historicalCasesOrFindings: string[];
  knownLimitations: string[];
};

export type MaterialisedSurface = {
  surfaceId: string;
  text: string;
  exitModes: MasterExitMode[];
  canCopy?: boolean;
  canExport?: boolean;
  blockedNotRepaired?: boolean | null;
  sourceDocument?: string | null;
  documentType?: string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
  pageIdentityKnown?: boolean | null;
};

export type TruthExpectation = {
  evidenceItem: string;
  evidenceType: string | null;
  correctEvidenceState: string | null;
  chaseNeeded: boolean | null;
  safeToRelyOn: boolean | null;
  mustNotSay: string[];
  sourcePageAnchor: string | null;
};

export type SavedCaseMaterialisation = {
  caseId: string;
  sourceCaseId: string | null;
  familyLabel: string | null;
  allegation: string | null;
  clientLabel: string | null;
  surfaces: MaterialisedSurface[];
  truthExpectations: TruthExpectation[];
  truthMapRows: Array<{
    label: string;
    existence: string;
    reliability: string;
  }>;
  cpsChase: Array<{ label: string; draft: string }>;
  doNotOverstate: string[];
  inputBundlePath: string | null;
  packetPath: string;
  builtAt: string | null;
};

export type InputManifestEntry = {
  caseId: string;
  sourceCaseId: string | null;
  packetPath: string;
  actualHash: string;
  expectedHash: string | null;
  bundleHash: string | null;
};

export type InputManifest = {
  schemaVersion: typeof MASTER_AUDITOR_SCHEMA_VERSION;
  runId: string;
  createdAt: string;
  stage: CalibrationStage;
  corpusRoot: string;
  planVersion: string;
  adapterId: string;
  requiredUniqueCases: number;
  membership: CorpusMembershipEntry[];
  entries: InputManifestEntry[];
  corpusHash: string;
  denominators: {
    uniqueCases: number;
    duplicateCaseIdsDropped: number;
    surfaces: number;
  };
};

export type EvidenceLedgerEntry = {
  ref: string;
  caseId: string;
  kind: "surface" | "expected" | "bundle" | "finding_support";
  path: string | null;
  contentHash: string;
  recordedAt: string;
};

export type EvidenceLedger = {
  schemaVersion: typeof MASTER_AUDITOR_SCHEMA_VERSION;
  runId: string;
  entries: EvidenceLedgerEntry[];
};

export type ControlExerciseRecord = {
  controlId: MasterControlId;
  laneId: MasterLaneId;
  /** fully_exercised only when at least one non-not_exercised finding exists on applicable cases. */
  status: "fully_exercised" | "partially_exercised" | "not_exercised";
  casesApplicable: number;
  casesFullyExercised: number;
  casesPartiallyExercised: number;
  casesNotExercised: number;
  findingsEmitted: number;
  passCount: number;
  defectCount: number;
  unresolvedCount: number;
  containmentCount: number;
  notExercisedFindingCount: number;
  notExercisedReason: string | null;
};

export type CorpusMembershipEntry = {
  caseId: string;
  sourceCaseId: string | null;
  adapterId: string;
  packetPath: string;
};

export type CorpusResolution = {
  planVersion: string;
  stage: CalibrationStage;
  adapterId: string;
  requiredUniqueCases: number;
  uniqueCaseCount: number;
  membership: CorpusMembershipEntry[];
  refused: boolean;
  refuseReason: string | null;
  denominators: {
    uniqueCases: number;
    duplicateCaseIdsDropped: number;
    surfaces: number;
  };
};

export type SafetyFnKnowledge = {
  /** null = unknown (blocks progression); number = reviewed count. */
  knownSafetyCriticalFn: number | null;
  knowledgeState: "reviewed" | "unknown";
  registerPath: string | null;
  entries: Array<{ id: string; controlId: string; status: string; note: string }>;
};

export type HumanRateKnowledge = {
  humanConfirmationRate: number | null;
  detectorFalsePositiveRate: number | null;
  knowledgeState: "reviewed_samples" | "unavailable";
  reviewedSampleCount: number;
  confirmedDefectCount: number;
  detectorFalsePositiveCount: number;
  blankOrUnverifiedCount: number;
  reviewerIds: string[];
  denominators: {
    reviewedSamples: number;
    dispositionedSamples: number;
  };
};

export type CalibrationGateResult = {
  stage: CalibrationStage;
  allowedToProgress: boolean;
  stopReason: string | null;
  nextStage: CalibrationStage | null;
  checks: Record<string, boolean | string | number | null>;
};

export type MasterAuditorCheckpoint = {
  status: "STOP_FOR_CODEX_REVIEW" | "RUNNING" | "STAGE_COMPLETE" | "FAILED" | "REFUSED";
  programmePassSupported: false;
  doNot: string[];
  runId: string;
  pipelineVersion: typeof MASTER_AUDITOR_PIPELINE_VERSION;
  stageCompleted: CalibrationStage;
  nextCommand: string;
  startedAt: string;
  stoppedAt: string;
  corpus: CorpusResolution | null;
  safetyFn: SafetyFnKnowledge;
  humanRates: HumanRateKnowledge;
  totals: {
    cases: number;
    uniqueCases: number;
    surfaces: number;
    findings: number;
    defects: number;
    containment: number;
    unresolved: number;
    pass: number;
    notExercised: number;
    detectorFalsePositives: number | null;
    designFindings: number;
    controlsFullyExercised: number;
    controlsPartiallyExercised: number;
    controlsNotExercised: number;
  };
  controls: ControlExerciseRecord[];
  gate: CalibrationGateResult;
  preserved: string[];
  artefactPaths: string[];
};

export type MasterAuditorRunResult = {
  runId: string;
  stage: CalibrationStage;
  cases: SavedCaseMaterialisation[];
  findings: MasterAuditorFinding[];
  manifest: InputManifest;
  ledger: EvidenceLedger;
  controls: ControlExerciseRecord[];
  gate: CalibrationGateResult;
  checkpoint: MasterAuditorCheckpoint;
  outDir: string;
};
