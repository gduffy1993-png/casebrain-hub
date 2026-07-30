/**
 * Honest control→handler registry for V2.2 foundation remediation.
 * partially_implemented only when a real control-specific rule + probes exist.
 */

import type { ControlHandlerDef, ImplementationStatusV22, SharedEngineId } from "./types";
import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  statusForStage150Control,
} from "../stage150/detector-registry";

export type { ControlHandlerDef };

/**
 * Foundation-era partials (subset). Stage-150 packet-local handlers are merged via
 * lookupPartialHandler / statusForV2Control.
 */
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

/** All control IDs with a real packet-local handler (foundation + Stage-150). */
export const ALL_PARTIAL_CONTROL_IDS = new Set(
  [...PARTIAL_CONTROL_HANDLERS, ...STAGE150_PACKET_LOCAL_HANDLERS].map((h) => h.controlId),
);

/** Engines that currently fall through to [] for unhandled controls. */
export const EMPTY_RUNTIME_ENGINES: SharedEngineId[] = [
  "audience_context",
  "version_reproducibility",
];

export function lookupPartialHandler(controlId: string): ControlHandlerDef | null {
  return (
    STAGE150_PACKET_LOCAL_HANDLERS.find((h) => h.controlId === controlId) ??
    PARTIAL_CONTROL_HANDLERS.find((h) => h.controlId === controlId) ??
    null
  );
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
  // Stage-150 / ELD / LEG / VDR ownership via Stage-150 status helper
  if (
    args.activationStage === "150" ||
    args.familyCode === "ELD" ||
    args.familyCode === "LEG" ||
    args.familyCode === "VDR" ||
    ALL_PARTIAL_CONTROL_IDS.has(args.controlId)
  ) {
    const s150 = statusForStage150Control(args);
    if (s150.status === "partially_implemented" || s150.status === "specified_not_implemented") {
      // Foundation-only partials not in Stage-150 list still count as partial
      if (
        PARTIAL_CONTROL_IDS.has(args.controlId) &&
        s150.status === "specified_not_implemented" &&
        args.activationStage !== "150"
      ) {
        return {
          status: "partially_implemented",
          reason:
            "Control-specific handler + probes + receipt validator + non-empty runtime path; not Stage-150 executable.",
        };
      }
      return s150;
    }
  }
  if (EMPTY_RUNTIME_ENGINES.includes(args.engineId) && !ALL_PARTIAL_CONTROL_IDS.has(args.controlId)) {
    return {
      status: "specified_not_implemented",
      reason: `Engine ${args.engineId} has empty runtime path (default []); not partially_implemented.`,
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

/** Merge foundation partials with Stage-150 packet-local handlers (dedupe by controlId). */
export function allPartialHandlers(): ControlHandlerDef[] {
  const map = new Map<string, ControlHandlerDef>();
  for (const h of [...PARTIAL_CONTROL_HANDLERS, ...STAGE150_PACKET_LOCAL_HANDLERS]) {
    map.set(h.controlId, h);
  }
  return [...map.values()];
}
