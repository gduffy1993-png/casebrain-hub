/**
 * Stage-150 ownership / deduplication map.
 * Owner controls emit findings; consumers may reference owner findings only.
 */

export type OwnershipEdge = {
  ownerControlId: string;
  consumerControlId: string;
  relationship: "owns_occurrence" | "cross_checks" | "refines" | "sibling";
  note: string;
};

export type IntelligenceFamilyPlan = {
  familyId: string;
  title: string;
  familyCodes: string[];
  stage150ControlCount: number;
  sharedEngineId: string;
  esaRunnableNow: boolean;
  requiredInputs: string[];
  missingOnEsa: string[];
  implementationStrategy: string;
};

export const STAGE150_INTELLIGENCE_FAMILIES: IntelligenceFamilyPlan[] = [
  {
    familyId: "charge_integrity",
    title: "Charge integrity",
    familyCodes: ["CHG", "LSL", "FID"],
    stage150ControlCount: 28,
    sharedEngineId: "charge_legal_state",
    esaRunnableNow: true,
    requiredInputs: ["casebrain-output.json", "/courtNote/text", "/fiveAnswersEvidenceRows", "/warningsAndGaps"],
    missingOnEsa: ["operative_instrument_graph", "amendment_supersession_edges"],
    implementationStrategy:
      "Packet-local heuristics on court/chase/truth-map wording for silent rewrite, allegation→fact, count/defendant cues; instrument graph remains not_exercised.",
  },
  {
    familyId: "evidence_identity_state",
    title: "Evidence identity and state",
    familyCodes: ["EVS", "ATR", "BND"],
    stage150ControlCount: 29,
    sharedEngineId: "evidence_attribution",
    esaRunnableNow: true,
    requiredInputs: ["casebrain-output.json", "/evidenceStates", "/fiveAnswersEvidenceRows"],
    missingOnEsa: ["evidence_relationship_edges", "media_form_tags_structured"],
    implementationStrategy:
      "Use evidenceStates inferredSourceState/existenceLabel + wording for served/referred/missing and still≠master; co-defendant cues from labels/notes.",
  },
  {
    familyId: "provenance_reliability",
    title: "Provenance and reliability",
    familyCodes: ["SRC", "ATR", "EVS"],
    stage150ControlCount: 19,
    sharedEngineId: "source_provenance",
    esaRunnableNow: true,
    requiredInputs: ["casebrain-output.json", "/evidenceStates/*/evidenceAnchor", "/fiveAnswersEvidenceRows/*/note"],
    missingOnEsa: ["page_units", "ocr_visual_metadata", "original_source_documents"],
    implementationStrategy:
      "Honest unknown-page and unreliable-without-reason on ESA text; SRC PDF/OCR controls remain specified_not_implemented.",
  },
  {
    familyId: "chronology_procedure",
    title: "Chronology and procedure",
    familyCodes: ["CHR", "PRC"],
    stage150ControlCount: 15,
    sharedEngineId: "chronology_procedure",
    esaRunnableNow: false,
    requiredInputs: ["chronology_timestamps", "hearing_notice_lifecycle"],
    missingOnEsa: ["chronology_timestamps", "custody_interview_clocks", "hearing_notice_lifecycle"],
    implementationStrategy:
      "Text-cue chronology heuristics only where dates appear in included wording; structured clocks remain not_exercised.",
  },
  {
    familyId: "cross_output_consistency",
    title: "Cross-output consistency",
    familyCodes: ["XEX", "PRI", "AUD"],
    stage150ControlCount: 18,
    sharedEngineId: "cross_output_completeness",
    esaRunnableNow: true,
    requiredInputs: ["casebrain-output.json", "exit:view", "exit:copy", "/warningsAndGaps/doNotOverstate", "/courtNote/text"],
    missingOnEsa: ["exit:api", "exit:pdf", "exit:composed_prose", "client_summary_surface"],
    implementationStrategy:
      "Compare court/chase/doNotOverstate/export footer on packet; full multi-exit matrix not_exercised for absent exits.",
  },
  {
    familyId: "professional_wording",
    title: "Professional wording",
    familyCodes: ["WRD"],
    stage150ControlCount: 15,
    sharedEngineId: "professional_wording",
    esaRunnableNow: true,
    requiredInputs: ["included solicitor-visible wording occurrences"],
    missingOnEsa: [],
    implementationStrategy: "Expand deterministic wording hygiene with control-owned finding codes.",
  },
  {
    familyId: "evidence_locked_drafting",
    title: "Evidence-locked drafting",
    familyCodes: ["ELD"],
    stage150ControlCount: 14,
    sharedEngineId: "version_reproducibility",
    esaRunnableNow: false,
    requiredInputs: [
      "source_to_sentence_graph",
      "version_pairs",
      "approval_receipts",
      "revision_ledger",
      "full_exit_block_matrix",
    ],
    missingOnEsa: [
      "source_to_sentence_graph",
      "version_pairs",
      "approval_receipts",
      "revision_ledger",
      "full_exit_block_matrix",
    ],
    implementationStrategy:
      "Specification + dependency schema only; all 14 remain specified_not_implemented until adapters exist.",
  },
  {
    familyId: "alternative_perspective",
    title: "Alternative-perspective checks",
    familyCodes: ["CTX", "DEF", "XPP"],
    stage150ControlCount: 10,
    sharedEngineId: "contradiction_perspective",
    esaRunnableNow: true,
    requiredInputs: ["casebrain-output.json", "/fiveAnswersEvidenceRows", "/warningsAndGaps", "/evidenceStates"],
    missingOnEsa: ["human_perspective_signoff", "independent_panel_receipts"],
    implementationStrategy:
      "Analytical perspective heuristics over evidence/chase contradictions; never invent legal sign-off.",
  },
  {
    familyId: "document_security_resilience",
    title: "Document/security resilience",
    familyCodes: ["SRC"],
    stage150ControlCount: 6,
    sharedEngineId: "source_provenance",
    esaRunnableNow: false,
    requiredInputs: ["original_source_documents", "ocr_visual_metadata", "security_tool_evidence"],
    missingOnEsa: ["original_source_documents", "ocr_visual_metadata", "security_tool_evidence"],
    implementationStrategy:
      "Textual cues for password/corrupt/injection in wording only; binary/security tool controls not_exercised.",
  },
  {
    familyId: "coverage_gap_generation",
    title: "Coverage-gap generation",
    familyCodes: ["COV"],
    stage150ControlCount: 0,
    sharedEngineId: "cross_output_completeness",
    esaRunnableNow: true,
    requiredInputs: ["population eligibility summaries", "control eligibility matrix"],
    missingOnEsa: [],
    implementationStrategy:
      "Generate gap register from untested offence×procedure×evidence-state×audience×exit combinations; no private real-case data.",
  },
];

