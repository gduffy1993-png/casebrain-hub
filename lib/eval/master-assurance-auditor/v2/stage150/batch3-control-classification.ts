/**
 * Honest Batch-3 control classification — separates phrase probes from named-control exercise.
 * Counts are not forced; classifications arise from available ESA packet evidence vs required adapters.
 */

export type Batch3DetectorClassification =
  | "genuine_structured_detector"
  | "genuine_string_quality_detector"
  | "phrase_probe_only"
  | "unavailable_missing_adapter";

export type Batch3ControlClassification = {
  controlId: string;
  classification: Batch3DetectorClassification;
  /** What the current detector actually covers. */
  capabilityScope: string;
  exercisedInvariant: string;
  unexercisedInvariant: string;
  /** Inputs required to run the narrow probe (phrase / string / light structured). */
  probeRequiredInputs: string[];
  /** Inputs required to exercise the *named* assurance control (stricter). */
  namedControlRequiredInputs: string[];
  exactPrerequisiteEvidenceRefs: string[];
  note: string;
};

const WORDING = ["casebrain-output.json", "included_solicitor_visible_wording"] as const;
const CHASE = [
  "casebrain-output.json",
  "included_solicitor_visible_wording",
  "nonempty:/warningsAndGaps/chaseItems",
] as const;
const EVIDENCE_ROWS = [
  "casebrain-output.json",
  "included_solicitor_visible_wording",
  "nonempty:/evidenceStates",
] as const;

/**
 * Exact named-control prerequisites — control-specific tokens (not shared family bags).
 * When absent → namedControlExerciseStatus=not_exercised.
 */
const NAMED = {
  versionPrecedence: [
    "casebrain-output.json",
    "two_identified_document_versions_with_ordering",
  ],
  /** BND-06: same normalised exhibit label on ≥2 distinct document IDs (not two different labels). */
  exhibitCollisionSameLabel: [
    "casebrain-output.json",
    "same_exhibit_label_across_two_document_ids",
  ],
  missingAttachment: [
    "casebrain-output.json",
    "attachment_reference_plus_inventory_state",
  ],
  defendantAlloc: [
    "casebrain-output.json",
    "defendant_roster_plus_count_allocation",
  ],
  deadlines: ["casebrain-output.json", "event_date_plus_deadline_state"],
  chaseFivePart: [
    "casebrain-output.json",
    "nonempty:/warningsAndGaps/chaseItems",
    "chase_five_part_finding_schema",
  ],
  chaseProvenanceLinks: [
    "casebrain-output.json",
    "nonempty:/warningsAndGaps/chaseItems",
    "chase_to_evidence_provenance_links",
  ],
  chaseTypeFields: [
    "casebrain-output.json",
    "nonempty:/warningsAndGaps/chaseItems",
    "chase_evidential_procedural_type_fields",
  ],
  chaseServiceHistory: [
    "casebrain-output.json",
    "nonempty:/warningsAndGaps/chaseItems",
    "chase_service_state_with_update_history",
  ],
  chaseExcludedDisclosed: [
    "casebrain-output.json",
    "excluded_quarantined_rows_and_disclosed_counts",
  ],
  chaseGenericStructured: [
    "casebrain-output.json",
    "nonempty:/warningsAndGaps/chaseItems",
    "chase_rows_with_evidence_relationships",
  ],
  priorityBurial: ["casebrain-output.json", "surface_position_order_metadata"],
  contradictionClassification: [
    "casebrain-output.json",
    "contradiction_records_with_classification",
  ],
  contradictionRank: [
    "casebrain-output.json",
    "two_contradiction_records_with_comparable_rank",
  ],
  crossExit: ["casebrain-output.json", "comparable_exit_receipts"],
  chargeParticulars: [
    "casebrain-output.json",
    "charge_particulars_change_records",
  ],
  chargeStatementVsParticulars: [
    "casebrain-output.json",
    "charge_statement_and_particulars_identities",
  ],
  chargeStatutoryProvision: [
    "casebrain-output.json",
    "charge_statutory_provision_field",
  ],
  chargeDiscrepancyState: [
    "casebrain-output.json",
    "charge_discrepancy_state_records",
  ],
  chargeSourceAction: [
    "casebrain-output.json",
    "charge_source_and_required_action_fields",
  ],
  chargeOperativeInstrument: [
    "casebrain-output.json",
    "charge_operative_instrument_fields",
  ],
  attributionGraph: ["casebrain-output.json", "attribution_graph_fields"],
  documentVersions: [
    "casebrain-output.json",
    "document_relationship_version_fields",
  ],
  inventoryStructured: [
    "casebrain-output.json",
    "nonempty:/evidenceStates",
    "inventory_completeness_state_fields",
  ],
  reasonTaxonomy: [
    "casebrain-output.json",
    "nonempty:/evidenceStates",
    "evidence_state_reason_taxonomy_fields",
  ],
  solicitorSurfaceInventory: [
    "casebrain-output.json",
    "solicitor_expected_and_observed_surface_inventory",
  ],
  /** Contextual phrase probes need source/context comparison — wording alone insufficient. */
  sourceContextComparison: [
    "casebrain-output.json",
    "source_context_comparison_fields",
  ],
  exhibitDocRefs: [
    "casebrain-output.json",
    "resolvable_exhibit_document_bindings",
  ],
} as const;

