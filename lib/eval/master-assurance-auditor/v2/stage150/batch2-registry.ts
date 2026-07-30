/**
 * Batch-2 handler registry — 30 controls, partially_implemented.
 */

import type { ControlHandlerDef } from "../every-word/types";
import { BATCH2_SELECTED_30 } from "./batch2-selection";

export type Batch2HandlerDef = ControlHandlerDef & {
  intelligenceFamily: string;
  requiredInputs: string[];
  namedControlRequiredInputs?: string[];
  exactPrerequisiteEvidenceRefs?: string[];
  detectorClassification?:
    | "genuine_structured_detector"
    | "genuine_string_quality_detector"
    | "phrase_probe_only"
    | "unavailable_missing_adapter";
  unavailableVerdict: "not_exercised" | "unresolved";
  absenceIsFinding?: boolean;
  ownershipNote: string;
};

const C = "scripts/maa-v2-stage150-batch2-contracts.test.ts";

const WORDING = ["casebrain-output.json", "included_solicitor_visible_wording"] as const;

function base(
  partial: Omit<
    Batch2HandlerDef,
    "positiveContract" | "negativeContract" | "receiptValidator" | "unavailableVerdict"
  > & {
    positiveContract?: string;
    negativeContract?: string;
  },
): Batch2HandlerDef {
  return {
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: partial.positiveContract ?? `${C}#${partial.controlId}_positive`,
    negativeContract: partial.negativeContract ?? `${C}#${partial.controlId}_negatives`,
    unavailableVerdict: "not_exercised",
    ...partial,
  };
}

