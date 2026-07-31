/**
 * Project Batch-10 structured-case-packet fields into Batch-8 adapter input bags.
 * Fail-closed: only copy explicit structured fields; never invent from court prose.
 */

import type { Batch10StructuredCasePacket } from "../../stage150/batch10/schemas";

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
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
    out.fiveAnswersEvidenceRows = units.map((raw, i) => {
      if (!isObj(raw)) return {};
      return {
        evidenceUnitId: raw.evidenceUnitId ?? null,
        label: raw.label ?? null,
        existence: raw.existence ?? null,
        reliability: raw.reliability ?? null,
        subjectDefendantId: raw.subjectDefendantId ?? null,
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
        note: raw.sourcePointer ?? null,
      };
    });
  }

  const prov = Array.isArray(p.provenance) ? p.provenance : [];
  if (prov.length && !units.length) {
    // Provenance-only projection into evidenceStates anchors when units absent.
    out.evidenceStates = prov.map((raw, i) => {
      if (!isObj(raw)) return {};
      return {
        label: raw.label ?? raw.sourceDocumentId ?? null,
        inferredSourceState: null,
        existenceLabel: null,
        evidenceAnchor: raw.sourcePointer ?? null,
        source: raw.sourceDocumentId ?? null,
        sourcePage: raw.sourcePage ?? null,
        compiledPage: raw.compiledPage ?? null,
        pageIdentityKnown: raw.pageIdentityKnown === true,
      };
    });
  } else if (prov.length) {
    // Attach provenance rows as evidenceStates companions for page binding scan.
    out.evidenceStates = prov.map((raw, i) => {
      if (!isObj(raw)) return {};
      return {
        label: raw.label ?? `provenance-${i}`,
        evidenceAnchor: raw.sourcePointer ?? null,
        source: raw.sourceDocumentId ?? null,
        sourcePage: raw.sourcePage ?? null,
        compiledPage: raw.compiledPage ?? null,
        pageIdentityKnown: raw.pageIdentityKnown === true,
        evidenceUnitId: raw.evidenceUnitId ?? null,
      };
    });
  }

  const chase = Array.isArray(p.chaseRelationships) ? p.chaseRelationships : [];
  if (chase.length) {
    out.warningsAndGaps = {
      chaseItems: chase.map((raw, i) => {
        if (!isObj(raw)) return {};
        return {
          requestId: raw.requestId ?? null,
          label: raw.label ?? raw.chaseLabel ?? null,
          evidenceUnitId: raw.evidenceUnitId ?? null,
          resolutionState: raw.resolutionState ?? null,
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
    for (const [exitId, raw] of Object.entries(exits)) {
      if (!isObj(raw)) continue;
      bag[exitId] = {
        payloadIdentity: raw.payloadIdentity ?? raw.payloadIdentitySha256 ?? null,
        sendability: raw.sendability ?? null,
        unavailableReason: raw.unavailableReason ?? null,
        realPayloadPresent: raw.realPayloadPresent === true,
        metadataOnly: raw.metadataOnly === true,
      };
    }
    out.exitPayloadReceipts = bag;
  }

  return out;
}
