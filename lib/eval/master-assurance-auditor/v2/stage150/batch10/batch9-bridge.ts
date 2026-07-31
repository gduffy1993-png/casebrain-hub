/**
 * Batch-10 → Batch-9 bridge — count which unavailable ESA controls become runnable
 * when a structured packet is present (fixture-style gate, not ESA enrichment).
 */

import { buildEvalContext } from "../detectors";
import { BATCH9_CONTROL_SPECS } from "../batch9/control-specs";
import { buildBatch9ExerciseReceipt } from "../batch9/receipts";
import type { Batch10StructuredCasePacket } from "./schemas";

/** Project structured packet into the CaseBrain-output shaped bag Batch-9 adapters read. */
export function structuredPacketToEvalOutput(
  packet: Batch10StructuredCasePacket,
): Record<string, unknown> {
  return {
    caseId: packet.caseId,
    chargeInstruments: packet.chargeInstruments.map((c) => ({
      instrumentId: c.instrumentId,
      instrumentType: c.instrumentType,
      exactWording: c.exactWording,
      count: c.count,
      defendantAllocation: c.defendantAllocation,
      sourceDocument: c.sourceDocumentId,
      sourcePage: c.sourcePage,
      pageIdentityKnown: c.pageIdentityKnown,
      status: c.status,
      version: c.version,
      replacesInstrumentId: c.replacesInstrumentId,
      supersededByInstrumentId: c.supersededByInstrumentId,
      statementClassification: c.statementClassification,
      legalStateRole: c.legalStateRole,
    })),
    // Evidence units only — do not dump incomplete provenance into evidenceStates
    // (Batch-8 evidence_units + provenance both read evidenceStates; incomplete rows poison eligibility).
    fiveAnswersEvidenceRows: packet.evidenceUnits.map((e) => ({
      label: e.label,
      existence: e.existence,
      reliability: e.reliability,
      evidenceUnitId: e.evidenceUnitId,
      subjectDefendantId: e.subjectDefendantId,
      personId: e.personId,
      sourcePage: e.sourcePage,
      pageIdentityKnown: e.pageIdentityKnown,
      sourceDocument: e.sourceDocumentId,
      aliases: e.aliases,
      extractFullRelationship: e.extractFullRelationship,
      draftFinalRelationship: e.draftFinalRelationship,
      modality: e.label,
    })),
    // Provenance surface for Batch-8: only rows with compiledPage (never invent compiled pages).
    evidenceStates: packet.provenance
      .filter((p) => p.pageIdentityKnown && p.sourcePage && p.compiledPage && p.sourceDocumentId)
      .map((p, i) => ({
        label: `prov-${i}`,
        source: p.sourceDocumentId,
        evidenceAnchor: p.sourcePage ? `p.${p.sourcePage}` : null,
        sourcePage: p.sourcePage,
        compiledPage: p.compiledPage,
        pageIdentityKnown: p.pageIdentityKnown,
        quotationExactText: p.quotationExactText,
        quotedSpan: p.quotedSpan,
        limitationReason: p.limitationReason,
      })),
    chronologyEvents: packet.chronologyEvents.map((e) => ({
      eventId: e.eventId,
      eventType: e.eventType,
      timestamp: e.timestamp,
      timezone: e.timezone,
      source: e.sourceDocumentId,
      confidence: e.confidence,
      competingEventGroupId: e.competingEventGroupId,
    })),
    warningsAndGaps: {
      chaseItems: packet.chaseRelationships.map((c) => ({
        label: c.chaseLabel ?? c.requestId,
        requestId: c.requestId,
        evidenceUnitId: c.evidenceUnitId,
        resolutionState: c.resolutionState,
      })),
      doNotOverstate: [],
    },
    exitPayloadReceipts: Object.fromEntries(
      Object.entries(packet.exitPayloadReceipts).map(([id, r]) => [
        id,
        {
          payloadIdentity: r.payloadIdentity,
          sendability: r.sendability,
          unavailableReason: r.unavailableReason,
          chargeWarningAttached: r.chargeWarningAttached,
          evidencePartialWarning: r.evidencePartialWarning,
          quarantineScope: r.quarantineScope,
        },
      ]),
    ),
  };
}

export function countBatch9RunnableOnPacket(packet: Batch10StructuredCasePacket): {
  runnableControlIds: string[];
  notExercisedControlIds: string[];
  byControl: Record<string, "evaluated" | "unresolved" | "not_exercised">;
} {
  const output = structuredPacketToEvalOutput(packet);
  const ctx = buildEvalContext(packet.caseId, output);
  const byControl: Record<string, "evaluated" | "unresolved" | "not_exercised"> = {};
  const runnableControlIds: string[] = [];
  const notExercisedControlIds: string[] = [];
  for (const spec of BATCH9_CONTROL_SPECS) {
    const receipt = buildBatch9ExerciseReceipt({ ctx, controlId: spec.controlId });
    byControl[spec.controlId] = receipt.namedControlExerciseStatus;
    if (receipt.namedControlExerciseStatus === "not_exercised") {
      notExercisedControlIds.push(spec.controlId);
    } else {
      runnableControlIds.push(spec.controlId);
    }
  }
  return { runnableControlIds, notExercisedControlIds, byControl };
}
