/** Stage-300 v2 calibration pipeline (essential-43 bridge) — constants. */

import { STAGE300_CALIBRATION_DISPOSITIONS, type Stage300CalibrationDisposition } from "../calibration/constants";

export {
  ARTEFACT_ROOT_V2,
  ESSENTIAL_BRIDGE_BASELINE_COMMIT,
  ESSENTIAL_SCHEMA_VERSION,
  NEW150_ARTIFACT_ROOT,
  NEW150_POPULATION_MANIFEST_REL,
  NEW150_V1_CURRENT_WORK_ROOT,
  NEW150_V1_HISTORICAL_WORK_ROOT,
  PIPELINE_V2_SCHEMA_VERSION,
  STAGE150_CANDIDATE_FREEZE_SHA256_PIN_V2,
  STAGE150_FROZEN_POPULATION_MANIFEST_REL,
  STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN_V2,
} from "../essential/constants";

/** New v2-only artefact under the (preserved) new-150 control-coverage root. */
export const NEW150_POST_HONESTY_MANIFEST_V2_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/post-honesty-packet-manifest-v2.json" as const;

/**
 * v2 disposition vocabulary = the frozen Stage-300 8-way set + `professional_wording_review_
 * required` (solicitor-quality subjective wording) + `product_gap_pending_source_validation`
 * (REVIEW BLOCKER remediation — added so that a genuine, independently-sourced harness
 * expectation that CaseBrain's specialty emitter omits is never collapsed into
 * `harness_or_materialisation_defect`; it is a documented product gap pending validation that
 * the harness expectation itself is source-correct, not a harness/materialisation problem).
 */
export const V2_DISPOSITIONS = [
  ...STAGE300_CALIBRATION_DISPOSITIONS,
  "professional_wording_review_required",
  "product_gap_pending_source_validation",
] as const;
export type V2Disposition =
  | Stage300CalibrationDisposition
  | "professional_wording_review_required"
  | "product_gap_pending_source_validation";

export const PREFLIGHT_5_CASE_COUNT = 5 as const;
export const PREFLIGHT_20_CASE_COUNT = 20 as const;

/**
 * REVIEW BLOCKER remediation artefact root — NEW output location, never overwrites
 * `stage300-calibration-run-v2/` (the frozen v2 run) or any of the other preserved snapshots
 * (`stage300-calibration-run-v1-historical/`, `stage300-calibration-run-v2-incomplete-schema-
 * mismatch/`, `stage300-calibration-run-v2-pre-review-remediation/`).
 */
export const ARTEFACT_ROOT_REVIEW_REMEDIATION =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-review-remediation" as const;

export const REVIEW_REMEDIATION_SCHEMA_VERSION = "maa-v2-stage300-calibration-run-v2-review-remediation@1.0.0" as const;

/** Pre-calibration baseline (preserved review-remediation run, 13164 hits). */
export const ARTEFACT_ROOT_PRE_WORDING_CALIBRATION =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-review-remediation-pre-wording-calibration" as const;

/** Wording-calibration classification artefacts (637 unique strings disposition). */
export const ARTEFACT_ROOT_WORDING_CALIBRATION =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-wording-calibration" as const;

/** Post shared-root-fix rematerialise + same-300 rerun artefacts. */
export const ARTEFACT_ROOT_POST_SHARED_ROOT_FIX =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-shared-root-fix" as const;

/** Post-fix wording recalibration (tuple ledger + charge completeness) — never overwrites post-shared-root-fix. */
export const ARTEFACT_ROOT_POST_FIX_WORDING_RECALIBRATION =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-fix-wording-recalibration" as const;

export const WORDING_CALIBRATION_SCHEMA_VERSION =
  "maa-v2-stage300-calibration-run-v2-wording-calibration@1.0.0" as const;

export const POST_SHARED_ROOT_FIX_SCHEMA_VERSION =
  "maa-v2-stage300-calibration-run-v2-post-shared-root-fix@1.0.0" as const;

export const POST_FIX_WORDING_RECALIBRATION_SCHEMA_VERSION =
  "maa-v2-stage300-calibration-run-v2-post-fix-wording-recalibration@1.0.0" as const;

export const WORDING_CALIBRATION_DISPOSITIONS = [
  "confirmed_output_intrinsic_defect",
  "detector_false_positive",
  "duplicate_occurrence",
  "non_visible_machine_state",
  "source_material_not_drafted_output",
  "needs_professional_review",
  "unresolved",
] as const;

export type WordingCalibrationDisposition = (typeof WORDING_CALIBRATION_DISPOSITIONS)[number];
