/**
 * Batch-9 control specs — exact 37 unlock-map controls.
 * Two axes: evaluatorImplementationClass × executionAvailability.
 */

import { BATCH8_UNLOCK_MAP } from "../batch8/unlock-map";
import {
  BATCH9_CONTRACTS_FILE,
  countsAsNamedEvaluator,
  type Batch9ControlSpec,
  type Batch9EvaluatorImplementationClass,
  type Batch9ExecutionAvailability,
} from "./schemas";

function contracts(idSlug: string) {
  const base = `${BATCH9_CONTRACTS_FILE}#b9_${idSlug}`;
  return {
    positiveContract: `${base}_positive`,
    negativeContract: `${base}_negative`,
    unavailableContract: `${base}_unavailable`,
    mutationContract: `${base}_mutation`,
  };
}

function spec(
  partial: Omit<Batch9ControlSpec, "handlerId" | "findingCode" | "contractRefs" | "evaluatorClass"> & {
    handlerId?: string;
    findingCode?: string;
    idSlug: string;
  },
): Batch9ControlSpec {
  const short = partial.controlId.replace(/^MAA2-/, "").toLowerCase().replace(/-/g, "_");
  const { idSlug, ...rest } = partial;
  return {
    ...rest,
    evaluatorClass: partial.evaluatorImplementationClass,
    handlerId: partial.handlerId ?? `b9_${short}`.slice(0, 48),
    findingCode: partial.findingCode ?? `B9_${short}`.toUpperCase().slice(0, 64),
    contractRefs: contracts(idSlug),
  };
}

