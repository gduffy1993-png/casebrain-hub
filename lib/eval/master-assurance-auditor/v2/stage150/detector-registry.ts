/**
 * Stage-150 detector registry — control-specific handlers with exact eligibility + contracts.
 * partially_implemented until Stage-150 freeze/execution prerequisites are proven.
 *
 * Ownership audit (25):
 * - LSL/CHG/FID charge wording → charge_legal_state
 * - BND still/recording/draft → document_relationship
 * - EVS/ATR state & attribution → evidence_attribution
 * - SRC-10 page identity → source_provenance (synthetic/collapse only; honest unknown ≠ defect)
 * - FID-10 quotation → source_provenance
 * - SRC-13 password/corrupt fake extraction only — NOT prompt-injection (SEC-01 is stage-300)
 * - CHR chronology cues → chronology_procedure
 * - XEX-01 disputed charge + charge-warning inseparability (not generic CCTV warning)
 * - XEX-07 sendability conflict → cross_output
 * - PRI-01 empty fiveAnswers while court present — absenceIsFinding
 * - WRD/CHS wording/chase → professional_wording / chase_actionability
 * - XPP synthetic consensus (not mere mixed disclosure) → contradiction_perspective
 * - DEF opportunity buried → contradiction_perspective
 */

import type { ImplementationStatusV22, SharedEngineId } from "../every-word/types";
import type { ControlHandlerDef } from "../every-word/types";
import { STAGE150_BATCH2_HANDLERS } from "./batch2-registry";
import { STAGE150_BATCH3_HANDLERS } from "./batch3-registry";
import { BATCH5_IMPLEMENTED_IDS } from "./batch5-implemented";
/** Batch-4 scaffolds are adapter_foundation_only — not registered as packet-local handlers. */

export type Stage150HandlerDef = ControlHandlerDef & {
  intelligenceFamily: string;
  /** Exact prerequisite tokens consumed by eligibility.ts for *probe* evaluation */
  requiredInputs: string[];
  /**
   * Stricter prerequisites for named-control exercise.
   * When absent → namedControlExerciseStatus=not_exercised even if probe evaluated.
   */
  namedControlRequiredInputs?: string[];
  detectorClassification?:
    | "genuine_structured_detector"
    | "genuine_string_quality_detector"
    | "phrase_probe_only"
    | "unavailable_missing_adapter";
  capabilityScope?: string;
  exercisedInvariant?: string;
  unexercisedInvariant?: string;
  exactPrerequisiteEvidenceRefs?: string[];
  unavailableVerdict: "not_exercised" | "unresolved";
  /** When true, empty/absent structured field is itself a finding (still requires parent surfaces). */
  absenceIsFinding?: boolean;
  ownershipNote: string;
};

const C = "scripts/maa-v2-stage150-intelligence-contracts.test.ts";

const WORDING = ["casebrain-output.json", "included_solicitor_visible_wording"] as const;

