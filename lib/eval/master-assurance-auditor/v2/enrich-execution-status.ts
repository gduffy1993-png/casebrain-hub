/**
 * Honest execution-readiness enrichment for every V2 control.
 * Registry presence alone never yields implementationStatus=implemented.
 */

import type {
  MaaV2ActivationStage,
  MaaV2ControlDefinition,
  MaaV2ImplementationStatus,
} from "./schema";

const V1_DETECTOR =
  "lib/eval/master-assurance-auditor/controls/run-all-controls.ts";
const V1_VALIDATOR =
  "lib/eval/master-assurance-auditor/validators.ts + finding-builder.ts (MasterAuditorFinding schema 1.1.0)";
const V1_CONTRACT = "scripts/master-assurance-auditor-contracts.test.ts";
const V1_READY_EVIDENCE =
  "artifacts/casebrain-qa/assurance/master-auditor-v1/maa-20-*/findings.jsonl + maa-50-*/findings.jsonl; V1 run-all-controls detectors";

/** ESA H5 adapter evidenced exits only. */
export const ESA_AVAILABLE_EXITS = ["view", "copy"] as const;
export const ESA_AVAILABLE_INPUTS = [
  "bundle-text.md",
  "casebrain-output.json",
  "truth-key.json",
  "fiveAnswersEvidenceRows",
  "evidenceStates",
  "warningsAndGaps.chaseItems",
  "warningsAndGaps.doNotOverstate",
  "courtNote",
  "truth.evidenceItems",
] as const;

export const ESA_UNAVAILABLE_INPUTS = [
  "original_source_pdf_binary",
  "ocr_confidence_metadata",
  "browser_session_receipt",
  "human_judgment_disposition",
  "security_tool_scan_receipt",
  "export_exit_payload",
  "api_exit_payload",
  "pdf_exit_payload",
  "composed_prose_exit_payload",
  "authority_currency_registry_meta",
  "audience_client_summary",
  "logical_document_segmentation_receipt",
] as const;

function statusForAdditive(c: MaaV2ControlDefinition): MaaV2ImplementationStatus {
  if (c.familyCode === "EXT" || c.activationStage === "roadmap") {
    if (c.authority.includes("security_tool") && c.familyCode === "SEC") {
      return "external_assurance_required";
    }
    if (c.familyCode === "EXT" || c.familyCode === "RES" || c.familyCode === "IAM") {
      return "external_assurance_required";
    }
    return "external_assurance_required";
  }
  if (c.activationStage === "human" || (c.authority.length === 1 && c.authority[0] === "human_review")) {
    return "human_required";
  }
  if (
    c.activationStage === "browser" ||
    (c.authority.includes("browser") && !c.authority.includes("automated"))
  ) {
    return "browser_required";
  }
  if (c.authority.includes("browser") && c.activationStage !== "150" && c.activationStage !== "300") {
    // mixed automated+browser at browser stage already handled; heavy with browser stays specified
  }
  // Catalogue / schema contracts are not substantive detectors for MAA2-* IDs.
  return "specified_not_implemented";
}

function ensureIndependentRelationship(c: MaaV2ControlDefinition): MaaV2ControlDefinition {
  if (c.relationships.length > 0) return c;
  return {
    ...c,
    relationships: [
      {
        relatedControlId: null,
        relationship: "independent",
        note: "No declared overlap after execution-readiness relationship audit; occurrence owned by this controlId only.",
        occurrenceOwnerControlId: c.controlId,
      },
    ],
  };
}

export function enrichControlExecutionStatus(c: MaaV2ControlDefinition): MaaV2ControlDefinition {
  const withRel = ensureIndependentRelationship(c);

  if (withRel.preservedFromV1) {
    return {
      ...withRel,
      historicalActivationStages: ["20", "50"],
      currentActivationStage: "50",
      implementationStatus: "implemented",
      detectorEntrypoint: `${V1_DETECTOR}#${withRel.controlId}`,
      receiptValidator: V1_VALIDATOR,
      positiveNegativeContract: V1_CONTRACT,
      exercisePrerequisites: [
        "SavedCaseMaterialisation (gold-manual Stage 20 or ESA Stage 50 adapter)",
        "run-all-controls.ts lane exercised",
        "finding schema validators",
        ...ESA_AVAILABLE_EXITS.map((e) => `exit:${e}`),
      ],
      currentlyRunnable: true,
      unavailableReason: null,
      readinessEvidence: V1_READY_EVIDENCE,
      relationships:
        withRel.relationships.length === 0
          ? [
              {
                relatedControlId: null,
                relationship: "independent",
                note: "V1 lane preserved; additive V2 controls that refine this ID declare refines/extends toward it.",
                occurrenceOwnerControlId: withRel.controlId,
              },
            ]
          : withRel.relationships.map((r) => ({
              ...r,
              occurrenceOwnerControlId: r.occurrenceOwnerControlId ?? withRel.controlId,
            })),
    };
  }

  const implementationStatus = statusForAdditive(withRel);
  const currentlyRunnable = false;
  let unavailableReason: string;
  switch (implementationStatus) {
    case "browser_required":
      unavailableReason =
        "Requires authenticated browser session receipts; no substantive browser detector/runner for this controlId.";
      break;
    case "human_required":
      unavailableReason =
        "Requires blinded human review dispositions; human fields must stay blank until filled — not auto-runnable.";
      break;
    case "external_assurance_required":
      unavailableReason =
        "Requires external assurance / roadmap evidence (pen test, DPIA, SSO implementation, residency attestation, etc.).";
      break;
    case "specified_not_implemented":
      unavailableReason =
        "Specified in V2 registry only — no substantive detectorEntrypoint for this MAA2 controlId (registry/schema contracts are not detectors).";
      break;
    case "contract_only":
      unavailableReason = "Positive/negative contracts exist without a substantive detectorEntrypoint.";
      break;
    case "unavailable":
      unavailableReason = "Control unavailable in current environment.";
      break;
    default:
      unavailableReason = "Not currently runnable.";
  }

  const historicalActivationStages: MaaV2ActivationStage[] = [];
  const currentActivationStage = withRel.activationStage;

  return {
    ...withRel,
    historicalActivationStages,
    currentActivationStage,
    implementationStatus,
    detectorEntrypoint: null,
    receiptValidator: null,
    positiveNegativeContract: null,
    exercisePrerequisites: [
      ...withRel.requiredInputs,
      ...withRel.applicableExits.map((e) => `exit:${e}`),
      "substantive_detectorEntrypoint",
      "receiptValidator",
      "positiveNegativeContract",
    ],
    currentlyRunnable,
    unavailableReason,
    readinessEvidence:
      "lib/eval/master-assurance-auditor/v2/* registry specification; scripts/master-assurance-auditor-v2-registry-contracts.test.ts (schema only — not a substantive detector)",
    relationships: withRel.relationships.map((r) => ({
      ...r,
      occurrenceOwnerControlId:
        r.occurrenceOwnerControlId ??
        (r.relationship === "refines" || r.relationship === "extends"
          ? r.relatedControlId
          : withRel.controlId),
    })),
  };
}

export function enrichAllControls(controls: MaaV2ControlDefinition[]): MaaV2ControlDefinition[] {
  return controls.map(enrichControlExecutionStatus);
}