/** Dedup edges — occurrence owners. */
export const STAGE150_OWNERSHIP_EDGES: OwnershipEdge[] = [
  {
    ownerControlId: "MAA2-BND-09-STILL-CLIP-VS-MASTER",
    consumerControlId: "MAA2-BND-07-ALIAS-SAFE-COLLAPSE",
    relationship: "owns_occurrence",
    note: "Still/master collapse findings owned by BND-09; BND-07 may cross-check only.",
  },
  {
    ownerControlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
    consumerControlId: "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    relationship: "sibling",
    note: "Absolute-proof vs allegation→fact are sibling wording risks; separate finding codes.",
  },
  {
    ownerControlId: "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
    consumerControlId: "MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS",
    relationship: "refines",
    note: "Unreliable-without-reason owned by EVS-03; ATR-09 may refine with source-link checks.",
  },
  {
    ownerControlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
    consumerControlId: "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
    relationship: "cross_checks",
    note: "Warning attachment owned by XEX-01; XEX-02 cross-checks evidence-partial warning presence.",
  },
  {
    ownerControlId: "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
    consumerControlId: "MAA2-CHS-01-FIVE-PART-FINDING",
    relationship: "sibling",
    note: "Empty draft vs five-part chase completeness are sibling chase controls.",
  },
  {
    ownerControlId: "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
    consumerControlId: "MAA2-FID-10-QUOTATION-FIDELITY",
    relationship: "sibling",
    note: "Page identity vs quotation fidelity are sibling provenance risks.",
  },
  {
    ownerControlId: "MAA2-BND-10-RECORDING-VS-TRANSCRIPT",
    consumerControlId: "MAA2-BND-11-DRAFT-VS-SIGNED",
    relationship: "sibling",
    note: "Form-collapse controls are siblings under document_relationship; distinct finding codes.",
  },
];
