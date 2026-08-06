/** Stage-300 frozen calibration run — constants (measurement only). */

export const STAGE300_CALIBRATION_BASELINE = "a831a631f3050e096b89633176f023bee2fd6a5f" as const;

export const STAGE300_CALIBRATION_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run" as const;

export const STAGE300_CALIBRATION_SCHEMA = "maa-v2-stage300-calibration-run@1.0.0" as const;

/** Both lineages are materialised via the same Batch-10 structured-packet extractor. */
export const STAGE300_PACKET_SCHEMA = "stage150-structured-case-packet@1.0.0" as const;

// —— Cohort A|B lineage: frozen Stage-150 (150 cases; 30 projection-only + 120 production) ——
export const STAGE150_FROZEN_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run" as const;
export const STAGE150_FROZEN_POPULATION_MANIFEST_REL =
  `${STAGE150_FROZEN_ARTIFACT_ROOT}/frozen-population-manifest.json` as const;
export const STAGE150_FROZEN_CANDIDATE_FREEZE_REL =
  `${STAGE150_FROZEN_ARTIFACT_ROOT}/candidate-freeze-receipt.json` as const;

/** Pinned — must equal the value frozen in frozen-population-manifest.json. Never recomputed to match; mismatch is a blocker. */
export const STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN =
  "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1" as const;
/** Pinned — must equal candidate-freeze-receipt.json freezeSha256. Reference only; Stage-150 candidates are never re-emitted here. */
export const STAGE150_CANDIDATE_FREEZE_SHA256_PIN =
  "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202" as const;

export const STAGE150_LINEAGE_COUNT = 150 as const;
export const STAGE150_COHORT_A_COUNT = 30 as const;
export const STAGE150_COHORT_B_COUNT = 120 as const;

// —— Cohort B lineage: accepted new-150 (150 production cases) ——
export const NEW150_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage" as const;
export const NEW150_POPULATION_MANIFEST_REL =
  `${NEW150_ARTIFACT_ROOT}/new-150-population-manifest.json` as const;
export const NEW150_LINEAGE_COUNT = 150 as const;

// —— Combined population ——
export const POPULATION_TARGET = 300 as const;
export const PROJECTION_ONLY_CASE_COUNT = 30 as const;
export const PRODUCTION_OUTPUT_CASE_COUNT = 270 as const;

export const STAGE300_ESSENTIAL_CONTROL_REGISTER_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-execution-readiness-plan/stage300-essential-control-register.json" as const;

export const STAGE300_LINEAGE_VALUES = ["stage150_frozen", "stage300_new150"] as const;
export type Stage300Lineage = (typeof STAGE300_LINEAGE_VALUES)[number];

export const STAGE300_CALIBRATION_DISPOSITIONS = [
  "confirmed_casebrain_defect",
  "harness_or_materialisation_defect",
  "corpus_or_truth_defect",
  "detector_false_positive",
  "unresolved_source_or_provenance",
  "projection_only_not_exercised",
  "safe_qualified_output",
  "duplicate_occurrence_of_shared_root",
] as const;
export type Stage300CalibrationDisposition = (typeof STAGE300_CALIBRATION_DISPOSITIONS)[number];
