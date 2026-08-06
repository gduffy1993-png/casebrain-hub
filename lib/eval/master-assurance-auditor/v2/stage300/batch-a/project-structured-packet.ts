/**
 * Project Batch-10 structured-case-packet fields into Batch-8 adapter input bags.
 * Fail-closed: only copy explicit structured fields; never invent from court prose.
 *
 * Batch-B hardening:
 * - evidence units stay on fiveAnswersEvidenceRows (identity);
 * - provenance-only page rows stay on evidenceStates (page binding);
 * - provenance/page rows must not poison evidence-unit eligibility;
 * - chase carries requestType/sourceBasis when recoverable from packet fields;
 * - exit receipts preserve genuine payload identity + optional metadata.
 */

import type { Batch10StructuredCasePacket } from "../../stage150/batch10/schemas";

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function sourceRequestIdFromDerivation(raw: Record<string, unknown>): string | null {
  const der = isObj(raw.requestIdDerivation) ? raw.requestIdDerivation : null;
  const note = der && typeof der.note === "string" ? der.note : "";
  const m = note.match(/sourceRequestId=([A-Za-z0-9/_-]+)/);
  return m?.[1] ?? null;
}

/**
 * Build a casebrain-output-shaped bag from an explicit structured packet only.
 * Missing structured arrays stay absent — adapters then report unavailable.
 */
