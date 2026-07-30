/**
 * Honest control→handler registry for V2.2 foundation remediation.
 * partially_implemented only when a real control-specific rule + probes exist.
 */

import type { ImplementationStatusV22, SharedEngineId } from "./types";

export type ControlHandlerDef = {
  controlId: string;
  engineId: SharedEngineId;
  handlerId: string;
  findingCodes: string[];
  receiptValidator: string;
  positiveContract: string;
  negativeContract: string;
  /** Non-empty runtime path description. */
  runtimePath: string;
  inputEligibility: string;
};

/** Only these V2 additive controls qualify as partially_implemented. */
export const PARTIAL_CONTROL_HANDLERS: ControlHandlerDef[] = [
  {
    controlId: "MAA2-BND-09-STILL-CLIP-VS-MASTER",
    engineId: "document_relationship",
    handlerId: "still_as_master_collapse",
    findingCodes: ["BND_STILL_MASTER_COLLAPSE"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract:
      "scripts/maa-v2-every-word-foundation-contracts.test.ts#still_master_collapse_positive",
    negativeContract:
      "scripts/maa-v2-every-word-foundation-contracts.test.ts#still_master_collapse_negative",
    runtimePath: "runDocumentRelationshipEngine→detectsStillMasterCollapse",
    inputEligibility: "solicitor-visible string occurrences from packet-local inventory",
  },
  {
    controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
    engineId: "professional_wording",
    handlerId: "absolute_proof_ban",
    findingCodes: ["WRD_ABSOLUTE_PROOF"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract:
      "scripts/maa-v2-every-word-foundation-contracts.test.ts#wrd_absolute_proof_positive",
    negativeContract:
      "scripts/maa-v2-every-word-foundation-contracts.test.ts#wrd_absolute_proof_negative",
    runtimePath: "runProfessionalWordingEngine#WRD_ABSOLUTE_PROOF",
    inputEligibility: "included solicitor-visible wording occurrences",
  },
  {
    controlId: "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
    engineId: "chase_actionability",
    handlerId: "empty_chase_draft",
    findingCodes: ["CHS_EMPTY_DRAFT"],
    receiptValidator: "maa-v2-candidate-finding@1.0.0",
    positiveContract:
      "scripts/maa-v2-every-word-foundation-contracts.test.ts#chs_empty_draft_positive",
    negativeContract:
      "scripts/maa-v2-every-word-foundation-contracts.test.ts#chs_empty_draft_negative",
    runtimePath: "runChaseActionabilityEngine#CHS_EMPTY_DRAFT",
    inputEligibility: "/warningsAndGaps/chaseItems/*/copySuggestion",
  },
];

export const PARTIAL_CONTROL_IDS = new Set(PARTIAL_CONTROL_HANDLERS.map((h) => h.controlId));

/** Engines that currently fall through to [] — must not be partially_implemented. */
export const EMPTY_RUNTIME_ENGINES: SharedEngineId[] = [
  "audience_context",
  "contradiction_perspective",
  "version_reproducibility",
];

export function lookupPartialHandler(controlId: string): ControlHandlerDef | null {
  return PARTIAL_CONTROL_HANDLERS.find((h) => h.controlId === controlId) ?? null;
}

export function statusForV2Control(args: {
  controlId: string;
  familyCode: string;
  activationStage: string;
  preservedFromV1: boolean;
  engineId: SharedEngineId;
}): { status: ImplementationStatusV22; reason: string } {
  if (args.preservedFromV1) {
    return {
      status: "implemented",
      reason: "V1 preserved — historically exercised.",
    };
  }
  if (args.familyCode === "ELD") {
    return {
      status: "specified_not_implemented",
      reason:
        "Evidence-locked drafting requires version pairs / source-to-sentence graphs / approval receipts / full exits — absent on ESA packets (requires_different_adapter).",
    };
  }
  if (EMPTY_RUNTIME_ENGINES.includes(args.engineId)) {
    return {
      status: "specified_not_implemented",
      reason: `Engine ${args.engineId} has empty runtime path (default []); not partially_implemented.`,
    };
  }
  if (PARTIAL_CONTROL_IDS.has(args.controlId)) {
    return {
      status: "partially_implemented",
      reason:
        "Control-specific handler + probes + receipt validator + non-empty runtime path; not Stage-150 executable.",
    };
  }
  // Family-level defaults — never partially_implemented without control-specific handler
  if (args.familyCode === "EXT") {
    return { status: "external_assurance_required", reason: "External assurance roadmap." };
  }
  if (args.familyCode === "IAM") {
    return { status: "engineering_required", reason: "SSO/IAM engineering." };
  }
  if (args.familyCode === "RES" || args.familyCode === "OPS") {
    return { status: "operational_evidence_required", reason: "Operational evidence required." };
  }
  if (
    args.activationStage === "browser" ||
    args.familyCode === "BRW" ||
    args.familyCode === "DSN" ||
    args.familyCode === "A11Y"
  ) {
    return { status: "browser_required", reason: "Authenticated browser receipts required." };
  }
  if (args.activationStage === "human" || args.familyCode === "HUM") {
    return { status: "human_required", reason: "Human gold required." };
  }
  return {
    status: "specified_not_implemented",
    reason: "No control-specific executable handler/probes for this control.",
  };
}