/** Exact 30 Batch-2 handlers aligned to BATCH2_SELECTED_30. */
export const STAGE150_BATCH2_HANDLERS: Batch2HandlerDef[] = [
  base({
    controlId: "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
    engineId: "charge_legal_state",
    handlerId: "recorded_source_invisible",
    findingCodes: ["CHG_RECORDED_SOURCE_INVISIBLE"],
    runtimePath: "evaluateBatch2Charge→recorded_source_invisible",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Recorded charge source visibility.",
  }),
  base({
    controlId: "MAA2-CHG-04-COMPLETE-NOT-TRUNCATED",
    engineId: "charge_legal_state",
    handlerId: "charge_truncated",
    findingCodes: ["CHG_CHARGE_TRUNCATED"],
    runtimePath: "evaluateBatch2Charge→charge_truncated",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Charge truncation.",
  }),
  base({
    controlId: "MAA2-CHG-05-OPERATIVE-INSTRUMENT",
    engineId: "charge_legal_state",
    handlerId: "draft_as_operative",
    findingCodes: ["CHG_DRAFT_AS_OPERATIVE"],
    runtimePath: "evaluateBatch2Charge→draft_as_operative",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Operative instrument status.",
  }),
  base({
    controlId: "MAA2-CHG-06-AMENDMENT-HISTORY",
    engineId: "charge_legal_state",
    handlerId: "amendment_without_history",
    findingCodes: ["CHG_AMENDMENT_WITHOUT_HISTORY"],
    runtimePath: "evaluateBatch2Charge→amendment_without_history",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Amendment history cues.",
  }),
  base({
    controlId: "MAA2-CHG-10-WARNING-INSEPARABLE",
    engineId: "charge_legal_state",
    handlerId: "charge_warning_inseparable",
    findingCodes: ["CHG_WARNING_INSEPARABLE"],
    runtimePath: "evaluateBatch2Charge→charge_warning_inseparable",
    inputEligibility: "/courtNote/text + doNotOverstate array",
    intelligenceFamily: "charge_integrity",
    requiredInputs: ["casebrain-output.json", "/courtNote/text", "array:/warningsAndGaps/doNotOverstate"],
    ownershipNote: "Sibling to XEX-01; charge-warning inseparability owner for CHG family.",
  }),
  base({
    controlId: "MAA2-FID-02-COUNT-NUMBERS",
    engineId: "charge_legal_state",
    handlerId: "count_number_collision",
    findingCodes: ["FID_COUNT_NUMBER_COLLISION"],
    runtimePath: "evaluateBatch2Charge→count_number_collision",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Count-number fidelity.",
  }),
  base({
    controlId: "MAA2-FID-03-CHARGE-WORDING-PARTICULARS",
    engineId: "charge_legal_state",
    handlerId: "particulars_incomplete",
    findingCodes: ["FID_PARTICULARS_INCOMPLETE"],
    runtimePath: "evaluateBatch2Charge→particulars_incomplete",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Charge particulars.",
  }),
  base({
    controlId: "MAA2-FID-06-PRESERVE-NEGATIVES",
    engineId: "charge_legal_state",
    handlerId: "negation_stripped",
    findingCodes: ["FID_NEGATION_STRIPPED"],
    runtimePath: "evaluateBatch2Charge→negation_stripped",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Preserve negatives.",
  }),
  base({
    controlId: "MAA2-FID-07-PRESERVE-QUALIFIERS",
    engineId: "charge_legal_state",
    handlerId: "qualifier_stripped",
    findingCodes: ["FID_QUALIFIER_STRIPPED"],
    runtimePath: "evaluateBatch2Charge→qualifier_stripped",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Preserve qualifiers; sibling to LSL-02.",
  }),
  base({
    controlId: "MAA2-LSL-01-STATEMENT-CLASSIFICATION",
    engineId: "charge_legal_state",
    handlerId: "statement_misclassified",
    findingCodes: ["LSL_STATEMENT_MISCLASSIFIED"],
    runtimePath: "evaluateBatch2Charge→statement_misclassified",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    ownershipNote: "Statement classification.",
  }),
  base({
    controlId: "MAA2-BND-02-INSTRUMENT-STATUS",
    engineId: "document_relationship",
    handlerId: "instrument_status_collapse",
    findingCodes: ["BND_INSTRUMENT_STATUS_COLLAPSE"],
    runtimePath: "evaluateBatch2Evidence→instrument_status_collapse",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    ownershipNote: "Instrument status.",
  }),
  base({
    controlId: "MAA2-BND-07-ALIAS-SAFE-COLLAPSE",
    engineId: "document_relationship",
    handlerId: "alias_unsafe_collapse",
    findingCodes: ["BND_ALIAS_UNSAFE_COLLAPSE"],
    runtimePath: "evaluateBatch2Evidence→alias_unsafe_collapse",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    ownershipNote: "Consumes BND-09 still/master; alias-specific owner.",
  }),
  base({
    controlId: "MAA2-BND-08-EXTRACT-VS-FULL",
    engineId: "document_relationship",
    handlerId: "extract_as_full",
    findingCodes: ["BND_EXTRACT_AS_FULL"],
    runtimePath: "evaluateBatch2Evidence→extract_as_full",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    ownershipNote: "Extract vs full.",
  }),
  base({
    controlId: "MAA2-BND-12-COMPLETE-VS-PARTIAL-DISCLOSURE",
    engineId: "document_relationship",
    handlerId: "complete_vs_partial",
    findingCodes: ["BND_COMPLETE_VS_PARTIAL"],
    runtimePath: "evaluateBatch2Evidence→complete_vs_partial",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    ownershipNote: "Complete vs partial disclosure.",
  }),
  base({
    controlId: "MAA2-BND-14-QUARANTINED-CONFLICTING",
    engineId: "document_relationship",
    handlerId: "quarantine_served_conflict",
    findingCodes: ["BND_QUARANTINE_SERVED_CONFLICT"],
    runtimePath: "evaluateBatch2Evidence→quarantine_served_conflict",
    inputEligibility: "non-empty /evidenceStates",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: ["casebrain-output.json", "nonempty:/evidenceStates"],
    ownershipNote: "Quarantine vs served conflict.",
  }),
  base({
    controlId: "MAA2-BND-15-EXCLUDED-ROW-TOTALS",
    engineId: "document_relationship",
    handlerId: "excluded_row_totals",
    findingCodes: ["BND_EXCLUDED_ROW_TOTALS"],
    runtimePath: "evaluateBatch2Evidence→excluded_row_totals",
    inputEligibility: "wording + evidenceStates",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING, "nonempty:/evidenceStates"],
    ownershipNote: "Excluded row totals.",
  }),
  base({
    controlId: "MAA2-EVS-01-DIMENSION-SEPARATION",
    engineId: "evidence_attribution",
    handlerId: "dimension_collapse",
    findingCodes: ["EVS_DIMENSION_COLLAPSE"],
    runtimePath: "evaluateBatch2Evidence→dimension_collapse",
    inputEligibility: "non-empty fiveAnswers",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: ["casebrain-output.json", "nonempty:/fiveAnswersEvidenceRows"],
    namedControlRequiredInputs: ["casebrain-output.json", "nonempty:/fiveAnswersEvidenceRows"],
    exactPrerequisiteEvidenceRefs: [
      "/fiveAnswersEvidenceRows/*/existence",
      "/fiveAnswersEvidenceRows/*/reliability",
    ],
    detectorClassification: "genuine_structured_detector",
    positiveContract: "scripts/maa-v2-stage150-batch7-contracts.test.ts#evs01_positive_differing_token_collapse",
    negativeContract: "scripts/maa-v2-stage150-batch7-contracts.test.ts#evs01_negatives_valid_separated",
    ownershipNote:
      "Existence vs reliability dimensions — bidirectional domain-registry separation (same-token, reverse, out-of-domain).",
  }),
  base({
    controlId: "MAA2-ATR-08-NO-DEFENDANT-BLEED",
    engineId: "evidence_attribution",
    handlerId: "defendant_bleed",
    findingCodes: ["ATR_DEFENDANT_BLEED"],
    runtimePath: "evaluateBatch2Evidence→defendant_bleed",
    inputEligibility: "non-empty evidenceStates",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: ["casebrain-output.json", "nonempty:/evidenceStates"],
    ownershipNote: "Sibling to ATR-01.",
  }),
  base({
    controlId: "MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS",
    engineId: "evidence_attribution",
    handlerId: "limitation_not_source_linked",
    findingCodes: ["ATR_LIMITATION_NOT_SOURCE_LINKED"],
    runtimePath: "evaluateBatch2Evidence→limitation_not_source_linked",
    inputEligibility: "non-empty fiveAnswers",
    intelligenceFamily: "provenance_reliability",
    requiredInputs: ["casebrain-output.json", "nonempty:/fiveAnswersEvidenceRows"],
    ownershipNote: "Refines EVS-03 reliability owner.",
  }),
  base({
    controlId: "MAA2-CHR-01-EXACT-DATES-TZ",
    engineId: "chronology_procedure",
    handlerId: "date_without_tz",
    findingCodes: ["CHR_DATE_WITHOUT_TZ"],
    runtimePath: "evaluateBatch2Chronology→date_without_tz",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "chronology_procedure",
    requiredInputs: [...WORDING],
    ownershipNote: "Exact dates/TZ.",
  }),
  base({
    controlId: "MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING",
    engineId: "chronology_procedure",
    handlerId: "custody_interview_clock",
    findingCodes: ["CHR_CUSTODY_INTERVIEW_CLOCK"],
    runtimePath: "evaluateBatch2Chronology→custody_interview_clock",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "chronology_procedure",
    requiredInputs: [...WORDING],
    ownershipNote: "Custody/interview clocks.",
  }),
  base({
    controlId: "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE",
    engineId: "chronology_procedure",
    handlerId: "hearing_notice_lifecycle",
    findingCodes: ["CHR_HEARING_NOTICE_CONFLICT"],
    runtimePath: "evaluateBatch2Chronology→hearing_notice_lifecycle",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "chronology_procedure",
    requiredInputs: [...WORDING],
    ownershipNote: "Hearing-notice lifecycle.",
  }),
  base({
    controlId: "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS",
    engineId: "chronology_procedure",
    handlerId: "evidence_totals_conflict",
    findingCodes: ["CHR_EVIDENCE_TOTALS_CONFLICT"],
    runtimePath: "evaluateBatch2Chronology→evidence_totals_conflict",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "chronology_procedure",
    requiredInputs: [...WORDING],
    ownershipNote: "Evidence totals.",
  }),
  base({
    controlId: "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
    engineId: "cross_output_completeness",
    handlerId: "evidence_partial_warning_missing",
    findingCodes: ["XEX_EVIDENCE_PARTIAL_WARNING_MISSING"],
    runtimePath: "evaluateBatch2CrossOutput→evidence_partial_warning_missing",
    inputEligibility: "court + doNotOverstate",
    intelligenceFamily: "cross_output_consistency",
    requiredInputs: ["casebrain-output.json", "/courtNote/text", "array:/warningsAndGaps/doNotOverstate"],
    ownershipNote: "Consumes XEX-01 charge-warning ownership for non-charge partial warnings.",
  }),
  base({
    controlId: "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL",
    engineId: "cross_output_completeness",
    handlerId: "quarantine_vs_total",
    findingCodes: ["XEX_QUARANTINE_VS_TOTAL"],
    runtimePath: "evaluateBatch2CrossOutput→quarantine_vs_total",
    inputEligibility: "court + evidenceStates",
    intelligenceFamily: "cross_output_consistency",
    requiredInputs: ["casebrain-output.json", "/courtNote/text", "nonempty:/evidenceStates"],
    ownershipNote: "Quarantine vs total.",
  }),
  base({
    controlId: "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
    engineId: "cross_output_completeness",
    handlerId: "unavailable_exit_claimed",
    findingCodes: ["XEX_UNAVAILABLE_EXIT_CLAIMED"],
    runtimePath: "evaluateBatch2CrossOutput→unavailable_exit_claimed",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "cross_output_consistency",
    requiredInputs: [...WORDING],
    ownershipNote: "Unavailable exits must stay not_exercised.",
  }),
  base({
    controlId: "MAA2-WRD-04-NO-DUPLICATE-PHRASES",
    engineId: "professional_wording",
    handlerId: "duplicate_phrase",
    findingCodes: ["WRD_DUPLICATE_PHRASE"],
    runtimePath: "evaluateBatch2WordingChase→duplicate_phrase",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    ownershipNote: "Duplicate phrases.",
  }),
  base({
    controlId: "MAA2-WRD-12-NO-HOSTILE-SENSATIONAL",
    engineId: "professional_wording",
    handlerId: "hostile_sensational",
    findingCodes: ["WRD_HOSTILE_SENSATIONAL"],
    runtimePath: "evaluateBatch2WordingChase→hostile_sensational",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    ownershipNote: "Hostile/sensational tone — not SEC-01 prompt injection.",
  }),
  base({
    controlId: "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
    engineId: "audience_context",
    handlerId: "internal_audit_leak",
    findingCodes: ["AUD_INTERNAL_AUDIT_LEAK"],
    runtimePath: "evaluateBatch2WordingChase→internal_audit_leak",
    inputEligibility: "included solicitor-visible wording",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    ownershipNote: "Internal/audit leak.",
  }),
  base({
    controlId: "MAA2-CHS-06-NO-ALIAS-OR-SERVED-DUP",
    engineId: "chase_actionability",
    handlerId: "chase_already_served",
    findingCodes: ["CHS_ALREADY_SERVED_DUP"],
    runtimePath: "evaluateBatch2WordingChase→chase_already_served",
    inputEligibility: "nonempty chaseItems + evidenceStates",
    intelligenceFamily: "professional_wording",
    requiredInputs: [
      "casebrain-output.json",
      "nonempty:/warningsAndGaps/chaseItems",
      "nonempty:/evidenceStates",
    ],
    ownershipNote: "Sibling to CHS-02 empty draft.",
  }),
];

if (STAGE150_BATCH2_HANDLERS.length !== 30) {
  throw new Error(`BATCH2 handlers must be exactly 30, got ${STAGE150_BATCH2_HANDLERS.length}`);
}
if (STAGE150_BATCH2_HANDLERS.length !== BATCH2_SELECTED_30.length) {
  throw new Error("BATCH2 handlers/selection length mismatch");
}
for (let i = 0; i < 30; i++) {
  if (STAGE150_BATCH2_HANDLERS[i].controlId !== BATCH2_SELECTED_30[i].controlId) {
    throw new Error(`BATCH2 order mismatch at ${i}`);
  }
}
