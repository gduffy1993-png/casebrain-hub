/**
 * Ownership / deduplication graph for the 43 essential controls → Batch-A adapters.
 * One shared adapter ≠ multiple completed engineering jobs.
 */

import type { BatchAAdapterId, BatchAControlStatus, BatchATheme } from "./constants";

export type EssentialOwnershipRow = {
  controlId: string;
  theme: BatchATheme;
  owningAdapterId: BatchAAdapterId | null;
  owningEvaluatorId: null; // Batch A does not ship substantive evaluators
  relatedControlIds: string[];
  duplicateRiskCluster: string;
  batchAInScope: boolean;
  stage300AcceptanceRequirement: string;
  beforeStatus: BatchAControlStatus;
};

/**
 * Authority list = committed essential register (43).
 * Themes outside Batch-A section A stay out_of_batch_a_scope.
 */
export const BATCH_A_ESSENTIAL_OWNERSHIP: readonly EssentialOwnershipRow[] = [
  // Heavy OCR — out of Batch A implementation (adapter order priority 9)
  ...[
    "MAA2-SRC-07-REDACTION-DETECT",
    "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
    "MAA2-SRC-13-PASSWORD-CORRUPT",
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
  ].map(
    (controlId): EssentialOwnershipRow => ({
      controlId,
      theme: "out_of_batch_a_scope",
      owningAdapterId: null,
      owningEvaluatorId: null,
      relatedControlIds: [
        "MAA2-SRC-07-REDACTION-DETECT",
        "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
        "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
        "MAA2-SRC-13-PASSWORD-CORRUPT",
        "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
      ],
      duplicateRiskCluster: "heavy_ocr_binary_lane",
      batchAInScope: false,
      stage300AcceptanceRequirement:
        "Heavy PDF/OCR/binary adapters + original source documents (Batch later).",
      beforeStatus: controlId === "MAA2-SRC-13-PASSWORD-CORRUPT"
        ? "partially_implemented_pending_calibration"
        : "specified_not_implemented",
    }),
  ),

  {
    controlId: "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
    theme: "structured_charge_instruments",
    owningAdapterId: "structured_charge_instrument_graph",
    owningEvaluatorId: null,
    relatedControlIds: ["MAA2-LSL-05-CATEGORY-SET-COVERAGE"],
    duplicateRiskCluster: "charge_instrument_graph",
    batchAInScope: true,
    stage300AcceptanceRequirement:
      "Eligible chargeInstruments[] + substantive category-set coverage evaluator + contracts + calibration.",
    beforeStatus: "adapter_foundation_only",
  },

  ...[
    "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
    "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
    "MAA2-PRC-03-YOUTH-STATE",
    "MAA2-PRC-04-FITNESS-PARTICIPATION",
    "MAA2-PRC-07-DISCLOSURE-PII-STATE",
  ].map(
    (controlId): EssentialOwnershipRow => ({
      controlId,
      theme: "chronology_competing_timestamps",
      owningAdapterId: "timezone_aware_chronology_events",
      owningEvaluatorId: null,
      relatedControlIds: [
        "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
        "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
        "MAA2-PRC-03-YOUTH-STATE",
        "MAA2-PRC-04-FITNESS-PARTICIPATION",
        "MAA2-PRC-07-DISCLOSURE-PII-STATE",
      ],
      duplicateRiskCluster: "chronology_procedural_state",
      batchAInScope: true,
      stage300AcceptanceRequirement:
        "Eligible chronology/procedural structured fields + control-specific evaluator (age/calc/youth/fitness/PII) + contracts + calibration.",
      beforeStatus: "adapter_foundation_only",
    }),
  ),

  // AUD / XPP — out of Batch A (priority 8)
  ...[
    "MAA2-AUD-02-CLIENT-PLAIN",
    "MAA2-AUD-03-COURT-PRECISE",
    "MAA2-AUD-04-CPS-SPECIFIC",
    "MAA2-AUD-05-SUPERVISOR-RISK",
    "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
    "MAA2-XPP-02-PROSECUTION-CHALLENGE",
    "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
    "MAA2-XPP-04-CLIENT-COMPREHENSION",
    "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
  ].map(
    (controlId): EssentialOwnershipRow => ({
      controlId,
      theme: "out_of_batch_a_scope",
      owningAdapterId: null,
      owningEvaluatorId: null,
      relatedControlIds: [
        "MAA2-AUD-02-CLIENT-PLAIN",
        "MAA2-AUD-03-COURT-PRECISE",
        "MAA2-AUD-04-CPS-SPECIFIC",
        "MAA2-AUD-05-SUPERVISOR-RISK",
        "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
        "MAA2-XPP-02-PROSECUTION-CHALLENGE",
        "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
        "MAA2-XPP-04-CLIENT-COMPREHENSION",
        "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
      ],
      duplicateRiskCluster: "audience_perspective_depth",
      batchAInScope: false,
      stage300AcceptanceRequirement: "Multi-audience / perspective adapter packs (Batch later).",
      beforeStatus: "adapter_foundation_only",
    }),
  ),

  // VDR + ELD — out of Batch A (priority 6)
  ...[
    "MAA2-VDR-01-SOURCE-CASE-HASHES",
    "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
    "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
    "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
    "MAA2-VDR-05-MODEL-PROMPT-VERSION",
    "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
    "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
    "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
    "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
    "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
    "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
    "MAA2-ELD-03-STALE-DRAFT-MARKING",
    "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
    "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
    "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
    "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
    "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
    "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
    "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
    "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
    "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
    "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
    "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
  ].map(
    (controlId): EssentialOwnershipRow => ({
      controlId,
      theme: "out_of_batch_a_scope",
      owningAdapterId: null,
      owningEvaluatorId: null,
      relatedControlIds: controlId.startsWith("MAA2-VDR")
        ? [
            "MAA2-VDR-01-SOURCE-CASE-HASHES",
            "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
            "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
            "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
            "MAA2-VDR-05-MODEL-PROMPT-VERSION",
            "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
            "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
            "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
            "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
          ]
        : [
            "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
            "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
            "MAA2-ELD-03-STALE-DRAFT-MARKING",
            "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
            "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
            "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
            "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
            "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
            "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
            "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
            "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
            "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
            "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
            "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
          ],
      duplicateRiskCluster: controlId.startsWith("MAA2-VDR")
        ? "versioned_deterministic_receipts"
        : "evidence_locked_drafting",
      batchAInScope: false,
      stage300AcceptanceRequirement:
        "Non-synthetic version-pair / ELD-VDR adapters + evaluators (Batch later).",
      beforeStatus: "adapter_foundation_only",
    }),
  ),
];

if (BATCH_A_ESSENTIAL_OWNERSHIP.length !== 43) {
  throw new Error(
    `Batch-A essential ownership must be exactly 43, got ${BATCH_A_ESSENTIAL_OWNERSHIP.length}`,
  );
}

export function engineeringJobsNotControls(): {
  sharedAdapterJobs: BatchAAdapterId[];
  note: string;
} {
  return {
    sharedAdapterJobs: [
      "structured_charge_instrument_graph",
      "timezone_aware_chronology_events",
      "evidence_unit_identity_with_aliases",
      "source_vs_compiled_page_binding",
      "chase_item_to_evidence_unit_edges",
      "view_copy_export_api_pdf_composed_prose_capture",
    ],
    note: "Count 6 shared adapter engineering jobs — never count each unlocked control as a separate completed job.",
  };
}
