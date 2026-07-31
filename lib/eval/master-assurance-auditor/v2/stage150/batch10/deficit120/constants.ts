/**
 * Batch-10 deficit-120 cohort constants — new sources only; existing 30 untouched.
 */

export const BATCH10_DEFICIT_SCHEMA =
  "maa-v2-stage150-batch10-deficit120-corpus@1.0.0" as const;

export const BATCH10_COHORT_A_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-structured-candidates" as const;

export const BATCH10_DEFICIT_SOURCE_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-sources" as const;

export const BATCH10_DEFICIT_CANDIDATE_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-candidates" as const;

export const BATCH10_DEFICIT_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120" as const;

export const BATCH10_POPULATION_TARGET = 150 as const;
export const BATCH10_COHORT_A_EXPECTED = 30 as const;
export const BATCH10_COHORT_B_TARGET = 120 as const;

export const BATCH10_CORE_FAMILIES = [
  "homicide_causation",
  "violence_robbery_weapons",
  "firearms",
  "sexual_abe",
  "domestic_abuse",
  "youth_participation",
  "county_lines_nrm",
  "fraud_poca",
  "digital_attribution",
  "identification_code_d",
  "mental_health_fitness",
  "disclosure_pii",
  "road_traffic_fatal",
  "magistrates_procedure",
  "bail_remand",
  "sentencing_newton",
  "appeals",
  "multi_defendant_attribution",
] as const;

export type Batch10CoreFamily = (typeof BATCH10_CORE_FAMILIES)[number];

export const BATCH10_FORMAT_VARIANTS = [
  "clean",
  "messy",
  "ocr_scan",
  "mixed_format",
  "later_disclosure",
  "amended_document",
  "competing_chrono",
] as const;

export type Batch10FormatVariant = (typeof BATCH10_FORMAT_VARIANTS)[number];