function row(
  controlId: string,
  classification: Batch3DetectorClassification,
  args: Omit<Batch3ControlClassification, "controlId" | "classification">,
): Batch3ControlClassification {
  return { controlId, classification, ...args };
}

/**
 * Per-control audit. phrase_probe_only controls keep a wording probe but must not claim
 * named-control exercise without structured prerequisites.
 */
export const BATCH3_CONTROL_CLASSIFICATIONS: Batch3ControlClassification[] = [
  row("MAA2-BND-01-SOURCE-DOC-INVENTORY", "genuine_structured_detector", {
    capabilityScope: "evidenceStates/fiveAnswers inventory completeness collapse cues",
    exercisedInvariant: "Structured inventory rows present with completeness vs missing state fields",
    unexercisedInvariant: "No structured inventory completeness/missing state fields",
    probeRequiredInputs: [...EVIDENCE_ROWS],
    namedControlRequiredInputs: [...NAMED.inventoryStructured],
    exactPrerequisiteEvidenceRefs: [
      "/evidenceStates",
      "/fiveAnswersEvidenceRows",
      "inventory_completeness_state_fields",
    ],
    note: "Structured inventory probe; full BND-01 still needs complete inventory adapter.",
  }),
  row("MAA2-BND-03-REPLACEMENT-LINKS", "phrase_probe_only", {
    capabilityScope: "Wording cue for replacement/supersession without link language",
    exercisedInvariant: "Document relationship graph with prior/replacement instrument ids",
    unexercisedInvariant: "Only free-text replacement wording without instrument graph",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.documentVersions],
    exactPrerequisiteEvidenceRefs: ["document_relationship_version_fields"],
    note: "Phrase probe only — named control needs instrument relationship graph.",
  }),
  row("MAA2-BND-04-VERSION-PRECEDENCE", "phrase_probe_only", {
    capabilityScope: "Wording cue mentioning ≥2 version N tokens without precedence words",
    exercisedInvariant: "≥2 identified document versions plus ordering/operative state",
    unexercisedInvariant: "Version words in prose without version identity + ordering fields",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.versionPrecedence],
    exactPrerequisiteEvidenceRefs: [
      "/documentVersions",
      "two_identified_document_versions_with_ordering",
    ],
    note: "Literal 'version 1 and version 2' wording is not named-control exercise.",
  }),
  row("MAA2-BND-05-MISSING-ATTACHMENTS", "phrase_probe_only", {
    capabilityScope: "Wording cue attachment claimed present and missing",
    exercisedInvariant: "Explicit attachment reference plus inventory state",
    unexercisedInvariant: "Attachment words without inventory attachment records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.missingAttachment],
    exactPrerequisiteEvidenceRefs: ["attachment_reference_plus_inventory_state"],
    note: "Phrase probe; named control needs attachment inventory state.",
  }),
  row("MAA2-BND-06-EXHIBIT-LABEL-COLLISION", "phrase_probe_only", {
    capabilityScope: "Wording cue for duplicate exhibit label language",
    exercisedInvariant: "Same normalised exhibit label on ≥2 distinct document identities",
    unexercisedInvariant: "Collision phrase without same-label/multi-document identity records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.exhibitCollisionSameLabel],
    exactPrerequisiteEvidenceRefs: ["same_exhibit_label_across_two_document_ids"],
    note: "Requires same exhibit label across two document IDs — two different labels alone are insufficient.",
  }),
  row("MAA2-BND-13-CODEFENDANT-ONLY", "phrase_probe_only", {
    capabilityScope: "Wording cue co-defendant-only treated as shared",
    exercisedInvariant: "Party-scoped evidence ownership fields",
    unexercisedInvariant: "Ownership words without party allocation records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.attributionGraph],
    exactPrerequisiteEvidenceRefs: ["attribution_graph_fields"],
    note: "Phrase probe; named control needs party-scoped ownership graph.",
  }),
  row("MAA2-BND-16-NO-INVENTED-RELATIONSHIPS", "phrase_probe_only", {
    capabilityScope: "Wording cue inventing same-document relationship",
    exercisedInvariant: "Source-backed document relationship edges",
    unexercisedInvariant: "Inferred relationship prose without relationship edges",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.documentVersions],
    exactPrerequisiteEvidenceRefs: ["document_relationship_version_fields"],
    note: "Phrase probe only.",
  }),
  row("MAA2-FID-01-NAMES-DEFENDANT-ALLOC", "phrase_probe_only", {
    capabilityScope: "Wording cue unclear defendant allocation",
    exercisedInvariant: "Defendant roster plus count/document allocation",
    unexercisedInvariant: "Allocation words without defendant roster + count map",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.defendantAlloc],
    exactPrerequisiteEvidenceRefs: [
      "defendant_roster_plus_count_allocation",
    ],
    note: "Named control requires roster + allocation fields.",
  }),
  row("MAA2-FID-04-DATES-TIMES-LOCATIONS-MONEY", "phrase_probe_only", {
    capabilityScope: "Wording cue silent particular drift",
    exercisedInvariant: "Particular fields with source-linked prior/current values",
    unexercisedInvariant: "Drift words without particular change records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chargeParticulars],
    exactPrerequisiteEvidenceRefs: [
      "/chargeInstrument/particulars",
      "/chargeInstrument/amendmentHistory",
      "charge_particulars_change_records",
    ],
    note: "Phrase probe; named control needs particulars change records — instrumentId alone insufficient.",
  }),
  row("MAA2-FID-05-EXHIBIT-DOC-REFS", "phrase_probe_only", {
    capabilityScope: "Wording cue unresolved exhibit/document reference",
    exercisedInvariant: "Resolvable exhibit/document identity binding",
    unexercisedInvariant: "Vague reference prose without identity binding",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.exhibitDocRefs],
    exactPrerequisiteEvidenceRefs: ["resolvable_exhibit_document_bindings"],
    note: "Phrase probe.",
  }),
  row("MAA2-FID-08-NO-STRENGTHEN-ALLEGE-TO-FACT", "phrase_probe_only", {
    capabilityScope: "Wording cue allegation→proven-fact collapse (no source comparison)",
    exercisedInvariant: "Source/context comparison proving allegation strengthened vs source",
    unexercisedInvariant: "Visible wording alone without source/context comparison",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.sourceContextComparison],
    exactPrerequisiteEvidenceRefs: ["source_context_comparison_fields"],
    note: "Reclassified phrase_probe_only — wording alone cannot establish full named invariant.",
  }),
  row("MAA2-LSL-04-NO-HYPOTHESIS-TO-ADVICE", "phrase_probe_only", {
    capabilityScope: "Wording cue hypothesis presented as advice (no source comparison)",
    exercisedInvariant: "Source/context comparison proving hypothesis elevated to advice",
    unexercisedInvariant: "Visible wording alone without source/context comparison",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.sourceContextComparison],
    exactPrerequisiteEvidenceRefs: ["source_context_comparison_fields"],
    note: "Reclassified phrase_probe_only — wording alone cannot establish full named invariant.",
  }),
  row("MAA2-CHG-03-STATEMENT-VS-PARTICULARS", "phrase_probe_only", {
    capabilityScope: "Wording cue collapsing statement into charge particulars",
    exercisedInvariant: "Distinct statement vs charge-instrument identities",
    unexercisedInvariant: "Collapse words without instrument/statement ids",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chargeStatementVsParticulars],
    exactPrerequisiteEvidenceRefs: [
      "/chargeInstrument/particulars",
      "/statementIdentity",
      "charge_statement_and_particulars_identities",
    ],
    note: "Needs statement + particulars identities — instrumentId alone insufficient.",
  }),
  row("MAA2-CHG-07-STATUTORY-PROVISION", "phrase_probe_only", {
    capabilityScope: "Wording cue offence without statutory provision tokens",
    exercisedInvariant: "Charge instrument with statutory provision field",
    unexercisedInvariant: "Offence words / instrumentId without statutoryProvision field",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chargeStatutoryProvision],
    exactPrerequisiteEvidenceRefs: [
      "/chargeInstrument/statutoryProvision",
      "charge_statutory_provision_field",
    ],
    note: "Statutory provision field required — instrumentId alone does not exercise this control.",
  }),
  row("MAA2-CHG-09-VERIFIED-DISCREPANCY-STATE", "phrase_probe_only", {
    capabilityScope: "Wording cue discrepancy resolved without stated state",
    exercisedInvariant: "Discrepancy records with explicit state",
    unexercisedInvariant: "Discrepancy words / instrumentId without discrepancy state records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chargeDiscrepancyState],
    exactPrerequisiteEvidenceRefs: ["charge_discrepancy_state_records"],
    note: "Discrepancy state records required — instrumentId alone insufficient.",
  }),
  row("MAA2-CHG-11-NO-REGISTRY-AS-OPERATIVE-FACT", "phrase_probe_only", {
    capabilityScope: "Wording cue registry/meta as operative charge (no source comparison)",
    exercisedInvariant: "Source/context comparison plus operative instrument fields",
    unexercisedInvariant: "Visible wording alone without source/context comparison",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.sourceContextComparison],
    exactPrerequisiteEvidenceRefs: ["source_context_comparison_fields"],
    note: "Reclassified phrase_probe_only — wording alone cannot establish full named invariant.",
  }),
  row("MAA2-CHG-12-SOURCE-AND-REQUIRED-ACTION", "phrase_probe_only", {
    capabilityScope: "Wording cue charge-source issue without action",
    exercisedInvariant: "Charge source issue + required action fields",
    unexercisedInvariant: "Source-issue words / instrumentId without source+action fields",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chargeSourceAction],
    exactPrerequisiteEvidenceRefs: [
      "/chargeInstrument/sourceIssue",
      "/chargeInstrument/requiredAction",
      "charge_source_and_required_action_fields",
    ],
    note: "Source and required-action fields required — instrumentId alone insufficient.",
  }),
  row("MAA2-CHG-13-NO-GENERIC-VERIFY-REPLACE", "genuine_string_quality_detector", {
    capabilityScope: "Generic verify/replace charge instruction wording",
    exercisedInvariant: "Included wording ledger",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "String-level generic-instruction detector.",
  }),
  row("MAA2-EVS-04-REASON-TAXONOMY", "genuine_structured_detector", {
    capabilityScope: "evidenceStates unknown/unclear without taxonomy reason",
    exercisedInvariant: "Evidence state rows with reason taxonomy fields",
    unexercisedInvariant: "No evidenceStates reason taxonomy fields",
    probeRequiredInputs: [...EVIDENCE_ROWS],
    namedControlRequiredInputs: [...NAMED.reasonTaxonomy],
    exactPrerequisiteEvidenceRefs: ["evidence_state_reason_taxonomy_fields"],
    note: "Structured EVS probe; full taxonomy adapter still pending for complete exercise.",
  }),
  row("MAA2-ATR-02-DOCUMENT-OWNERSHIP", "phrase_probe_only", {
    capabilityScope: "Wording cue unclear document ownership",
    exercisedInvariant: "Document ownership attribution fields",
    unexercisedInvariant: "Ownership words without attribution fields",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.attributionGraph],
    exactPrerequisiteEvidenceRefs: ["attribution_graph_fields"],
    note: "Phrase probe; named control needs attribution graph.",
  }),
  row("MAA2-ATR-03-STATEMENT-OWNERSHIP", "phrase_probe_only", {
    capabilityScope: "Wording cue statement ownership collapse",
    exercisedInvariant: "Statement speaker ownership records",
    unexercisedInvariant: "Collapse words without speaker ownership records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.attributionGraph],
    exactPrerequisiteEvidenceRefs: ["attribution_graph_fields"],
    note: "Phrase probe.",
  }),
  row("MAA2-ATR-06-GROUP-VS-INDIVIDUAL", "phrase_probe_only", {
    capabilityScope: "Wording cue group→individual attribution collapse",
    exercisedInvariant: "Group vs individual attribution graph",
    unexercisedInvariant: "Attribution words without group/individual graph",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.attributionGraph],
    exactPrerequisiteEvidenceRefs: ["attribution_graph_fields"],
    note: "Phrase probe.",
  }),
  row("MAA2-ATR-07-INFERENCE-VS-PROVEN", "phrase_probe_only", {
    capabilityScope: "Wording cue inference presented as proven (no source comparison)",
    exercisedInvariant: "Source/context comparison proving inference elevated to proven",
    unexercisedInvariant: "Visible wording alone without source/context comparison",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.sourceContextComparison],
    exactPrerequisiteEvidenceRefs: ["source_context_comparison_fields"],
    note: "Reclassified phrase_probe_only — wording alone cannot establish full named invariant.",
  }),
  row("MAA2-CHR-08-PROCEDURAL-DEADLINES", "phrase_probe_only", {
    capabilityScope: "Wording cue deadline without date",
    exercisedInvariant: "Underlying event/date plus applicable deadline state",
    unexercisedInvariant: "Deadline words without event/date + deadline state",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.deadlines],
    exactPrerequisiteEvidenceRefs: ["event_date_plus_deadline_state"],
    note: "Named control needs deadline state records.",
  }),
  row("MAA2-CHR-11-DUPLICATE-OMITTED-EVENTS", "phrase_probe_only", {
    capabilityScope: "Wording cue duplicate/omitted chronology event",
    exercisedInvariant: "Chronology event identity records",
    unexercisedInvariant: "Event words without chronology event records",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.deadlines],
    exactPrerequisiteEvidenceRefs: ["event_date_plus_deadline_state"],
    note: "Phrase probe.",
  }),
  row("MAA2-PRC-01-STAGE-TAGGING", "phrase_probe_only", {
    capabilityScope: "Wording cue untagged procedural stage",
    exercisedInvariant: "Procedural stage tags on events",
    unexercisedInvariant: "Stage words without stage-tag fields",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.deadlines],
    exactPrerequisiteEvidenceRefs: ["event_date_plus_deadline_state"],
    note: "Phrase probe.",
  }),
  row("MAA2-PRC-02-WRONG-STAGE-DETECT", "phrase_probe_only", {
    capabilityScope: "Wording cue wrong procedural stage",
    exercisedInvariant: "Recorded vs actual stage fields",
    unexercisedInvariant: "Wrong-stage words without stage comparison fields",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.deadlines],
    exactPrerequisiteEvidenceRefs: ["event_date_plus_deadline_state"],
    note: "Phrase probe.",
  }),
  row("MAA2-CHS-01-FIVE-PART-FINDING", "genuine_structured_detector", {
    capabilityScope: "Chase rows validated against five-part finding schema",
    exercisedInvariant: "Non-empty chase rows with what/why/fromWhom/byWhen/ifNot fields",
    unexercisedInvariant: "Chase row or empty copySuggestion without five-part schema",
    probeRequiredInputs: [...CHASE],
    namedControlRequiredInputs: [...NAMED.chaseFivePart],
    exactPrerequisiteEvidenceRefs: ["chase_five_part_finding_schema"],
    note: "Named exercise requires actual five-part schema — empty copySuggestion alone is insufficient.",
  }),
  row("MAA2-CHS-03-PROVENANCE-LINK", "phrase_probe_only", {
    capabilityScope: "Chase/request wording without provenance cue",
    exercisedInvariant: "Chase rows linked to evidence via provenance fields",
    unexercisedInvariant: "Chase words without chase-to-evidence provenance links",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chaseProvenanceLinks],
    exactPrerequisiteEvidenceRefs: ["chase_to_evidence_provenance_links"],
    note: "Named control needs chase↔evidence provenance links.",
  }),
  row("MAA2-CHS-04-EVIDENTIAL-VS-PROCEDURAL", "phrase_probe_only", {
    capabilityScope: "Wording cue evidential chase collapsed to procedural",
    exercisedInvariant: "Chase rows with explicit evidential/procedural chaseType",
    unexercisedInvariant: "evidenceRef alone without chaseType field",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chaseTypeFields],
    exactPrerequisiteEvidenceRefs: ["chase_evidential_procedural_type_fields"],
    note: "evidenceRef without chaseType remains named not_exercised.",
  }),
  row("MAA2-CHS-05-NO-TEMPLATE-ONLY", "genuine_string_quality_detector", {
    capabilityScope: "Template placeholders in chase/solicitor wording",
    exercisedInvariant: "Included wording ledger",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "String-level template artefact detector.",
  }),
  row("MAA2-CHS-07-UPDATE-ON-SERVICE-CHANGE", "phrase_probe_only", {
    capabilityScope: "Wording cue stale chase after service change",
    exercisedInvariant: "Prior/current service state plus update history on chase/evidence",
    unexercisedInvariant: "Service-change words without prior/current state + history",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chaseServiceHistory],
    exactPrerequisiteEvidenceRefs: ["chase_service_state_with_update_history"],
    note: "Requires prior/current service state plus update history.",
  }),
  row("MAA2-CHS-08-DISCLOSE-EXCLUDED", "phrase_probe_only", {
    capabilityScope: "Wording cue excluded material omitted from chase",
    exercisedInvariant: "Excluded/quarantined request rows plus disclosed counts",
    unexercisedInvariant: "Excluded words without excluded rows + disclosed counts",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.chaseExcludedDisclosed],
    exactPrerequisiteEvidenceRefs: ["excluded_quarantined_rows_and_disclosed_counts"],
    note: "Requires excluded/quarantined rows and disclosed counts.",
  }),
  row("MAA2-CHS-09-CPS-PROFESSIONAL-LANGUAGE", "genuine_string_quality_detector", {
    capabilityScope: "Unprofessional/hostile CPS chase language in wording",
    exercisedInvariant: "Included wording ledger",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "String-level professional-language detector.",
  }),
  row("MAA2-WRD-01-GRAMMAR-SENTENCES", "genuine_string_quality_detector", {
    capabilityScope: "Broken/duplicate-token sentences on every-word ledger",
    exercisedInvariant: "Included solicitor-visible wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-03-COMPLETE-DISCLAIMERS", "genuine_string_quality_detector", {
    capabilityScope: "Truncated disclaimer endings on every-word ledger",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-05-TEMPLATE-JOINS", "genuine_string_quality_detector", {
    capabilityScope: "Template join artefacts {{ [[ <% in wording",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-06-SPACES-PUNCTUATION", "genuine_string_quality_detector", {
    capabilityScope: "Spacing/punctuation corruption patterns",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-07-LISTS-PIPE-FRAGMENTS", "genuine_string_quality_detector", {
    capabilityScope: "Pipe-list fragments leaked into prose",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-08-CAPITALISATION", "genuine_string_quality_detector", {
    capabilityScope: "Hostile shouting caps in solicitor-visible text",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-09-PROTECTED-ACRONYMS", "genuine_string_quality_detector", {
    capabilityScope: "Corrupted protected legal acronyms (mG11/cCtv/…)",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-13-WARNINGS-WITH-ACTIONS", "genuine_string_quality_detector", {
    capabilityScope: "Do-not-state warning without action cue",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-WRD-14-NO-EXCESS-DISCLAIMERS", "genuine_string_quality_detector", {
    capabilityScope: "Excess stacked disclaimers obscuring substance",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "Genuine string-quality detector.",
  }),
  row("MAA2-AUD-01-SOLICITOR-COMPLETE", "phrase_probe_only", {
    capabilityScope: "Wording cue solicitor surface incomplete (no inventory comparison)",
    exercisedInvariant: "Expected solicitor-surface inventory vs observed surface inventory",
    unexercisedInvariant: "Completeness words without expected+observed surface inventories",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.solicitorSurfaceInventory],
    exactPrerequisiteEvidenceRefs: [
      "solicitor_expected_and_observed_surface_inventory",
    ],
    note: "Reclassified phrase_probe_only — requires expected and observed surface inventories.",
  }),
  row("MAA2-XEX-03-ATTRIBUTION-LIMIT-ATTACHED", "phrase_probe_only", {
    capabilityScope: "Wording cue detached attribution limitation",
    exercisedInvariant: "Comparable exit receipts with attribution-limit attachment",
    unexercisedInvariant: "Limit words without comparable exit receipts",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.crossExit],
    exactPrerequisiteEvidenceRefs: ["comparable_exit_receipts"],
    note: "Cross-exit control — ESA packets lack comparable exit receipts.",
  }),
  row("MAA2-XEX-05-INFERRED-DATE-QUALIFIED", "genuine_string_quality_detector", {
    capabilityScope: "Inferred date wording without qualification tokens",
    exercisedInvariant: "Included wording",
    unexercisedInvariant: "No included wording",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...WORDING],
    exactPrerequisiteEvidenceRefs: ["included_solicitor_visible_wording"],
    note: "String-level qualification detector.",
  }),
  row("MAA2-PRI-02-NO-PRIORITY-BURIAL", "phrase_probe_only", {
    capabilityScope: "Wording cue priority buried/footer-only",
    exercisedInvariant: "Surface position/order metadata for priority items",
    unexercisedInvariant: "Burial words without position/order metadata",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.priorityBurial],
    exactPrerequisiteEvidenceRefs: ["surface_position_order_metadata"],
    note: "Named control needs position/order metadata — not phrase alone.",
  }),
  row("MAA2-PRI-03-PRIORITY-CHECKLIST", "phrase_probe_only", {
    capabilityScope: "Wording cue priority checklist missing",
    exercisedInvariant: "Priority checklist structure present or explicitly absent-as-finding",
    unexercisedInvariant: "Checklist words without checklist structure",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.priorityBurial],
    exactPrerequisiteEvidenceRefs: ["surface_position_order_metadata"],
    note: "Phrase probe.",
  }),
  row("MAA2-CTX-01-CLASSIFY-CONTRADICTIONS", "phrase_probe_only", {
    capabilityScope: "Wording cue unclassified contradiction",
    exercisedInvariant: "Contradiction records with explicit classification fields",
    unexercisedInvariant: "Contradiction words without classification fields",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.contradictionClassification],
    exactPrerequisiteEvidenceRefs: ["contradiction_records_with_classification"],
    note: "CTX-01 classification data does not exercise CTX-02 ranking.",
  }),
  row("MAA2-CTX-02-RANK-HIGH-OVER-LOW", "phrase_probe_only", {
    capabilityScope: "Wording cue low-rank elevated over material issue",
    exercisedInvariant: "≥2 contradiction records with comparable materiality/rank",
    unexercisedInvariant: "Classification-only or single contradiction without comparable ranks",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.contradictionRank],
    exactPrerequisiteEvidenceRefs: ["two_contradiction_records_with_comparable_rank"],
    note: "Requires ≥2 ranked contradiction records — CTX-01 classification alone insufficient.",
  }),
  row("MAA2-DEF-02-NO-CONCLUSION-PRESENTATION", "phrase_probe_only", {
    capabilityScope: "Wording cue defence conclusion as neutral summary (no source comparison)",
    exercisedInvariant: "Source/context comparison proving conclusion presented as neutral",
    unexercisedInvariant: "Visible wording alone without source/context comparison",
    probeRequiredInputs: [...WORDING],
    namedControlRequiredInputs: [...NAMED.sourceContextComparison],
    exactPrerequisiteEvidenceRefs: ["source_context_comparison_fields"],
    note: "Reclassified phrase_probe_only — wording alone cannot establish full named invariant.",
  }),
];

