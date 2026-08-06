/**
 * Stage-300 Batch A — shared structured-adapter foundations.
 * Fail-closed. No CaseBrain behaviour change. No detector promotions.
 * Calibration remains explicitly pending.
 */

export const BATCH_A_SCHEMA_VERSION = "maa-v2-stage300-batch-a-structured-adapter@1.0.0" as const;
export const BATCH_A_BASELINE = "ee3c70c6f010b1c81535aed8bc00d1b782a29b4e" as const;
export const BATCH_A_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-batch-a-structured-adapters" as const;

export const ORDERED_MEMBERSHIP_SHA256 =
  "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1" as const;
export const CANDIDATE_FREEZE_SHA256 =
  "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202" as const;

/** Honest Batch-A status vocabulary (schemas ≠ evaluators ≠ promotions). */
export type BatchAControlStatus =
  | "adapter_foundation_only"
  | "substantive_evaluator_implemented"
  | "substantive_evaluator_implemented_pending_review"
  | "partially_implemented_pending_calibration"
  | "specified_not_implemented"
  | "unavailable_missing_real_input";

export type BatchAAdapterId =
  | "structured_charge_instrument_graph"
  | "timezone_aware_chronology_events"
  | "evidence_unit_identity_with_aliases"
  | "source_vs_compiled_page_binding"
  | "chase_item_to_evidence_unit_edges"
  | "view_copy_export_api_pdf_composed_prose_capture";

export const BATCH_A_ADAPTER_IDS: readonly BatchAAdapterId[] = [
  "structured_charge_instrument_graph",
  "timezone_aware_chronology_events",
  "evidence_unit_identity_with_aliases",
  "source_vs_compiled_page_binding",
  "chase_item_to_evidence_unit_edges",
  "view_copy_export_api_pdf_composed_prose_capture",
] as const;

/** Batch-A scope themes (priorities 1–5 + genuine multi-exit). Later themes stay out-of-scope. */
export type BatchATheme =
  | "structured_charge_instruments"
  | "chronology_competing_timestamps"
  | "evidence_unit_identity_attribution"
  | "provenance_page_identity"
  | "chase_relationships"
  | "genuine_non_browser_exits"
  | "out_of_batch_a_scope";

export type BatchACapabilityStatus = "eligible" | "partial" | "unavailable";

export type BatchASourceChannel = "casebrain_output" | "structured_packet";
