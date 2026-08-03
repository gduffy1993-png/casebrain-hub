/**
 * Stage-3000 parallel audit/rerun foundation — core types.
 *
 * Honest exercise statuses only. Generic “detector ran” receipts are rejected.
 * Machine receipts require handler/function identity, inputs, applicability, contracts.
 */

import type { RunnerPhase, SurfaceId, UnitKind } from "./constants";

export type ExerciseStatus = "evaluated" | "unresolved" | "not_exercised";

export type SurfaceAvailability =
  | "available"
  | "unavailable"
  | "not_exercised"
  | "partial";

export type HashKind = "source" | "output" | "truth" | "packet" | "manifest";

export type HashVerificationResult = {
  kind: HashKind;
  relativePath: string;
  expectedSha256: string;
  actualSha256: string | null;
  ok: boolean;
  reason: string | null;
};

/** One case row inside a frozen shard manifest. */
export type ShardCaseRow = {
  orderIndex: number;
  caseId: string;
  shardId: string;
  packetRelativePath: string;
  packetSha256: string;
  sourceRelativePath: string | null;
  sourceSha256: string | null;
  outputRelativePath: string | null;
  outputSha256: string | null;
  /** Truth path recorded but must not be opened until candidate freeze. */
  truthRelativePath: string | null;
  truthSha256: string | null;
  surfaces: Record<SurfaceId, SurfaceAvailability>;
};

/** Frozen shard manifest consumed by the runner (never rewritten in place). */
export type FrozenShardManifest = {
  schemaVersion: "stage3000-shard-manifest@1.0.0";
  shardId: string;
  frozenAt: string;
  baselineCommit: string;
  populationTarget: number;
  shardCaseCount: number;
  orderedMembershipSha256: string;
  cases: ShardCaseRow[];
  note: string;
};

/** Registered handler identity — must be real, not a generic claim. */
export type RegisteredHandlerRef = {
  controlId: string;
  handlerId: string;
  /** Concrete function / runtime path identity (e.g. module#export). */
  functionIdentity: string;
  engineId: string;
  findingCodes: string[];
  inputEligibility: string;
  requiredInputs: string[];
  positiveContract: string;
  negativeContract: string;
  receiptValidator: string;
  unavailableVerdict: "not_exercised" | "unresolved";
};

export type HandlerApplicability =
  | "applicable"
  | "not_applicable"
  | "unavailable_missing_inputs";

export type FastCheckResult = {
  checkId: string;
  caseId: string;
  ok: boolean;
  deterministic: true;
  detail: string;
  evidenceRefs: string[];
};

export type HandlerInvocationInput = {
  caseId: string;
  controlId: string;
  handler: RegisteredHandlerRef;
  applicability: HandlerApplicability;
  presentInputs: string[];
  missingInputs: string[];
  outputSha256: string | null;
  surfaceAvailability: Record<SurfaceId, SurfaceAvailability>;
};

/**
 * Full machine receipt. Rejected if handler identity / contracts are missing
 * or if it only claims a detector ran without identity.
 */
export type MachineReceipt = {
  schemaVersion: "stage3000-machine-receipt@1.0.0";
  receiptId: string;
  runId: string;
  phase: RunnerPhase;
  caseId: string;
  controlId: string;
  handlerId: string;
  functionIdentity: string;
  engineId: string;
  inputs: {
    present: string[];
    missing: string[];
    eligibility: string;
  };
  applicability: HandlerApplicability;
  contracts: {
    positive: string;
    negative: string;
    receiptValidator: string;
  };
  exerciseStatus: ExerciseStatus;
  findingCodes: string[];
  occurrenceIds: string[];
  wordingHashes: string[];
  templateHashes: string[];
  outputSha256: string | null;
  surfaceAvailability: Record<SurfaceId, SurfaceAvailability>;
  evidenceRefs: string[];
  plainEnglish: string;
  /** Forbidden: vague “detector ran” without identity — validated at build time. */
  genericClaimRejected: true;
  recordedAt: string;
};

export type DecisionCard = {
  schemaVersion: "stage3000-decision-card@1.0.0";
  cardId: string;
  runId: string;
  caseId: string;
  controlId: string;
  handlerId: string;
  functionIdentity: string;
  exerciseStatus: ExerciseStatus;
  applicability: HandlerApplicability;
  findingCodeCount: number;
  occurrenceCount: number;
  rootCauseIds: string[];
  surfacesAvailable: SurfaceId[];
  surfacesUnavailable: SurfaceId[];
  surfacesNotExercised: SurfaceId[];
  compactSummary: string;
  machineReceiptId: string;
};