export const BATCH3_CLASSIFICATION_BY_ID: Record<string, Batch3ControlClassification> =
  Object.fromEntries(BATCH3_CONTROL_CLASSIFICATIONS.map((c) => [c.controlId, c]));

export function classificationCounts(): Record<Batch3DetectorClassification, number> {
  const counts: Record<Batch3DetectorClassification, number> = {
    genuine_structured_detector: 0,
    genuine_string_quality_detector: 0,
    phrase_probe_only: 0,
    unavailable_missing_adapter: 0,
  };
  for (const c of BATCH3_CONTROL_CLASSIFICATIONS) counts[c.classification] += 1;
  return counts;
}

/** Length must match Batch-3 selection; not a forced target — arises from selection audit. */
export function assertClassificationsCoverSelection(selectedIds: readonly string[]): void {
  if (BATCH3_CONTROL_CLASSIFICATIONS.length !== selectedIds.length) {
    throw new Error(
      `Batch-3 classifications ${BATCH3_CONTROL_CLASSIFICATIONS.length} != selection ${selectedIds.length}`,
    );
  }
  for (const id of selectedIds) {
    if (!BATCH3_CLASSIFICATION_BY_ID[id]) {
      throw new Error(`Missing Batch-3 classification for ${id}`);
    }
  }
}
