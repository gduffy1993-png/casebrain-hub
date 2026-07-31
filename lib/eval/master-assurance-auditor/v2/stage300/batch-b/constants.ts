/**
 * Stage-300 Batch B — evidence / provenance / chase / multi-exit hardening.
 * Fail-closed. No CaseBrain behaviour change. No detector promotions.
 * No Stage-300 generation/freeze/run.
 */

export const BATCH_B_SCHEMA_VERSION = "maa-v2-stage300-batch-b-evidence-provenance-chase-exits@1.0.0" as const;
export const BATCH_B_BASELINE = "43125b6fa06fa8e5e682d8811b1478b37daf9dfa" as const;
export const BATCH_B_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-batch-b-evidence-provenance-chase-exits" as const;

export const ORDERED_MEMBERSHIP_SHA256 =
  "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1" as const;
export const CANDIDATE_FREEZE_SHA256 =
  "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202" as const;

/** The four adapters Batch B strengthens (shared with Batch A ids). */
export const BATCH_B_FOCUS_ADAPTER_IDS = [
  "evidence_unit_identity_with_aliases",
  "source_vs_compiled_page_binding",
  "chase_item_to_evidence_unit_edges",
  "view_copy_export_api_pdf_composed_prose_capture",
] as const;

export type BatchBFocusAdapterId = (typeof BATCH_B_FOCUS_ADAPTER_IDS)[number];

export type OwnershipLane =
  | "existing_production_builder"
  | "batch10_materialisation_serialisation"
  | "maa_adapter_projection"
  | "genuinely_unavailable_source";
