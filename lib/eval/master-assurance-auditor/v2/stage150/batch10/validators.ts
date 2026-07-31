/**
 * Batch-10 validators — no-invention and packet integrity.
 */

import type { Batch10StructuredCasePacket } from "./schemas";

export type Batch10ValidationIssue = {
  code: string;
  detail: string;
};

export function validateStructuredPacket(packet: Batch10StructuredCasePacket): Batch10ValidationIssue[] {
  const issues: Batch10ValidationIssue[] = [];
  if (packet.schemaVersion !== "stage150-structured-case-packet@1.0.0") {
    issues.push({ code: "schema", detail: `unexpected schema ${packet.schemaVersion}` });
  }
  if (packet.invented !== false) {
    issues.push({ code: "invention", detail: "invented must be false" });
  }
  if (packet.truthKeyContentsOpened !== false) {
    issues.push({ code: "truth_leak", detail: "truthKeyContentsOpened must remain false" });
  }
  for (const doc of packet.sourceManifest) {
    if (doc.pageIdentityKnown && (!doc.sourcePageStart || !doc.documentId)) {
      issues.push({
        code: "page_identity",
        detail: `pageIdentityKnown without source page/id for ${doc.title}`,
      });
    }
    if (!doc.pageIdentityKnown && doc.sourcePageStart && !doc.limitationReason) {
      issues.push({
        code: "unknown_page",
        detail: `source page present without pageIdentityKnown requires limitation for ${doc.title}`,
      });
    }
  }
  const ids = new Set<string>();
  for (const doc of packet.sourceManifest) {
    if (ids.has(doc.documentId)) {
      issues.push({ code: "duplicate_source_id", detail: doc.documentId });
    }
    ids.add(doc.documentId);
  }
  for (const c of packet.chargeInstruments) {
    if (c.statementClassification && !c.sourcePointer) {
      issues.push({ code: "legal_state", detail: "statementClassification without sourcePointer" });
    }
    if (c.status === "amended" && c.replacesInstrumentId === c.instrumentId) {
      issues.push({ code: "operative_amended", detail: "amended instrument replaces itself" });
    }
  }
  for (const e of packet.evidenceUnits) {
    if (
      e.extractFullRelationship === null &&
      /\bextract\b/i.test(e.label ?? "") &&
      /\bfull\b/i.test(e.label ?? "")
    ) {
      issues.push({ code: "extract_full", detail: `collapsed extract/full without relationship: ${e.label}` });
    }
    if (
      e.recordingTranscriptRelationship === null &&
      /\brecording\b/i.test(e.label ?? "") &&
      /\btranscript\b/i.test(e.label ?? "")
    ) {
      issues.push({
        code: "recording_transcript",
        detail: `collapsed recording/transcript without relationship: ${e.label}`,
      });
    }
    if (
      e.stillClipMasterRelationship === null &&
      ((/\bstill\b/i.test(e.label ?? "") && /\bclip\b/i.test(e.label ?? "")) ||
        (/\bclip\b/i.test(e.label ?? "") && /\bmaster\b/i.test(e.label ?? "")) ||
        (/\bstill\b/i.test(e.label ?? "") && /\bmaster\b/i.test(e.label ?? "")))
    ) {
      issues.push({
        code: "clip_master",
        detail: `collapsed still/clip/master without relationship: ${e.label}`,
      });
    }
    if (
      e.draftFinalRelationship === null &&
      /\bdraft\b/i.test(e.label ?? "") &&
      /\b(signed|final)\b/i.test(e.label ?? "")
    ) {
      issues.push({ code: "draft_signed", detail: `collapsed draft/signed without relationship: ${e.label}` });
    }
    if (e.ambiguity === "ambiguous_multiple_matches" && e.existence === "served" && !e.sourceDocumentId) {
      issues.push({ code: "ambiguous_evidence_unit", detail: e.label ?? "unknown" });
    }
    if (e.subjectDefendantId && /[,+/]| and /i.test(e.subjectDefendantId)) {
      issues.push({ code: "defendant_bleed", detail: e.subjectDefendantId });
    }
  }
  // Competing distinct timestamps for same eventType without group id
  const byType = new Map<string, typeof packet.chronologyEvents>();
  for (const ev of packet.chronologyEvents) {
    if (ev.timestamp) {
      const unsupported =
        /\b(tbd|asap|unknown|n\/a|todo|tomorrow|yesterday|next week)\b/i.test(ev.timestamp) ||
        /^\d+$/.test(ev.timestamp.trim());
      if (unsupported) {
        issues.push({ code: "unsupported_timestamp", detail: `${ev.eventId}:${ev.timestamp}` });
      }
      if (
        ev.timezone &&
        !/^(Europe\/London|UTC|Z)$/i.test(ev.timezone) &&
        !/^[A-Za-z]+\/[A-Za-z_]+$/.test(ev.timezone)
      ) {
        issues.push({ code: "invalid_chronology_timezone", detail: `${ev.eventId}:${ev.timezone}` });
      }
    }
    if (!ev.eventType) continue;
    const list = byType.get(ev.eventType) ?? [];
    list.push(ev);
    byType.set(ev.eventType, list);
  }
  for (const [, list] of byType) {
    const stamps = new Set(list.map((e) => `${e.timestamp}|${e.timezone ?? ""}`));
    if (stamps.size > 1 && list.some((e) => !e.competingEventGroupId)) {
      issues.push({
        code: "competing_timestamps",
        detail: `competing ${list[0]?.eventType} timestamps without competingEventGroupId`,
      });
    }
  }
  for (const ch of packet.chaseRelationships) {
    if (ch.linkMethod === "explicit_id" && !ch.evidenceUnitId) {
      issues.push({ code: "ambiguous_chase", detail: `explicit_id without evidenceUnitId: ${ch.requestId}` });
    }
    if (ch.ambiguity === "ambiguous_multiple_matches" && ch.linkMethod === "explicit_id" && !ch.evidenceUnitId) {
      issues.push({ code: "ambiguous_chase", detail: ch.requestId });
    }
  }
  for (const exit of Object.values(packet.exitPayloadReceipts)) {
    if (exit.metadataOnly && exit.realPayloadPresent) {
      issues.push({ code: "exit_metadata_masquerade", detail: exit.exitId });
    }
    if (exit.realPayloadPresent && !exit.payloadIdentity) {
      issues.push({ code: "missing_exit_payload_bytes", detail: exit.exitId });
    }
    if (!exit.realPayloadPresent && exit.payloadIdentity) {
      issues.push({ code: "exit_identity_without_bytes", detail: exit.exitId });
    }
  }
  return issues;
}

export function assertNoTruthKeyLeakage(packet: Batch10StructuredCasePacket): void {
  if (packet.truthKeyContentsOpened !== false) {
    throw new Error("truth-key leakage: truthKeyContentsOpened is not false");
  }
  const blob = JSON.stringify(packet);
  if (/"truthKeyComparison"|"expectedSendability"|"mustNotSay"/.test(blob)) {
    throw new Error("truth-key leakage: packet embeds truth-key semantic fields");
  }
}