export type EvidenceUnit = {
  unitKind: UnitKind;
  unitId: string;
  caseId: string;
  controlId: string | null;
  /** Exact string hash when unitKind is string/occurrence. */
  stringHash: string | null;
  /** Normalised template hash when applicable. */
  templateHash: string | null;
  occurrenceId: string | null;
  rootCauseId: string | null;
  exactWording: string | null;
  retainedSeparately: true;
};

export type RootCauseCluster = {
  rootCauseId: string;
  family: string;
  sharedSignature: string;
  occurrenceIds: string[];
  caseIds: string[];
  controlIds: string[];
  templateHashes: string[];
  stringHashes: string[];
};

export type FrozenCandidate = {
  candidateId: string;
  caseId: string;
  controlId: string;
  handlerId: string;
  functionIdentity: string;
  findingCode: string;
  occurrenceId: string;
  exactWording: string;
  wordingHash: string;
  templateHash: string;
  outputSha256: string | null;
  evidenceRefs: string[];
  frozenBeforeTruthOpen: true;
};

export type CandidateFreezeReceipt = {
  schemaVersion: "stage3000-candidate-freeze@1.0.0";
  runId: string;
  shardId: string;
  frozenAt: string;
  candidateCount: number;
  candidatesSha256: string;
  truthOpened: false;
  candidates: FrozenCandidate[];
};

export type CheckpointRecord = {
  schemaVersion: "stage3000-checkpoint@1.0.0";
  /** Idempotent key: runId|phase|caseId|controlId|contentSha256 */
  ledgerKey: string;
  runId: string;
  phase: RunnerPhase;
  caseId: string | null;
  controlId: string | null;
  contentSha256: string;
  recordedAt: string;
  payloadRelPath: string | null;
};

export type EvidenceIndexEntry = {
  relativePath: string;
  sha256: string;
  byteLength: number;
  regenerable: boolean;
  retainedInGit: boolean;
  kind: "jsonl" | "json" | "index" | "other";
};

export type EvidenceIndex = {
  schemaVersion: "stage3000-evidence-index@1.0.0";
  runId: string;
  bulkRootRel: string;
  indexRootRel: string;
  entries: EvidenceIndexEntry[];
};

export type AffectedRerunPlan = {
  rootCauseId: string;
  sharedFixId: string;
  affectedCaseIds: string[];
  unaffectedCaseIds: string[];
  /** Full 3000 regression remains mandatory later — never skipped by this plan. */
  fullRegressionStillMandatory: true;
  populationTarget: number;
};

export type FullRegressionGate = {
  populationTarget: number;
  plannedCaseCount: number;
  completedCaseCount: number;
  mandatory: true;
  status: "not_started" | "in_progress" | "complete" | "blocked";
  blockedReason: string | null;
};

export type RunnerConfig = {
  schemaVersion: "stage3000-parallel-audit@1.0.0";
  runId: string;
  repoRoot: string;
  shardManifestPath: string;
  artifactRootRel: string;
  /** When true, resume from existing checkpoint ledger without duplicating keys. */
  resume: boolean;
  /** Registered handlers available for this run (injected or resolved). */
  handlers: RegisteredHandlerRef[];
  /** Open truth only after candidate freeze for the shard. */
  allowTruthOpenAfterFreeze: boolean;
  /** Schedule full regression gate (does not execute real corpus). */
  scheduleFullRegression: boolean;
};

export type RunnerSummary = {
  schemaVersion: "stage3000-parallel-audit@1.0.0";
  runId: string;
  shardId: string;
  baselineCommit: string;
  phasesCompleted: RunnerPhase[];
  casesProcessed: number;
  hashFailures: number;
  fastCheckFailures: number;
  receiptsWritten: number;
  decisionCardsWritten: number;
  candidatesFrozen: number;
  truthOpened: boolean;
  rootCauseClusters: number;
  checkpointRecords: number;
  duplicateLedgerKeysSkipped: number;
  affectedRerunPlan: AffectedRerunPlan | null;
  fullRegressionGate: FullRegressionGate | null;
  evidenceIndexRel: string;
  status: "foundation_ok" | "blocked";
  blockedReason: string | null;
};
