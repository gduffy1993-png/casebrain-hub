/**
 * Stage-3000 parallel audit/rerun foundation — constants.
 * Baseline-aligned; no dependency on uncommitted V2.1.2 work.
 */

export const S3000_AUDIT_SCHEMA = "stage3000-parallel-audit@1.0.0" as const;
export const S3000_SHARD_MANIFEST_SCHEMA = "stage3000-shard-manifest@1.0.0" as const;
export const S3000_DECISION_CARD_SCHEMA = "stage3000-decision-card@1.0.0" as const;
export const S3000_MACHINE_RECEIPT_SCHEMA = "stage3000-machine-receipt@1.0.0" as const;
export const S3000_CHECKPOINT_SCHEMA = "stage3000-checkpoint@1.0.0" as const;
export const S3000_CANDIDATE_FREEZE_SCHEMA = "stage3000-candidate-freeze@1.0.0" as const;
export const S3000_EVIDENCE_INDEX_SCHEMA = "stage3000-evidence-index@1.0.0" as const;

/** Frozen census baseline this foundation targets. */
export const S3000_AUDIT_BASELINE_COMMIT =
  "308b7cb633f83d7c998bc80adf87356de346b3e9" as const;

export const S3000_POPULATION_TARGET = 3000 as const;

export const S3000_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/stage3000-parallel-audit" as const;

/** Regenerable bulk evidence (hashed/indexed; gitignored). */
export const S3000_BULK_EVIDENCE_REL = `${S3000_ARTIFACT_ROOT}/bulk-evidence` as const;

/** Compact indexes + decision cards (retainable in git). */
export const S3000_INDEX_REL = `${S3000_ARTIFACT_ROOT}/indexes` as const;

export const SURFACE_IDS = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
  "authenticated_browser",
] as const;

export type SurfaceId = (typeof SURFACE_IDS)[number];

export const RUNNER_PHASES = [
  "load_shard",
  "verify_hashes",
  "fast_deterministic",
  "handler_invoke",
  "candidate_freeze",
  "truth_open",
  "root_cause_dedupe",
  "decision_cards",
  "affected_rerun",
  "full_regression",
] as const;

export type RunnerPhase = (typeof RUNNER_PHASES)[number];

export const UNIT_KINDS = [
  "occurrence",
  "string",
  "template",
  "case",
  "root_cause",
] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];
