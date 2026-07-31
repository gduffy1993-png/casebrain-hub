/**
 * Stage-300 new-150 control-coverage materialisation constants.
 * Baseline: d03e0a57c279d9e155ea20cf89c2e40b3f6848c9
 * Does not touch frozen Stage-150 population.
 */

export const NEW150_SCHEMA = "maa-v2-stage300-new-150-control-coverage@1.0.0" as const;
export const NEW150_BASELINE = "d03e0a57c279d9e155ea20cf89c2e40b3f6848c9" as const;
export const NEW150_TARGET = 150 as const;
export const NEW150_TEMPLATE_ID = "stage300-new150-disclosure-v1" as const;

export const NEW150_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage" as const;
export const NEW150_SOURCE_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/sources" as const;
export const NEW150_CANDIDATE_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/candidates" as const;

export const FROZEN_150_ORDERED_MEMBERSHIP_SHA256 =
  "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1" as const;
export const FROZEN_150_CANDIDATE_FREEZE_SHA256 =
  "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202" as const;

export const NEW150_CORE_FAMILIES = [
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

export type New150CoreFamily = (typeof NEW150_CORE_FAMILIES)[number];

/** Coverage strata mapped to unlock-path themes — not vague “richer case”. */
export const NEW150_COVERAGE_TAGS = [
  "ocr_binary_heavy",
  "specialty_youth_dob",
  "specialty_fitness",
  "specialty_disclosure_pii",
  "specialty_legal_taxonomy",
  "native_email_json_csv",
  "version_draft_pair",
  "audience_multi_pack_attempt",
  "multi_defendant",
  "later_disclosure",
  "amended_instrument",
  "chase_mixed_linkage",
  "dense_bundle",
  "recording_transcript_clip",
  "conflicting_source",
] as const;

export type New150CoverageTag = (typeof NEW150_COVERAGE_TAGS)[number];

export const NEW150_EXIT_IDS = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
  "authenticated_browser",
] as const;

export type New150ExitId = (typeof NEW150_EXIT_IDS)[number];

export const PRODUCTION_EXITS = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
] as const;