/** Exact 37 controls — implementation class split from ESA availability. */
export const BATCH9_CONTROL_SPECS: readonly Batch9ControlSpec[] = [
  spec({
    idSlug: "chg01",
    controlId: "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].instrumentId", "chargeInstruments[].sourceDocument"],
    applicabilityRule: "Applicable when complete chargeInstruments[] include sourceDocument.",
    missingInputReason:
      "charge_instruments adapter not eligible — structured chargeInstruments[] with sourceDocument absent",
    findingOwnership: "Batch-9 owns recorded-source visibility on structured instruments.",
    unavailableBehaviour: "namedControlExerciseStatus=not_exercised; no findings invented from courtNote prose.",
  }),
  spec({
    idSlug: "chg02",
    controlId: "MAA2-CHG-02-DEFENDANT-COUNT-ALLOC",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].count", "chargeInstruments[].defendantAllocation"],
    applicabilityRule: "Applicable when complete instruments expose count + defendantAllocation.",
    missingInputReason:
      "charge_instruments adapter not eligible — count/defendantAllocation structured fields absent",
    findingOwnership: "Batch-9 owns defendant/count allocation on structured instruments.",
    unavailableBehaviour: "not_exercised until complete instrument allocation fields exist.",
  }),
  spec({
    idSlug: "chg04",
    controlId: "MAA2-CHG-04-COMPLETE-NOT-TRUNCATED",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].exactWording"],
    applicabilityRule: "Applicable when structured exactWording is present on complete instruments.",
    missingInputReason: "charge_instruments adapter not eligible — exactWording absent",
    findingOwnership: "Batch-9 owns truncation checks on structured exactWording.",
    unavailableBehaviour: "not_exercised; prose truncation probes are non-authoritative.",
  }),
  spec({
    idSlug: "chg05",
    controlId: "MAA2-CHG-05-OPERATIVE-INSTRUMENT",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].status"],
    applicabilityRule:
      "Applicable when status is present; amended instruments may be operative — only draft+operative collision is a defect.",
    missingInputReason: "charge_instruments adapter not eligible — status/operative instrument graph absent",
    findingOwnership: "Batch-9 owns operative vs draft collision on structured status.",
    unavailableBehaviour: "not_exercised without structured status.",
  }),
  spec({
    idSlug: "chg06",
    controlId: "MAA2-CHG-06-AMENDMENT-HISTORY",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "chargeInstruments[].version",
      "chargeInstruments[].replacesInstrumentId|supersededByInstrumentId",
    ],
    applicabilityRule: "Applicable when supersession links exist on complete instruments.",
    missingInputReason: "charge_instruments adapter not eligible — amendment/supersession links absent",
    findingOwnership: "Batch-9 owns amendment history completeness on instrument graph.",
    unavailableBehaviour: "not_exercised without supersession/version fields.",
  }),
  spec({
    idSlug: "chg10",
    controlId: "MAA2-CHG-10-WARNING-INSEPARABLE",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "chargeInstruments[]",
      "exitPayloadReceipts.*.payloadIdentity",
      "exitPayloadReceipts.*.chargeWarningAttached",
    ],
    applicabilityRule:
      "Applicable only when complete instruments AND all seven genuine exits carry chargeWarningAttached.",
    missingInputReason:
      "unavailable_missing_structured_field — exitPayloadReceipts.*.chargeWarningAttached coupled to instruments absent on ESA",
    findingOwnership: "Batch-9 owns inseparability when coupled exit warning fields exist.",
    unavailableBehaviour: "not_exercised until chargeWarningAttached exists on genuine exits.",
  }),
  spec({
    idSlug: "lsl01",
    controlId: "MAA2-LSL-01-STATEMENT-CLASSIFICATION",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].statementClassification"],
    applicabilityRule:
      "Applicable only when structured statementClassification is present — prose allegation/fact heuristics are insufficient.",
    missingInputReason:
      "unavailable_missing_structured_field — statementClassification structured legal state absent (prose heuristics forbidden)",
    findingOwnership: "Batch-9 owns LSL only with structured statementClassification.",
    unavailableBehaviour: "not_exercised; prior phrase probes remain non-authoritative.",
  }),
  spec({
    idSlug: "lsl03",
    controlId: "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
    adapterId: "charge_instruments",
    engineId: "charge_legal_state",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].legalStateRole"],
    applicabilityRule:
      "Applicable only when structured legalStateRole distinguishes submission vs finding.",
    missingInputReason:
      "unavailable_missing_structured_field — legalStateRole structured field absent (prose heuristics forbidden)",
    findingOwnership: "Batch-9 owns LSL-03 only with structured legalStateRole.",
    unavailableBehaviour: "not_exercised until structured legalStateRole exists.",
  }),
  spec({
    idSlug: "bnd02",
    controlId: "MAA2-BND-02-INSTRUMENT-STATUS",
    adapterId: "charge_instruments",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].status"],
    applicabilityRule: "Applicable when status is present on complete instruments.",
    missingInputReason: "charge_instruments adapter not eligible — instrument status absent",
    findingOwnership: "Batch-9 owns instrument status binding.",
    unavailableBehaviour: "not_exercised without status.",
  }),
  spec({
    idSlug: "bnd03",
    controlId: "MAA2-BND-03-REPLACEMENT-LINKS",
    adapterId: "charge_instruments",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].replacesInstrumentId", "chargeInstruments[].supersededByInstrumentId"],
    applicabilityRule: "Applicable when replacement/supersession ids are present.",
    missingInputReason: "charge_instruments adapter not eligible — replacement links absent",
    findingOwnership: "Batch-9 owns replacement link integrity.",
    unavailableBehaviour: "not_exercised without replacement graph.",
  }),
  spec({
    idSlug: "bnd04",
    controlId: "MAA2-BND-04-VERSION-PRECEDENCE",
    adapterId: "charge_instruments",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chargeInstruments[].version", "chargeInstruments[].instrumentId"],
    applicabilityRule: "Applicable when version + instrumentId present on complete instruments.",
    missingInputReason: "charge_instruments adapter not eligible — version precedence graph absent",
    findingOwnership: "Batch-9 owns version precedence self-cycle checks.",
    unavailableBehaviour: "not_exercised without version graph.",
  }),

  spec({
    idSlug: "atr01",
    controlId: "MAA2-ATR-01-DEFENDANT-SEPARATION",
    adapterId: "evidence_units",
    engineId: "evidence_attribution",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["evidenceUnitId", "subjectDefendantId|personId"],
    applicabilityRule: "Applicable when every unit has evidenceUnitId + subjectDefendantId/personId.",
    missingInputReason:
      "evidence_units adapter not eligible — subjectDefendantId/personId and evidenceUnitId absent",
    findingOwnership: "Batch-9 owns defendant separation on complete units.",
    unavailableBehaviour: "not_exercised on partial ESA rows.",
  }),
  spec({
    idSlug: "atr08",
    controlId: "MAA2-ATR-08-NO-DEFENDANT-BLEED",
    adapterId: "evidence_units",
    engineId: "evidence_attribution",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["evidenceUnitId", "subjectDefendantId|personId"],
    applicabilityRule: "Applicable when complete units carry defendant identity fields.",
    missingInputReason: "evidence_units adapter not eligible — defendant identity fields absent",
    findingOwnership: "Batch-9 owns defendant-bleed checks on complete units.",
    unavailableBehaviour: "not_exercised without identity bindings.",
  }),
  spec({
    idSlug: "bnd07",
    controlId: "MAA2-BND-07-ALIAS-SAFE-COLLAPSE",
    adapterId: "evidence_units",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["evidenceUnitId", "aliases"],
    applicabilityRule: "Applicable when complete units expose aliases + evidenceUnitId.",
    missingInputReason: "evidence_units adapter not eligible — evidenceUnitId/alias structure incomplete",
    findingOwnership: "Batch-9 owns alias-safe collapse.",
    unavailableBehaviour: "not_exercised without unit identity.",
  }),
  spec({
    idSlug: "bnd08",
    controlId: "MAA2-BND-08-EXTRACT-VS-FULL",
    adapterId: "evidence_units",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["extractFullRelationship|extract_full_capable_modality"],
    applicabilityRule:
      "Applicable only to extract/full-capable units (explicit relationship or extract/full modality).",
    missingInputReason: "evidence_units adapter not eligible — extract/full-capable units absent",
    findingOwnership: "Batch-9 owns extract≠full only on capable units.",
    unavailableBehaviour: "not_exercised when no extract/full-capable units; non-capable rows ignored.",
  }),
  spec({
    idSlug: "bnd09",
    controlId: "MAA2-BND-09-STILL-CLIP-VS-MASTER",
    adapterId: "evidence_units",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["evidenceUnitId", "evidenceTypeOrModality|label"],
    applicabilityRule: "Applicable when modality/label indicates still/clip vs master on complete units.",
    missingInputReason: "evidence_units adapter not eligible — modality/identity incomplete for still≠master",
    findingOwnership: "Batch-9 owns still/clip≠master on complete units.",
    unavailableBehaviour: "not_exercised without complete units.",
  }),
  spec({
    idSlug: "bnd10",
    controlId: "MAA2-BND-10-RECORDING-VS-TRANSCRIPT",
    adapterId: "evidence_units",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["evidenceUnitId", "evidenceTypeOrModality|label"],
    applicabilityRule: "Applicable when modality/label indicates recording vs transcript.",
    missingInputReason: "evidence_units adapter not eligible — recording/transcript relationship absent",
    findingOwnership: "Batch-9 owns recording≠transcript on complete units.",
    unavailableBehaviour: "not_exercised without complete units.",
  }),
  spec({
    idSlug: "bnd11",
    controlId: "MAA2-BND-11-DRAFT-VS-SIGNED",
    adapterId: "evidence_units",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["draftFinalRelationship|version_state_relevant"],
    applicabilityRule:
      "Applicable only where version state is relevant (draftFinalRelationship or draft/signed/final cues).",
    missingInputReason: "evidence_units adapter not eligible — version-state-relevant units absent",
    findingOwnership: "Batch-9 owns draft≠signed only on version-relevant units.",
    unavailableBehaviour: "not_exercised when no version-relevant units; others ignored.",
  }),
  spec({
    idSlug: "evs04",
    controlId: "MAA2-EVS-04-REASON-TAXONOMY",
    adapterId: "evidence_units",
    engineId: "evidence_attribution",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["existence", "reliability|taxonomyReason"],
    applicabilityRule: "Applicable when complete units carry existence with taxonomy reason fields.",
    missingInputReason:
      "evidence_units adapter not eligible — complete units with taxonomy reason fields absent",
    findingOwnership: "Batch-9 owns reason taxonomy on complete units.",
    unavailableBehaviour: "not_exercised without complete units.",
  }),

  spec({
    idSlug: "chr01",
    controlId: "MAA2-CHR-01-EXACT-DATES-TZ",
    adapterId: "chronology_events",
    engineId: "chronology_procedure",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chronologyEvents[].timestamp", "chronologyEvents[].timezone"],
    applicabilityRule: "Applicable when chronologyEvents[] are complete with timestamp+timezone.",
    missingInputReason: "chronology_events adapter not eligible — structured chronologyEvents absent",
    findingOwnership: "Batch-9 owns exact date/timezone on structured chronology.",
    unavailableBehaviour: "not_exercised; exportVersion.generatedAt is not a chronology event.",
  }),
  spec({
    idSlug: "chr02",
    controlId: "MAA2-CHR-02-COMPETING-TIMESTAMPS",
    adapterId: "chronology_events",
    engineId: "chronology_procedure",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chronologyEvents[].competingEventGroupId", "chronologyEvents[].confidence"],
    applicabilityRule: "Applicable when competingEventGroupId is present among complete events.",
    missingInputReason: "chronology_events adapter not eligible — competing-event groups absent",
    findingOwnership: "Batch-9 owns competing timestamp confidence.",
    unavailableBehaviour: "not_exercised without competing groups.",
  }),
  spec({
    idSlug: "chr03",
    controlId: "MAA2-CHR-03-IMPOSSIBLE-CHRONOLOGY",
    adapterId: "chronology_events",
    engineId: "chronology_procedure",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chronologyEvents[].eventType", "chronologyEvents[].timestamp"],
    applicabilityRule:
      "Applicable when ≥2 typed events have timestamps; compares typed stage relationships, not array order.",
    missingInputReason: "chronology_events adapter not eligible — structured events absent",
    findingOwnership: "Batch-9 owns impossible chronology via typed stage vs timestamp.",
    unavailableBehaviour: "not_exercised without typed chronology clocks.",
  }),
  spec({
    idSlug: "chr04",
    controlId: "MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING",
    adapterId: "chronology_events",
    engineId: "chronology_procedure",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chronologyEvents[eventType=custody|interview].timestamp"],
    applicabilityRule: "Applicable when custody/interview typed events exist on complete chronology.",
    missingInputReason: "chronology_events adapter not eligible — custody/interview clocks absent",
    findingOwnership: "Batch-9 owns custody/interview timing.",
    unavailableBehaviour: "not_exercised without custody/interview event types.",
  }),
  spec({
    idSlug: "chr05",
    controlId: "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE",
    adapterId: "chronology_events",
    engineId: "chronology_procedure",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_adapter",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["chronologyEvents[eventType=hearing|notice].timestamp"],
    applicabilityRule: "Applicable when hearing/notice typed events exist on complete chronology.",
    missingInputReason: "chronology_events adapter not eligible — hearing/notice lifecycle absent",
    findingOwnership: "Batch-9 owns hearing/notice lifecycle.",
    unavailableBehaviour: "not_exercised without hearing/notice event types.",
  }),

  spec({
    idSlug: "src10",
    controlId: "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
    adapterId: "provenance",
    engineId: "source_provenance",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "pageIdentityKnown=true",
      "sourceDocumentIdentity",
      "sourcePage",
      "compiledPage",
    ],
    applicabilityRule:
      "Applicable when genuine document/page identity exists (pageIdentityKnown + sourceDocumentIdentity + both pages).",
    missingInputReason:
      "provenance adapter not eligible — genuine sourceDocumentIdentity/page identity absent",
    findingOwnership: "Batch-9 owns source vs compiled page identity integrity.",
    unavailableBehaviour: "not_exercised without genuine document/page identity.",
  }),
  spec({
    idSlug: "atr09",
    controlId: "MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS",
    adapterId: "provenance",
    engineId: "source_provenance",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["sourceDocumentIdentity", "limitationReason|pageIdentityKnown"],
    applicabilityRule: "Applicable when complete provenance rows carry source identity.",
    missingInputReason: "provenance adapter not eligible — source-linked limitation fields incomplete",
    findingOwnership: "Batch-9 owns source-linked limitation binding.",
    unavailableBehaviour: "not_exercised without complete provenance identity.",
  }),
  spec({
    idSlug: "fid10",
    controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
    adapterId: "provenance",
    engineId: "source_provenance",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "pageIdentityKnown=true",
      "sourceDocumentIdentity",
      "quotationExactText|quotedSpan",
    ],
    applicabilityRule:
      "Applicable only when structured quotationExactText/quotedSpan binds to page-identity provenance.",
    missingInputReason:
      "unavailable_missing_structured_field — quotationExactText/quotedSpan structured fields absent (page identity alone insufficient)",
    findingOwnership: "Batch-9 owns FID-10 only with quotation binding fields.",
    unavailableBehaviour: "not_exercised until quotation binding fields exist.",
  }),
  spec({
    idSlug: "chr09",
    controlId: "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS",
    adapterId: "provenance",
    engineId: "chronology_procedure",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["pageDocEvidenceTotals|sourceDocumentIdentity+sourcePage+totalCount"],
    applicabilityRule:
      "Applicable only when structured page/doc/evidence totals ledger is present.",
    missingInputReason:
      "unavailable_missing_structured_field — pageDocEvidenceTotals ledger absent (identity rows alone insufficient)",
    findingOwnership: "Batch-9 owns CHR-09 only with totals ledger.",
    unavailableBehaviour: "not_exercised until totals ledger exists.",
  }),

  spec({
    idSlug: "chs02",
    controlId: "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
    adapterId: "chase_relationships",
    engineId: "chase_actionability",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["requestId", "linkMethod=explicit_id", "resolutionState"],
    applicabilityRule:
      "Applicable when every chase row has requestId + explicit evidenceUnitId + resolutionState.",
    missingInputReason:
      "chase_relationships adapter not eligible — requestId/explicit evidenceUnitId/resolutionState incomplete",
    findingOwnership: "Batch-9 owns specific-item chase completeness.",
    unavailableBehaviour: "not_exercised on partial ESA chase rows.",
  }),
  spec({
    idSlug: "chs06",
    controlId: "MAA2-CHS-06-NO-ALIAS-OR-SERVED-DUP",
    adapterId: "chase_relationships",
    engineId: "chase_actionability",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["requestId", "resolutionState", "linkAmbiguity"],
    applicabilityRule: "Applicable when complete chase relationships are present.",
    missingInputReason: "chase_relationships adapter not eligible — complete chase links absent",
    findingOwnership: "Batch-9 owns alias/served-dup ambiguity on complete chase.",
    unavailableBehaviour: "not_exercised without complete chase.",
  }),
  spec({
    idSlug: "bnd05",
    controlId: "MAA2-BND-05-MISSING-ATTACHMENTS",
    adapterId: "chase_relationships",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["requestId", "resolutionState", "linkedEvidenceOccurrenceRef"],
    applicabilityRule: "Applicable when complete chase relationships identify missing attachments.",
    missingInputReason: "chase_relationships adapter not eligible — complete chase attachment links absent",
    findingOwnership: "Batch-9 owns missing-attachment chase binding.",
    unavailableBehaviour: "not_exercised without complete chase.",
  }),
  spec({
    idSlug: "bnd12",
    controlId: "MAA2-BND-12-COMPLETE-VS-PARTIAL-DISCLOSURE",
    adapterId: "chase_relationships",
    engineId: "document_relationship",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: ["resolutionState"],
    applicabilityRule: "Applicable when complete chase relationships expose resolutionState.",
    missingInputReason: "chase_relationships adapter not eligible — complete vs partial disclosure graph absent",
    findingOwnership: "Batch-9 owns complete≠partial disclosure via resolutionState.",
    unavailableBehaviour: "not_exercised without complete chase.",
  }),

  spec({
    idSlug: "xex01",
    controlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
    adapterId: "exit_snapshots",
    engineId: "cross_output_completeness",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "exitPayloadReceipts.*.payloadIdentity",
      "exitPayloadReceipts.*.chargeWarningAttached",
      "chargeInstruments[]",
    ],
    applicabilityRule:
      "Applicable when genuine exits carry chargeWarningAttached coupled to structured instruments.",
    missingInputReason:
      "unavailable_missing_structured_field — chargeWarningAttached on genuine exits + instruments required (generic sendability insufficient)",
    findingOwnership: "Batch-9 owns XEX-01 only with coupled charge-warning fields.",
    unavailableBehaviour: "not_exercised; does not imply real exit testing via sendability alone.",
  }),
  spec({
    idSlug: "xex07",
    controlId: "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
    adapterId: "exit_snapshots",
    engineId: "cross_output_completeness",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_real_exit",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "exitPayloadReceipts.view.payloadIdentity",
      "exitPayloadReceipts.copy.payloadIdentity",
      "exitPayloadReceipts.view.sendability",
      "exitPayloadReceipts.copy.sendability",
    ],
    applicabilityRule: "Applicable when view+copy genuine payloads include sendability.",
    missingInputReason: "exit_snapshots adapter not eligible — genuine view/copy payloads absent",
    findingOwnership: "Batch-9 owns inverted view/copy safety on real exit payloads.",
    unavailableBehaviour: "not_exercised without genuine view+copy payloads.",
  }),
  spec({
    idSlug: "xex08",
    controlId: "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
    adapterId: "exit_snapshots",
    engineId: "cross_output_completeness",
    evaluatorImplementationClass: "adapter_integrity_evaluator",
    executionAvailability: "runnable_on_ESA",
    minAdapterCapability: "partial",
    requireCompleteRecords: false,
    exactPrerequisites: ["exit_snapshots records materialised"],
    applicabilityRule:
      "Applicable when exit snapshot records exist; proves unavailable/metadata exits were not falsely marked eligible.",
    missingInputReason: "exit_snapshots adapter produced zero exit records",
    findingOwnership:
      "Batch-9 adapter-integrity only — must not imply real exit testing occurred.",
    unavailableBehaviour:
      "Evaluates adapter honesty; emptyHits≠PASS; does not claim view/copy/export/api/pdf/composed/browser exercise.",
  }),
  spec({
    idSlug: "xex02",
    controlId: "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
    adapterId: "exit_snapshots",
    engineId: "cross_output_completeness",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "exitPayloadReceipts.*.payloadIdentity",
      "exitPayloadReceipts.*.evidencePartialWarning",
      "evidence_units complete|partial rows",
    ],
    applicabilityRule:
      "Applicable when genuine exits expose evidencePartialWarning coupled to evidence units.",
    missingInputReason:
      "unavailable_missing_structured_field — evidencePartialWarning on genuine exits required (generic sendability insufficient)",
    findingOwnership: "Batch-9 owns XEX-02 only with coupled evidence-partial warning fields.",
    unavailableBehaviour: "not_exercised without coupled warning fields.",
  }),
  spec({
    idSlug: "xex06",
    controlId: "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL",
    adapterId: "exit_snapshots",
    engineId: "cross_output_completeness",
    evaluatorImplementationClass: "substantive_control_evaluator",
    executionAvailability: "unavailable_missing_structured_field",
    minAdapterCapability: "eligible",
    requireCompleteRecords: true,
    exactPrerequisites: [
      "exitPayloadReceipts.*.payloadIdentity",
      "exitPayloadReceipts.*.quarantineScope",
    ],
    applicabilityRule:
      "Applicable when genuine exits expose quarantineScope (partial|total) distinctly.",
    missingInputReason:
      "unavailable_missing_structured_field — quarantineScope on genuine exits required (generic sendability insufficient)",
    findingOwnership: "Batch-9 owns XEX-06 only with quarantineScope fields.",
    unavailableBehaviour: "not_exercised without quarantineScope.",
  }),
];

