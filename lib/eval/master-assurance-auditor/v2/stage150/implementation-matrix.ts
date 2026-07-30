/**
 * Per-control Stage-150 implementation + input-capability matrix.
 */

import { buildV2Controls } from "../assemble";
import { STAGE150_PACKET_LOCAL_HANDLERS, statusForStage150Control } from "./detector-registry";
import { STAGE150_INTELLIGENCE_FAMILIES } from "./ownership-map";
import { STAGE150_INPUT_ADAPTERS } from "./input-adapters";
import type { SharedEngineId } from "../every-word/types";

function mapEngine(familyCode: string): SharedEngineId {
  const m: Record<string, SharedEngineId> = {
    WRD: "professional_wording",
    CHS: "chase_actionability",
    EVS: "evidence_attribution",
    ATR: "evidence_attribution",
    BND: "document_relationship",
    SRC: "source_provenance",
    FID: "source_provenance",
    LSL: "charge_legal_state",
    CHG: "charge_legal_state",
    CHR: "chronology_procedure",
    PRC: "chronology_procedure",
    XEX: "cross_output_completeness",
    PRI: "cross_output_completeness",
    AUD: "audience_context",
    CTX: "contradiction_perspective",
    DEF: "contradiction_perspective",
    XPP: "contradiction_perspective",
    VDR: "version_reproducibility",
    ELD: "version_reproducibility",
    LEG: "charge_legal_state",
  };
  return m[familyCode] ?? "professional_wording";
}

export function buildStage150ImplementationCapabilityMatrix() {
  const controls = buildV2Controls().filter(
    (c) => c.activationStage === "150" || c.currentActivationStage === "150",
  );
  const handlerById = new Map(STAGE150_PACKET_LOCAL_HANDLERS.map((h) => [h.controlId, h]));

  const rows = controls.map((c) => {
    const engineId = mapEngine(c.familyCode);
    const classed = statusForStage150Control({
      controlId: c.controlId,
      familyCode: c.familyCode,
      activationStage: String(c.activationStage),
      preservedFromV1: Boolean(c.preservedFromV1),
      engineId,
    });
    const handler = handlerById.get(c.controlId) ?? null;
    const family =
      STAGE150_INTELLIGENCE_FAMILIES.find((f) => f.familyCodes.includes(c.familyCode)) ?? null;
    const adapters = STAGE150_INPUT_ADAPTERS.filter((a) =>
      handler
        ? handler.requiredInputs.some(
            (r) =>
              a.requiredFields.includes(r) ||
              a.optionalFields.some((o) => o.startsWith(r) || r.includes(o.split("/")[1] ?? "")),
          ) || a.adapterId === "solicitor_visible_wording"
        : classed.status === "specified_not_implemented",
    );

    return {
      controlId: c.controlId,
      familyCode: c.familyCode,
      intelligenceFamilyId: family?.familyId ?? null,
      engineId,
      implementationStatus: classed.status,
      statusReason: classed.reason,
      packetLocalHandler: handler
        ? {
            handlerId: handler.handlerId,
            findingCodes: handler.findingCodes,
            requiredInputs: handler.requiredInputs,
            unavailableVerdict: handler.unavailableVerdict,
            positiveContract: handler.positiveContract,
            negativeContract: handler.negativeContract,
            runtimePath: handler.runtimePath,
          }
        : null,
      adapterIds: handler
        ? adapters.map((a) => a.adapterId)
        : classed.status === "specified_not_implemented"
          ? STAGE150_INPUT_ADAPTERS.filter((a) => a.source === "absent").map((a) => a.adapterId)
          : [],
      currentlyRunnableOnStage150: false,
      countsAsFullyExercised: false,
      blockingIfPartial: classed.status === "partially_implemented",
    };
  });

  const totals = {
    stage150ControlCount: rows.length,
    partially_implemented: rows.filter((r) => r.implementationStatus === "partially_implemented")
      .length,
    specified_not_implemented: rows.filter(
      (r) => r.implementationStatus === "specified_not_implemented",
    ).length,
    implemented: rows.filter((r) => r.implementationStatus === "implemented").length,
    other: rows.filter(
      (r) =>
        !["partially_implemented", "specified_not_implemented", "implemented"].includes(
          r.implementationStatus,
        ),
    ).length,
  };

  return {
    schemaVersion: "stage150-implementation-capability-matrix@1.0.0",
    note:
      "partially_implemented is blocking and never counts as fully exercised or Stage-150 executable.",
    totals,
    rows,
  };
}
