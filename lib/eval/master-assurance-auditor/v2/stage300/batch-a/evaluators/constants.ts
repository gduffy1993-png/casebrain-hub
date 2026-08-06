/**
 * Stage-300 Batch-A six-control evaluator constants.
 * Registry authority: families-a-m.ts LSL-05 / CHR-06 / CHR-12 / PRC-03 / PRC-04 / PRC-07.
 * Do not broaden. Do not promote into immutable implemented registry.
 */

export const BATCH_A_EVAL_SCHEMA = "maa-v2-stage300-batch-a-six-evaluators@1.0.0" as const;
export const BATCH_A_EVAL_RECEIPT_SCHEMA = "maa-v2-stage300-batch-a-exercise-receipt@1.0.0" as const;
export const BATCH_A_EVAL_CONTRACTS_FILE =
  "scripts/maa-v2-stage300-batch-a-six-evaluators-contracts.test.ts" as const;

export const BATCH_A_SIX_CONTROL_IDS = [
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
  "MAA2-PRC-03-YOUTH-STATE",
  "MAA2-PRC-04-FITNESS-PARTICIPATION",
  "MAA2-PRC-07-DISCLOSURE-PII-STATE",
] as const;

export type BatchASixControlId = (typeof BATCH_A_SIX_CONTROL_IDS)[number];

/**
 * Pinned legal-state category set from LSL-05 registry purpose.
 * Truncation to fact/opinion alone is a defect when taxonomy is exercised.
 */
export const PINNED_LEGAL_STATE_CATEGORY_SET = [
  "source_fact",
  "allegation",
  "prosecution_position",
  "defence_position",
  "disputed_evidence",
  "inference",
  "casebrain_hypothesis",
  "expert_opinion",
  "judicial_finding",
  "unresolved_question",
] as const;

export type LegalStateCategory = (typeof PINNED_LEGAL_STATE_CATEGORY_SET)[number];

/** Binary-only collapse that LSL-05 treats as truncated taxonomy. */
export const TRUNCATED_FACT_OPINION_ONLY = new Set(["fact", "opinion", "source_fact", "inference"]);

export type BatchAEvalExerciseStatus = "evaluated" | "unresolved" | "not_exercised";

export type BatchAControlResultStatus =
  | "substantive_evaluator_implemented_pending_review"
  | "partially_implemented_pending_calibration"
  | "adapter_foundation_only"
  | "unavailable_missing_real_input";

export const BATCH_A_CALIBRATION_ARTIFACT_SUBDIR = "six-evaluator-calibration" as const;
