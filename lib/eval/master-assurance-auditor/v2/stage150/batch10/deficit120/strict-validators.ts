/**
 * Strict packet validators for deficit-120 cohort B — reject incomplete / duplicate / invented packets.
 */

import crypto from "node:crypto";
import type { Batch10StructuredCasePacket } from "../schemas";
import { BATCH10_EXIT_IDS } from "../schemas";
import { validateStructuredPacket } from "../validators";
import { adaptAllBatch8 } from "../../batch8/adapters";
import { structuredPacketToEvalOutput } from "../batch9-bridge";

export type StrictReject = { caseId: string; reasons: string[] };

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const DEV_LEAK =
  /\b(synthetic|simulator|test bundle|fake bundle|ai generated|ai-generated|training data|fixtureId|builderName|TODO|FIXME)\b/i;

export function strictValidateDeficitPacket(packet: Batch10StructuredCasePacket): string[] {
  const reasons: string[] = [];
  for (const issue of validateStructuredPacket(packet)) {
    reasons.push(`${issue.code}:${issue.detail}`);
  }
  if (packet.truthKeyContentsOpened !== false) reasons.push("truth_opened");
  if (packet.invented !== false) reasons.push("invented_flag");

  // Charge completeness (Batch-8 aligned)
  if (!packet.chargeInstruments.length) reasons.push("missing_charge_instruments");
  for (const c of packet.chargeInstruments) {
    if (!c.instrumentId || !c.exactWording || c.count == null || !c.defendantAllocation) {
      reasons.push("incomplete_charge_core");
    }
    if (!c.status || !c.version || !c.sourceDocumentId || !c.pageIdentityKnown) {
      reasons.push("incomplete_charge_status_version_page");
    }
    if (/page\s*1/i.test(c.sourcePage ?? "") && c.sourcePage === "1" && !c.pageIdentityKnown) {
      reasons.push("default_page_one");
    }
  }

  // Evidence
  if (!packet.evidenceUnits.length) reasons.push("missing_evidence_units");
  for (const e of packet.evidenceUnits) {
    if (!e.evidenceUnitId || !(e.subjectDefendantId || e.personId) || !e.existence) {
      reasons.push(`incomplete_evidence:${e.label ?? e.evidenceUnitId}`);
    }
    if (!e.pageIdentityKnown || !e.sourcePage) {
      reasons.push(`evidence_page_unknown:${e.label ?? e.evidenceUnitId}`);
    }
  }

  // Chronology with timezone
  if (!packet.chronologyEvents.some((e) => e.timestamp && e.timezone && e.eventType)) {
    reasons.push("missing_chronology_timezone");
  }
  for (const ev of packet.chronologyEvents) {
    if (
      ev.timestamp &&
      (/\b(tbd|asap|unknown|n\/a|todo|tomorrow|yesterday|next week)\b/i.test(ev.timestamp) ||
        /^\d+$/.test(ev.timestamp.trim()))
    ) {
      reasons.push("unsupported_timestamp");
    }
    if (ev.timestamp && !ev.timezone) reasons.push("invalid_chronology_missing_timezone");
  }
  // Ambiguous evidence-unit matches must not claim resolved explicit linkage
  for (const ch of packet.chaseRelationships) {
    if (ch.ambiguity === "ambiguous_multiple_matches" && ch.linkMethod === "explicit_id" && ch.evidenceUnitId) {
      reasons.push("ambiguous_evidence_unit_match_claimed_resolved");
    }
  }

  // Provenance with compiled+source when known
  if (
    !packet.provenance.some(
      (p) => p.pageIdentityKnown && p.sourcePage && p.compiledPage && p.sourceDocumentId,
    )
  ) {
    reasons.push("missing_complete_provenance");
  }
  for (const p of packet.provenance) {
    if (!p.pageIdentityKnown && p.sourcePage === "1") reasons.push("unknown_page_defaulted_to_1");
  }

  // Chase: at least one explicit linked outstanding request
  const linkedChase = packet.chaseRelationships.filter(
    (c) => c.linkMethod === "explicit_id" && c.evidenceUnitId && c.resolutionState,
  );
  if (!linkedChase.length) reasons.push("missing_explicit_chase_linkage");

  // Exits: six production exits required; browser may be unavailable
  for (const id of BATCH10_EXIT_IDS) {
    if (id === "authenticated_browser") continue;
    const r = packet.exitPayloadReceipts[id];
    if (!r?.realPayloadPresent || !r.payloadIdentity) {
      reasons.push(`missing_real_exit:${id}`);
    }
    if (r?.metadataOnly && r.realPayloadPresent) reasons.push(`exit_metadata_masquerade:${id}`);
  }
  const browser = packet.exitPayloadReceipts.authenticated_browser;
  if (browser?.realPayloadPresent && !browser.payloadIdentity) {
    reasons.push("browser_identity_without_bytes");
  }

  const blob = JSON.stringify(packet);
  if (DEV_LEAK.test(blob)) reasons.push("developer_fixture_language");
  if (/"mustNotSay"|"truthKeyComparison"|"expectedSendability"/.test(blob)) {
    reasons.push("truth_output_conflation");
  }
  if (!packet.preservedOriginalHashes.bundlePdfSha256) reasons.push("missing_pdf_hash");
  if (!packet.preservedOriginalHashes.canonicalBundleSha256) reasons.push("missing_canonical_hash");

  return [...new Set(reasons)];
}

export function adapterDryRun(packet: Batch10StructuredCasePacket) {
  const output = structuredPacketToEvalOutput(packet);
  const adapted = adaptAllBatch8(packet.caseId, output);
  return Object.fromEntries(
    Object.entries(adapted).map(([k, v]) => [
      k,
      {
        capabilityStatus: v.capabilityStatus,
        applicableRecordCount: v.applicableRecordCount,
        completeRecordCount: v.completeRecordCount,
        incompleteRecordCount: v.incompleteRecordCount,
      },
    ]),
  );
}

export function nearDuplicateFingerprint(packet: Batch10StructuredCasePacket): string {
  const wording = packet.chargeInstruments.map((c) => c.exactWording ?? "").join("|");
  const eu = packet.evidenceUnits.map((e) => e.label ?? "").sort().join("|");
  return sha256(`${wording}::${eu}`);
}

export function detectNearDuplicates(
  packets: Batch10StructuredCasePacket[],
): Array<{ fingerprint: string; caseIds: string[] }> {
  const map = new Map<string, string[]>();
  for (const p of packets) {
    const fp = nearDuplicateFingerprint(p);
    const list = map.get(fp) ?? [];
    list.push(p.caseId);
    map.set(fp, list);
  }
  return [...map.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([fingerprint, caseIds]) => ({ fingerprint, caseIds }));
}
