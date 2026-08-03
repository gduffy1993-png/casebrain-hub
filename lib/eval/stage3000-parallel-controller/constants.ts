/**
 * Stage-3000 Parallel Corpus Controller — topology and policy pins.
 * Foundation only. Does not generate real cases or freeze a real population.
 */

export const CONTROLLER_ID = "stage3000-parallel-controller" as const;

/** Foundation controller version — bump only with deliberate contract changes. */
export const CONTROLLER_VERSION =
  "s3000-parallel-controller-v0.1.0-foundation" as const;

/**
 * Placeholder pin for the future accepted V2.1.2 generator.
 * The real generator is NOT implemented here; binding happens after acceptance.
 */
export const GENERATOR_PORT_ID = "v2.1.2-accepted-generator-port" as const;
export const GENERATOR_VERSION_PIN_UNBOUND =
  "V2.1.2-ACCEPTED-UNBOUND-PLACEHOLDER" as const;

export const WAVE_COUNT = 3 as const;
export const SHARDS_PER_WAVE = 4 as const;
export const CASES_PER_SHARD = 250 as const;
export const CASES_PER_WAVE = SHARDS_PER_WAVE * CASES_PER_SHARD; // 1000
export const TARGET_POPULATION_SIZE =
  WAVE_COUNT * SHARDS_PER_WAVE * CASES_PER_SHARD; // 3000

/** Accepted-population checkpoints (inclusive accepted membership count). */
export const CHECKPOINT_THRESHOLDS = [
  20, 50, 150, 300, 1000, 3000,
] as const;

export type CheckpointThreshold = (typeof CHECKPOINT_THRESHOLDS)[number];

export const MEMBERSHIP_MANIFEST_SCHEMA =
  "s3000-membership-manifest-v1" as const;
export const RECEIPT_SCHEMA = "s3000-shard-acceptance-receipt-v1" as const;
export const RECONCILIATION_SCHEMA =
  "s3000-population-reconciliation-v1" as const;
export const CHECKPOINT_SCHEMA = "s3000-controller-checkpoint-v1" as const;
export const LINEAGE_SCHEMA = "s3000-case-lineage-v1" as const;

/** Workspace role names — source/truth/output separation + forbidden CaseBrain plane. */
export const WORKSPACE_ROLES = [
  "source",
  "truth",
  "output",
  "control",
  "casebrain_forbidden",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