export const STAGE150_BATCH1_HANDLERS: Stage150HandlerDef[] = [
  {
    controlId: "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    engineId: "charge_legal_state",
    handlerId: "allege_to_fact",
    findingCodes: ["LSL_ALLEGE_TO_FACT"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#lsl_allege_positive`,
    negativeContract: `${C}#lsl_allege_negatives`,
    runtimePath: "evaluateChargeIntegrity→allege_to_fact",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Allegation→fact collapse only; reported allegation wording is negative.",
  },
  {
    controlId: "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
    engineId: "charge_legal_state",
    handlerId: "submission_to_finding",
    findingCodes: ["LSL_SUBMISSION_TO_FINDING"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#lsl_submission_positive`,
    negativeContract: `${C}#lsl_submission_negatives`,
    runtimePath: "evaluateChargeIntegrity→submission_to_finding",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Submission collapsed into finding; historical court findings alone are negative.",
  },
  {
    controlId: "MAA2-CHG-02-DEFENDANT-COUNT-ALLOC",
    engineId: "charge_legal_state",
    handlerId: "count_defendant_unclear",
    findingCodes: ["CHG_COUNT_DEFENDANT_UNCLEAR"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#chg_alloc_positive`,
    negativeContract: `${C}#chg_alloc_negatives`,
    runtimePath: "evaluateChargeIntegrity→count_defendant_unclear",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Count/defendant allocation ambiguity.",
  },
  {
    controlId: "MAA2-FID-09-NO-SILENT-CORRECTION",
    engineId: "charge_legal_state",
    handlerId: "silent_rewrite",
    findingCodes: ["FID_SILENT_CORRECTION"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#fid_silent_positive`,
    negativeContract: `${C}#fid_silent_negatives`,
    runtimePath: "evaluateChargeIntegrity→silent_rewrite",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "charge_integrity",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Silent rewrite admission.",
  },
  {
    controlId: "MAA2-BND-09-STILL-CLIP-VS-MASTER",
    engineId: "document_relationship",
    handlerId: "still_as_master_collapse",
    findingCodes: ["BND_STILL_MASTER_COLLAPSE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#bnd_still_master_positive`,
    negativeContract: `${C}#bnd_still_master_negatives`,
    runtimePath: "evaluateEvidenceIdentityState→still_as_master_collapse",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Still/clip ≠ master owner.",
  },
  {
    controlId: "MAA2-BND-10-RECORDING-VS-TRANSCRIPT",
    engineId: "document_relationship",
    handlerId: "recording_transcript_collapse",
    findingCodes: ["BND_RECORDING_TRANSCRIPT_COLLAPSE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#bnd_recording_positive`,
    negativeContract: `${C}#bnd_recording_negatives`,
    runtimePath: "evaluateEvidenceIdentityState→recording_transcript_collapse",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Recording ≠ transcript owner.",
  },
  {
    controlId: "MAA2-BND-11-DRAFT-VS-SIGNED",
    engineId: "document_relationship",
    handlerId: "draft_as_signed",
    findingCodes: ["BND_DRAFT_AS_SIGNED"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#bnd_draft_positive`,
    negativeContract: `${C}#bnd_draft_negatives`,
    runtimePath: "evaluateEvidenceIdentityState→draft_as_signed",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Draft ≠ signed owner.",
  },
  {
    controlId: "MAA2-EVS-02-STATE-ENUM",
    engineId: "evidence_attribution",
    handlerId: "unknown_evidence_state",
    findingCodes: ["EVS_UNKNOWN_STATE_TOKEN"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#evs_state_positive`,
    negativeContract: `${C}#evs_state_negatives`,
    runtimePath: "evaluateEvidenceIdentityState→unknown_evidence_state",
    inputEligibility: "non-empty /evidenceStates",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: ["casebrain-output.json", "nonempty:/evidenceStates"],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Unknown inferredSourceState tokens.",
  },
  {
    controlId: "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
    engineId: "evidence_attribution",
    handlerId: "unreliable_without_reason",
    findingCodes: ["EVS_UNRELIABLE_WITHOUT_REASON"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#evs_reliability_positive`,
    negativeContract: `${C}#evs_reliability_negatives`,
    runtimePath: "evaluateEvidenceIdentityState→unreliable_without_reason",
    inputEligibility: "non-empty /fiveAnswersEvidenceRows",
    intelligenceFamily: "provenance_reliability",
    requiredInputs: ["casebrain-output.json", "nonempty:/fiveAnswersEvidenceRows"],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Unreliable without reason note.",
  },
  {
    controlId: "MAA2-ATR-01-DEFENDANT-SEPARATION",
    engineId: "evidence_attribution",
    handlerId: "codefendant_leak_risk",
    findingCodes: ["ATR_CODEFENDANT_LEAK_RISK"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#atr_sep_positive`,
    negativeContract: `${C}#atr_sep_negatives`,
    runtimePath: "evaluateEvidenceIdentityState→codefendant_leak_risk",
    inputEligibility: "non-empty /evidenceStates",
    intelligenceFamily: "evidence_identity_state",
    requiredInputs: ["casebrain-output.json", "nonempty:/evidenceStates"],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Co-defendant attribution leak risk.",
  },
  {
    controlId: "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
    engineId: "source_provenance",
    handlerId: "synthetic_or_collapsed_page",
    findingCodes: ["SRC_SYNTHETIC_OR_COLLAPSED_PAGE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#src_page_positive`,
    negativeContract: `${C}#src_page_negatives`,
    runtimePath: "evaluateProvenanceReliability→synthetic_or_collapsed_page",
    inputEligibility: "non-empty /evidenceStates",
    intelligenceFamily: "provenance_reliability",
    requiredInputs: ["casebrain-output.json", "nonempty:/evidenceStates"],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Synthetic/collapsed page only; honest unknown-page is limitation not defect.",
  },
  {
    controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
    engineId: "source_provenance",
    handlerId: "quotation_without_source",
    findingCodes: ["FID_QUOTATION_WITHOUT_SOURCE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#fid_quote_positive`,
    negativeContract: `${C}#fid_quote_negatives`,
    runtimePath: "evaluateProvenanceReliability→quotation_without_source",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "provenance_reliability",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Quoted material without provenance; quotes with separate provenance are negative.",
  },
  {
    controlId: "MAA2-SRC-13-PASSWORD-CORRUPT",
    engineId: "source_provenance",
    handlerId: "password_corrupt_fake_extraction",
    findingCodes: ["SRC_PASSWORD_CORRUPT_FAKE_EXTRACTION"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#src_password_positive`,
    negativeContract: `${C}#src_password_negatives`,
    runtimePath: "evaluateProvenanceReliability→password_corrupt_fake_extraction",
    inputEligibility:
      "included wording for fake-extraction cues; binary openability still absent → not_exercised for binary-only path",
    intelligenceFamily: "document_security_resilience",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote:
      "Password/corrupt fake extraction only. Prompt-injection belongs to MAA2-SEC-01 (stage-300) — not attached here.",
  },
  {
    controlId: "MAA2-CHR-03-IMPOSSIBLE-CHRONOLOGY",
    engineId: "chronology_procedure",
    handlerId: "impossible_order_cue",
    findingCodes: ["CHR_IMPOSSIBLE_ORDER_CUE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#chr_order_positive`,
    negativeContract: `${C}#chr_order_negatives`,
    runtimePath: "evaluateChronologyProcedure→impossible_order_cue",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "chronology_procedure",
    requiredInputs: [...WORDING],
    unavailableVerdict: "unresolved",
    ownershipNote: "Impossible order wording cues; structured clocks absent.",
  },
  {
    controlId: "MAA2-CHR-02-COMPETING-TIMESTAMPS",
    engineId: "chronology_procedure",
    handlerId: "timezone_conflict_cue",
    findingCodes: ["CHR_TIMEZONE_CONFLICT_CUE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#chr_tz_positive`,
    negativeContract: `${C}#chr_tz_negatives`,
    runtimePath: "evaluateChronologyProcedure→timezone_conflict_cue",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "chronology_procedure",
    requiredInputs: [...WORDING],
    unavailableVerdict: "unresolved",
    ownershipNote: "Unresolved competing TZ tokens; reconciled GMT/BST comparisons are negative.",
  },
  {
    controlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
    engineId: "cross_output_completeness",
    handlerId: "charge_warning_detached",
    findingCodes: ["XEX_CHARGE_WARNING_DETACHED"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#xex_warn_positive`,
    negativeContract: `${C}#xex_warn_negatives`,
    runtimePath: "evaluateCrossOutput→charge_warning_detached",
    inputEligibility: "/courtNote/text + array /warningsAndGaps/doNotOverstate",
    intelligenceFamily: "cross_output_consistency",
    requiredInputs: [
      "casebrain-output.json",
      "/courtNote/text",
      "array:/warningsAndGaps/doNotOverstate",
    ],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Disputed charge ↔ charge-warning inseparability — not generic CCTV/BWV warnings.",
  },
  {
    controlId: "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
    engineId: "cross_output_completeness",
    handlerId: "exit_sendability_conflict",
    findingCodes: ["XEX_SENDABILITY_CONFLICT"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#xex_send_positive`,
    negativeContract: `${C}#xex_send_negatives`,
    runtimePath: "evaluateCrossOutput→exit_sendability_conflict",
    inputEligibility: "sendabilityLabel + reviewFooter",
    intelligenceFamily: "cross_output_consistency",
    requiredInputs: [
      "casebrain-output.json",
      "/courtNote/sendabilityLabel",
      "/exportVersion/reviewFooter",
    ],
    unavailableVerdict: "not_exercised",
    ownershipNote: "View/copy sendability conflict.",
  },
  {
    controlId: "MAA2-PRI-01-NO-IMPORTANT-OMISSION",
    engineId: "cross_output_completeness",
    handlerId: "missing_truth_map",
    findingCodes: ["XEX_MISSING_TRUTH_MAP"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#pri_omit_positive`,
    negativeContract: `${C}#pri_omit_negatives`,
    runtimePath: "evaluateCrossOutput→missing_truth_map",
    inputEligibility: "court wording present; empty fiveAnswers is the finding",
    intelligenceFamily: "cross_output_consistency",
    requiredInputs: ["casebrain-output.json", "/courtNote/text", "array_allow_empty:/fiveAnswersEvidenceRows"],
    unavailableVerdict: "not_exercised",
    absenceIsFinding: true,
    ownershipNote: "Empty/absent fiveAnswers while court present — absenceIsFinding=true.",
  },
  {
    controlId: "MAA2-WRD-10-NO-PLACEHOLDERS",
    engineId: "professional_wording",
    handlerId: "placeholder_or_dev_leak",
    findingCodes: ["WRD_PLACEHOLDER_OR_DEV"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#wrd_ph_positive`,
    negativeContract: `${C}#wrd_ph_negatives`,
    runtimePath: "evaluateProfessionalWording→placeholder_or_dev_leak",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Placeholder/dev leak.",
  },
  {
    controlId: "MAA2-WRD-02-NO-MID-TRUNCATION",
    engineId: "professional_wording",
    handlerId: "mid_truncation",
    findingCodes: ["WRD_MID_TRUNCATION"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#wrd_trunc_positive`,
    negativeContract: `${C}#wrd_trunc_negatives`,
    runtimePath: "evaluateProfessionalWording→mid_truncation",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Mid-word truncation.",
  },
  {
    controlId: "MAA2-WRD-11-NO-GENERIC-FILLER",
    engineId: "professional_wording",
    handlerId: "generic_unavailable",
    findingCodes: ["WRD_GENERIC_UNAVAILABLE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#wrd_generic_positive`,
    negativeContract: `${C}#wrd_generic_negatives`,
    runtimePath: "evaluateProfessionalWording→generic_unavailable",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Generic unavailable filler; honest qualified wording is negative.",
  },
  {
    controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
    engineId: "professional_wording",
    handlerId: "absolute_proof_ban",
    findingCodes: ["WRD_ABSOLUTE_PROOF"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#wrd_abs_positive`,
    negativeContract: `${C}#wrd_abs_negatives`,
    runtimePath: "evaluateProfessionalWording→absolute_proof_ban",
    inputEligibility: "included solicitor-visible wording ledger",
    intelligenceFamily: "professional_wording",
    requiredInputs: [...WORDING],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Absolute-proof ban.",
  },
  {
    controlId: "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
    engineId: "chase_actionability",
    handlerId: "empty_chase_draft",
    findingCodes: ["CHS_EMPTY_DRAFT"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#chs_empty_positive`,
    negativeContract: `${C}#chs_empty_negatives`,
    runtimePath: "evaluateProfessionalWording→empty_chase_draft",
    inputEligibility: "array /warningsAndGaps/chaseItems (empty array → not_exercised)",
    intelligenceFamily: "professional_wording",
    requiredInputs: ["casebrain-output.json", "nonempty:/warningsAndGaps/chaseItems"],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Empty chase draft when chase items exist.",
  },
  {
    controlId: "MAA2-XPP-06-AGREEMENT-DISAGREEMENT-RECORD",
    engineId: "contradiction_perspective",
    handlerId: "synthetic_consensus",
    findingCodes: ["XPP_SYNTHETIC_CONSENSUS"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#xpp_tension_positive`,
    negativeContract: `${C}#xpp_tension_negatives`,
    runtimePath: "evaluatePerspectives→synthetic_consensus",
    inputEligibility: "non-empty fiveAnswers + included wording",
    intelligenceFamily: "alternative_perspective",
    requiredInputs: [
      "casebrain-output.json",
      "nonempty:/fiveAnswersEvidenceRows",
      "included_solicitor_visible_wording",
    ],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Synthetic consensus only — ordinary mixed served/missing is negative.",
  },
  {
    controlId: "MAA2-DEF-01-OPPORTUNITY-CHECKLIST",
    engineId: "contradiction_perspective",
    handlerId: "defence_opportunity_buried",
    findingCodes: ["DEF_OPPORTUNITY_BURIED"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract: `${C}#def_opp_positive`,
    negativeContract: `${C}#def_opp_negatives`,
    runtimePath: "evaluatePerspectives→defence_opportunity_buried",
    inputEligibility: "/courtNote/text + non-empty fiveAnswers",
    intelligenceFamily: "alternative_perspective",
    requiredInputs: [
      "casebrain-output.json",
      "/courtNote/text",
      "nonempty:/fiveAnswersEvidenceRows",
    ],
    unavailableVerdict: "not_exercised",
    ownershipNote: "Defence opportunity buried under strong court wording + missing rows.",
  },
];

/** Batch-1 + Batch-2 + Batch-3 packet-local handlers (Batch-4 is adapter foundation only). */
export const STAGE150_PACKET_LOCAL_HANDLERS: Stage150HandlerDef[] = [
  ...STAGE150_BATCH1_HANDLERS,
  ...(STAGE150_BATCH2_HANDLERS as Stage150HandlerDef[]),
  ...(STAGE150_BATCH3_HANDLERS as Stage150HandlerDef[]),
];

export const STAGE150_PARTIAL_IDS = new Set(STAGE150_PACKET_LOCAL_HANDLERS.map((h) => h.controlId));

export function statusForStage150Control(args: {
  controlId: string;
  familyCode: string;
  activationStage: string;
  preservedFromV1: boolean;
  engineId: SharedEngineId;
}): { status: ImplementationStatusV22; reason: string } {
  if (args.preservedFromV1) {
    return { status: "implemented", reason: "V1 preserved." };
  }
  if (args.controlId === "MAA2-SEC-01-PROMPT-INJECTION-DOCS") {
    return {
      status: "specified_not_implemented",
      reason: "Prompt-injection ownership is SEC-01 (activation stage 300) — not Stage-150 packet-local.",
    };
  }
  if (BATCH5_IMPLEMENTED_IDS.has(args.controlId)) {
    return {
      status: "implemented",
      reason:
        "Batch-5 immutable promotion registry: control-specific runtime, ESA non-synthetic inputs, resolving contracts, 499 calibration + freeze/triage. currentlyRunnableOnStage150 remains false; Stage-150 selection/execution gates remain FALSE. Denominator approval PENDING_REVIEW.",
    };
  }
  if (STAGE150_PARTIAL_IDS.has(args.controlId)) {
    return {
      status: "partially_implemented",
      reason:
        "Packet-local detector + contracts + adapters exist; not fully implemented until Batch-5 acceptance bar (contracts+calibration+triage) proven. CurrentlyRunnable remains false.",
    };
  }
  if (args.familyCode === "ELD") {
    return {
      status: "specified_not_implemented",
      reason:
        "ELD requires version pairs / source-to-sentence graphs / approval receipts / full exit matrix — absent on ESA.",
    };
  }
  if (args.familyCode === "LEG") {
    return {
      status: "specified_not_implemented",
      reason: "Authority/currency registry not pinned locally — not_exercised until pinned authority data exists.",
    };
  }
  if (args.familyCode === "VDR") {
    return {
      status: "specified_not_implemented",
      reason: "Version drift/reproducibility requires versioned deterministic receipts — absent on ESA.",
    };
  }
  if (args.activationStage !== "150") {
    return { status: "specified_not_implemented", reason: "Not a Stage-150 control." };
  }
  return {
    status: "specified_not_implemented",
    reason: "No control-specific Stage-150 packet-local handler yet, or required inputs absent on ESA.",
  };
}
