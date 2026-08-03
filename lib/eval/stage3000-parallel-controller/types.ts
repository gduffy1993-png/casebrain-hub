/**
 * Core types for the Stage-3000 Parallel Corpus Controller foundation.
 */

import type {
  CheckpointThreshold,
  WorkspaceRole,
} from "./constants";

export type WaveIndex = 1 | 2 | 3;
export type ShardIndex = 0 | 1 | 2 | 3;

export type CaseStatus =
  | "planned"
  | "generating"
  | "candidate"
  | "accepted"
  | "rejected"
  | "replaced";

export type TruthVisibility = "sealed" | "revealed_after_candidate_freeze";

export interface PopulationPlan {
  populationId: string;
  controllerVersion: string;
  generatorVersionPin: string;
  waveCount: 3;
  shardsPerWave: 4;
  casesPerShard: 250;
  targetSize: 3000;
  createdAtIso: string;
}

export interface ShardOwnership {
  wave: WaveIndex;
  shard: ShardIndex;
  /** Inclusive global slot start (0-based across the 3000-case population). */
  slotStart: number;
  /** Exclusive global slot end. */
  slotEnd: number;
  expectedCount: 250;
  shardKey: string;
}

export interface CaseIdentity {
  caseId: string;
  seed: string;
  wave: WaveIndex;
  shard: ShardIndex;
  /** 0-based index within the shard (0..249), or replacement index >= 250. */
  localIndex: number;
  /** Global planned slot (0..2999) for primary membership; replacements use negative lineage slots. */
  globalSlot: number;
  generatorVersionPin: string;
  controllerVersion: string;
}

export interface CaseLineage {
  schema: "s3000-case-lineage-v1";
  identity: CaseIdentity;
  status: CaseStatus;
  /** If this case replaces a rejected case, the rejected caseId. */
  replacesCaseId: string | null;
  /** Rejection reason code when status is rejected. */
  rejectionReason: string | null;
  sourceManifestSha256: string | null;
  candidateContentSha256: string | null;
  semanticFingerprint: string | null;
  truthVisibility: TruthVisibility;
  createdAtIso: string;
}

export interface MembershipEntry {
  caseId: string;
  seed: string;
  wave: WaveIndex;
  shard: ShardIndex;
  globalSlot: number;
  lineageSha256: string;
  candidateContentSha256: string;
  semanticFingerprint: string;
  acceptedAtIso: string;
}

export interface MembershipManifest {
  schema: "s3000-membership-manifest-v1";
  populationId: string;
  controllerVersion: string;
  generatorVersionPin: string;
  /** Append-only accepted membership. Rejected cases never appear here. */
  accepted: MembershipEntry[];
  acceptedCount: number;
  membershipSha256: string;
  frozen: boolean;
  frozenAtIso: string | null;
}

export interface ShardAcceptanceReceipt {
  schema: "s3000-shard-acceptance-receipt-v1";
  populationId: string;
  wave: WaveIndex;
  shard: ShardIndex;
  shardKey: string;
  claimedAcceptedCount: number;
  acceptedCaseIds: string[];
  membershipSubsetSha256: string;
  generatorVersionPin: string;
  controllerVersion: string;
  issuedAtIso: string;
  /** Self-report only — NEVER sufficient for population PASS. */
  selfReportStatus: "shard_complete_claimed";
}

export interface ControllerCheckpoint {
  schema: "s3000-controller-checkpoint-v1";
  populationId: string;
  threshold: CheckpointThreshold;
  acceptedCount: number;
  membershipSha256: string;
  completedShardKeys: string[];
  pendingShardKeys: string[];
  writtenAtIso: string;
}

export interface WorkspaceLayout {
  root: string;
  roles: Record<WorkspaceRole, string>;
}

export interface GeneratorCaseRequest {
  identity: CaseIdentity;
  /** Absolute path to source workspace only. */
  sourceRoot: string;
  /** Explicitly must not include truth or CaseBrain roots. */
  forbiddenRoots: string[];
}

export interface GeneratorCaseCandidate {
  caseId: string;
  /** Opaque synthetic or future real payload fingerprint material. */
  contentText: string;
  contentSha256: string;
  semanticFingerprint: string;
  generatorVersionPin: string;
}

/**
 * Port for the future accepted V2.1.2 generator.
 * Implementations must never read truth/ or casebrain_forbidden/.
 */
export interface Stage3000GeneratorPort {
  readonly portId: string;
  readonly generatorVersionPin: string;
  readonly isBound: boolean;
  generateCase(request: GeneratorCaseRequest): Promise<GeneratorCaseCandidate>;
}

export type ReconciliationVerdict =
  | "PASS"
  | "FAIL_INCOMPLETE"
  | "FAIL_OVERLAP"
  | "FAIL_COUNT_MISMATCH"
  | "FAIL_DUPLICATE_SEMANTIC"
  | "FAIL_RECEIPT_ONLY"
  | "FAIL_GENERATOR_UNBOUND"
  | "FAIL_MEMBERSHIP_TAMPER"
  | "FAIL_TRUTH_LEAK";

export interface PopulationReconciliation {
  schema: "s3000-population-reconciliation-v1";
  populationId: string;
  acceptedCount: number;
  targetSize: number;
  membershipSha256: string;
  receiptCount: number;
  expectedReceiptCount: number;
  overlapCaseIds: string[];
  semanticDuplicateGroups: string[][];
  checkpointsHit: CheckpointThreshold[];
  verdict: ReconciliationVerdict;
  reasons: string[];
  reconciledAtIso: string;
}

export interface RejectionRecord {
  caseId: string;
  reason: string;
  rejectedAtIso: string;
  wave: WaveIndex;
  shard: ShardIndex;
  globalSlot: number;
}

export interface ControllerState {
  populationId: string;
  plan: PopulationPlan;
  ownership: ShardOwnership[];
  membership: MembershipManifest;
  rejections: RejectionRecord[];
  receipts: ShardAcceptanceReceipt[];
  checkpoints: ControllerCheckpoint[];
  /** Replacement counters per shardKey — does not alter accepted membership IDs. */
  replacementCounters: Record<string, number>;
  lastResumeToken: string | null;
}