export function projectStructuredPacketToAdapterBag(
  packet: Batch10StructuredCasePacket | Record<string, unknown>,
): Record<string, unknown> {
  const p = packet as Record<string, unknown>;
  const out: Record<string, unknown> = {
    caseId: typeof p.caseId === "string" ? p.caseId : null,
    projectedFrom: "structured-case-packet",
    invented: false,
  };

  const charges = Array.isArray(p.chargeInstruments) ? p.chargeInstruments : [];
  if (charges.length) {
    out.chargeInstruments = charges.map((raw, i) => {
      if (!isObj(raw)) return {};
      return {
        instrumentId: raw.instrumentId ?? null,
        instrumentType: raw.instrumentType ?? null,
        exactWording: raw.exactWording ?? null,
        count: raw.count ?? null,
        defendantAllocation: raw.defendantAllocation ?? null,
        sourceDocument: raw.sourceDocumentId ?? raw.sourceDocument ?? null,
        sourcePage: raw.sourcePage ?? null,
        pageIdentityKnown: raw.pageIdentityKnown === true,
        status: raw.status ?? null,
        version: raw.version ?? null,
        replacesInstrumentId: raw.replacesInstrumentId ?? null,
        supersededByInstrumentId: raw.supersededByInstrumentId ?? null,
        occurrenceRef: `/chargeInstruments/${i}`,
      };
    });
  }

  const chron = Array.isArray(p.chronologyEvents) ? p.chronologyEvents : [];
  if (chron.length) {
    out.chronologyEvents = chron.map((raw, i) => {
      if (!isObj(raw)) return {};
      return {
        eventId: raw.eventId ?? null,
        eventType: raw.eventType ?? null,
        timestamp: raw.timestamp ?? null,
        timezone: raw.timezone ?? null,
        source: raw.source ?? null,
        confidence: raw.confidence ?? null,
        competingEventGroupId: raw.competingEventGroupId ?? null,
        occurrenceRef: `/chronologyEvents/${i}`,
      };
    });
  }

  const units = Array.isArray(p.evidenceUnits) ? p.evidenceUnits : [];
  if (units.length) {
    // Identity surface only — never dump provenance into fiveAnswers.
    out.fiveAnswersEvidenceRows = units.map((raw) => {
      if (!isObj(raw)) return {};
      return {
        evidenceUnitId: raw.evidenceUnitId ?? null,
        label: raw.label ?? null,
        existence: raw.existence ?? null,
        reliability: raw.reliability ?? null,
        subjectDefendantId: raw.subjectDefendantId ?? (raw.subjectUnknown === true ? "unknown" : null),
        personId: raw.personId ?? null,
        aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
        extractFullRelationship: raw.extractFullRelationship ?? null,
        draftFinalRelationship: raw.draftFinalRelationship ?? null,
        stillClipMasterRelationship: raw.stillClipMasterRelationship ?? null,
        recordingTranscriptRelationship: raw.recordingTranscriptRelationship ?? null,
        sourceDocument: raw.sourceDocumentId ?? raw.sourceDocument ?? null,
        sourcePage: raw.sourcePage ?? null,
        pageIdentityKnown: raw.pageIdentityKnown === true,
        modality: raw.modality ?? null,
        // sourcePointer is not a provenance limitation — leave note unset.
        limitationReason: raw.limitationReason ?? raw.provenanceLimitation ?? null,
      };
    });
  }

  const prov = Array.isArray(p.provenance) ? p.provenance : [];
  if (prov.length) {
    // Page-binding surface only — complete provenance rows (never invent compiled pages).
    out.evidenceStates = prov
      .filter((raw) => {
        if (!isObj(raw)) return false;
        return (
          raw.pageIdentityKnown === true &&
          typeof raw.sourcePage === "string" &&
          typeof raw.compiledPage === "string" &&
          (typeof raw.sourceDocumentId === "string" || typeof raw.sourceDocument === "string")
        );
      })
      .map((raw, i) => {
        if (!isObj(raw)) return {};
        return {
          label: typeof raw.label === "string" ? raw.label : `provenance-${i}`,
          evidenceAnchor: raw.sourcePointer ?? (raw.sourcePage ? `p.${raw.sourcePage}` : null),
          source: raw.sourceDocumentId ?? raw.sourceDocument ?? null,
          sourcePage: raw.sourcePage ?? null,
          compiledPage: raw.compiledPage ?? null,
          pageIdentityKnown: true,
          limitationReason: raw.limitationReason ?? null,
          quotationExactText: raw.quotationExactText ?? null,
          quotedSpan: raw.quotedSpan ?? null,
          // Deliberately omit evidenceUnitId/existence — evidence adapter skips page-only rows.
        };
      });
  }

  const chase = Array.isArray(p.chaseRelationships) ? p.chaseRelationships : [];
  if (chase.length) {
    out.warningsAndGaps = {
      chaseItems: chase.map((raw) => {
        if (!isObj(raw)) return {};
        const sourceRequestId = sourceRequestIdFromDerivation(raw);
        const resolutionState = typeof raw.resolutionState === "string" ? raw.resolutionState : null;
        const requestType =
          typeof raw.requestType === "string"
            ? raw.requestType
            : sourceRequestId && /^MG6C\//i.test(sourceRequestId)
              ? "MG6C_unused_material_schedule"
              : null;
        const supportedReason =
          typeof raw.supportedReason === "string"
            ? raw.supportedReason
            : resolutionState
              ? `explicit_mg6c_resolution:${resolutionState}`
              : null;
        return {
          requestId: raw.requestId ?? null,
          label: raw.label ?? raw.chaseLabel ?? null,
          evidenceUnitId: raw.evidenceUnitId ?? null,
          resolutionState,
          requestType,
          supportedReason,
          sourceBasis: raw.sourcePointer ?? raw.sourceBasis ?? null,
          sourcePointer: raw.sourcePointer ?? null,
          outputSurfaces: Array.isArray(raw.outputSurfaces)
            ? raw.outputSurfaces
            : ["view", "copy", "export", "api", "pdf", "composed_prose"],
          sendabilityLabel: raw.sendabilityLabel ?? null,
          copySuggestion: raw.copySuggestion ?? null,
        };
      }),
      doNotOverstate: [],
    };
  }

  const exits = isObj(p.exitPayloadReceipts) ? p.exitPayloadReceipts : null;
  if (exits) {
    const bag: Record<string, unknown> = {};
    const captureRunId =
      typeof p.caseId === "string" ? `stage150-batch10-capture:${p.caseId}` : null;
    for (const [exitId, raw] of Object.entries(exits)) {
      if (!isObj(raw)) continue;
      bag[exitId] = {
        payloadIdentity: raw.payloadIdentity ?? raw.payloadIdentitySha256 ?? null,
        sendability: raw.sendability ?? null,
        unavailableReason: raw.unavailableReason ?? null,
        realPayloadPresent: raw.realPayloadPresent === true,
        metadataOnly: raw.metadataOnly === true,
        payloadSchemaVersion:
          raw.payloadSchemaVersion ?? raw.schemaVersion ?? "batch10-exit-payload@1.0.0",
        captureRunId: raw.captureRunId ?? raw.runId ?? captureRunId,
        surfaceList: Array.isArray(raw.surfaceList)
          ? raw.surfaceList
          : Array.isArray(raw.surfaces)
            ? raw.surfaces
            : [exitId],
        provenanceLimitationContent:
          raw.provenanceLimitationContent ??
          (raw.evidencePartialWarning === true
            ? "evidence_partial_warning_attached"
            : raw.unavailableReason ?? null),
        generatedAt: raw.generatedAt ?? null,
        chargeWarningAttached: raw.chargeWarningAttached ?? null,
        evidencePartialWarning: raw.evidencePartialWarning ?? null,
        quarantineScope: raw.quarantineScope ?? null,
      };
    }
    out.exitPayloadReceipts = bag;
  }

  return out;
}