export const BATCH9_CONTROL_IDS: readonly string[] = BATCH9_CONTROL_SPECS.map((s) => s.controlId);
export const BATCH9_CONTROL_ID_SET: ReadonlySet<string> = new Set(BATCH9_CONTROL_IDS);
export const BATCH9_SPEC_BY_ID: ReadonlyMap<string, Batch9ControlSpec> = new Map(
  BATCH9_CONTROL_SPECS.map((s) => [s.controlId, s]),
);

export function assertBatch9UnlockCoverage(): void {
  const unlock = new Set(BATCH8_UNLOCK_MAP.flatMap((r) => r.couldLaterUnlockControlIds));
  if (unlock.size !== 37) throw new Error(`unlock-map size ${unlock.size} ≠ 37`);
  if (BATCH9_CONTROL_IDS.length !== 37) throw new Error(`batch9 specs ${BATCH9_CONTROL_IDS.length} ≠ 37`);
  for (const id of unlock) {
    if (!BATCH9_CONTROL_ID_SET.has(id)) throw new Error(`missing Batch-9 spec for ${id}`);
  }
  for (const id of BATCH9_CONTROL_IDS) {
    if (!unlock.has(id)) throw new Error(`Batch-9 spec not in unlock-map: ${id}`);
  }
}

export function summarizeImplementationClasses(): Record<Batch9EvaluatorImplementationClass, number> {
  const out: Record<Batch9EvaluatorImplementationClass, number> = {
    substantive_control_evaluator: 0,
    adapter_integrity_evaluator: 0,
    family_proxy_only: 0,
    foundation_stub: 0,
  };
  for (const s of BATCH9_CONTROL_SPECS) out[s.evaluatorImplementationClass] += 1;
  return out;
}

export function summarizeExecutionAvailability(): Record<Batch9ExecutionAvailability, number> {
  const out: Record<Batch9ExecutionAvailability, number> = {
    runnable_on_ESA: 0,
    unavailable_missing_adapter: 0,
    unavailable_missing_structured_field: 0,
    unavailable_missing_real_exit: 0,
    not_applicable: 0,
  };
  for (const s of BATCH9_CONTROL_SPECS) out[s.executionAvailability] += 1;
  return out;
}

/** @deprecated Prefer summarizeImplementationClasses. */
export function summarizeEvaluatorClasses(): Record<string, number> {
  return {
    ...summarizeImplementationClasses(),
    unavailable_missing_adapter: 0,
  };
}

export function namedEvaluatorCount(): number {
  return BATCH9_CONTROL_SPECS.filter((s) =>
    countsAsNamedEvaluator(s.evaluatorImplementationClass),
  ).length;
}
