/**
 * Batch-8 validators — reject fabricated IDs/pages and metadata-as-exit lies.
 */

import type {
  Batch8FieldReceipt,
  ChargeInstrumentRecord,
  ChronologyEventRecord,
  EvidenceUnitRecord,
  ExitSnapshotRecord,
  ProvenanceRecord,
  ChaseRelationshipRecord,
} from "./schemas";
import { BATCH8_RECEIPT_SCHEMA } from "./schemas";

const FABRICATED_ID_RE = /^(auto-|gen-|default-|synthetic-|tmp-|uuid-)/i;
const PAGE_NUMBER_ONLY_RE = /^\d+$/;

export type ValidationIssue = { code: string; detail: string };

export function validateFieldReceipt(r: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (r == null || typeof r !== "object") return [{ code: "not_object", detail: "receipt" }];
  const o = r as Record<string, unknown>;
  if (o.schemaVersion !== BATCH8_RECEIPT_SCHEMA) {
    issues.push({ code: "bad_schema", detail: String(o.schemaVersion) });
  }
  if (o.invented !== false) issues.push({ code: "invented_flag", detail: "must be false" });
  if (typeof o.sourcePointer !== "string" || !o.sourcePointer.startsWith("/")) {
    issues.push({ code: "bad_pointer", detail: String(o.sourcePointer) });
  }
  if (typeof o.valueSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(o.valueSha256)) {
    issues.push({ code: "bad_hash", detail: "valueSha256" });
  }
  return issues;
}

export function validateNoFabricatedId(id: string | null, field: string): ValidationIssue[] {
  if (id == null) return [];
  if (!id.trim()) return [{ code: "empty_id", detail: field }];
  if (FABRICATED_ID_RE.test(id)) return [{ code: "fabricated_id", detail: `${field}=${id}` }];
  return [];
}

export function validateNoInventedPage(page: string | null, pageIdentityKnown: boolean): ValidationIssue[] {
  if (page == null) return [];
  if (pageIdentityKnown !== true) {
    return [{ code: "page_without_identity_known", detail: page }];
  }
  if (PAGE_NUMBER_ONLY_RE.test(page.trim()) && !pageIdentityKnown) {
    return [{ code: "defaulted_page_number", detail: page }];
  }
  return [];
}

export function validateEvidenceUnit(u: EvidenceUnitRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateNoFabricatedId(u.evidenceUnitId, "evidenceUnitId"));
  issues.push(...validateNoFabricatedId(u.subjectDefendantId, "subjectDefendantId"));
  issues.push(...validateNoFabricatedId(u.personId, "personId"));
  if (u.sourcePage != null) {
    issues.push(...validateNoInventedPage(u.sourcePage, u.pageIdentityKnown));
  }
  if (!u.occurrenceRef.startsWith("/")) {
    issues.push({ code: "bad_occurrence_ref", detail: u.occurrenceRef });
  }
  return issues;
}

export function validateChargeInstrument(c: ChargeInstrumentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateNoFabricatedId(c.instrumentId, "instrumentId"));
  issues.push(...validateNoFabricatedId(c.replacesInstrumentId, "replacesInstrumentId"));
  if (c.sourcePage != null) issues.push(...validateNoInventedPage(c.sourcePage, c.pageIdentityKnown));
  return issues;
}

export function validateChronologyEvent(e: ChronologyEventRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateNoFabricatedId(e.eventId, "eventId"));
  if (e.timestamp && !e.timezone) {
    // Allowed to record timestamp without TZ, but must not invent TZ.
  }
  return issues;
}

export function validateProvenance(p: ProvenanceRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (p.sourcePage != null || p.compiledPage != null) {
    if (p.pageIdentityKnown !== true) {
      issues.push({
        code: "page_fields_without_pageIdentityKnown",
        detail: `sourcePage=${p.sourcePage}; compiledPage=${p.compiledPage}`,
      });
    }
  }
  return issues;
}

export function validateChase(c: ChaseRelationshipRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateNoFabricatedId(c.requestId, "requestId"));
  if (c.linkMethod === "exact_label_match") {
    if (!c.linkedEvidenceOccurrenceRef) {
      issues.push({ code: "link_without_target", detail: c.occurrenceRef });
    }
    if (c.candidateEvidenceOccurrenceRefs.length !== 1) {
      issues.push({
        code: "exact_label_without_unique_candidate",
        detail: `candidates=${c.candidateEvidenceOccurrenceRefs.length}`,
      });
    }
    if (c.linkAmbiguity !== "none") {
      issues.push({ code: "exact_label_with_ambiguity_flag", detail: c.linkAmbiguity });
    }
  }
  if (c.linkMethod === "none" && c.linkedEvidenceOccurrenceRef) {
    issues.push({ code: "target_without_link_method", detail: c.occurrenceRef });
  }
  if (c.linkAmbiguity === "ambiguous_multiple_matches" && c.linkedEvidenceOccurrenceRef) {
    issues.push({ code: "ambiguous_link_selected_target", detail: c.occurrenceRef });
  }
  if (
    c.linkAmbiguity === "ambiguous_multiple_matches" &&
    c.candidateEvidenceOccurrenceRefs.length < 2
  ) {
    issues.push({ code: "ambiguous_without_multiple_candidates", detail: c.occurrenceRef });
  }
  return issues;
}

export function validateExitSnapshot(e: ExitSnapshotRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (e.realExitPayloadPresent && e.metadataOnly) {
    issues.push({ code: "metadata_claimed_as_real_payload", detail: e.exitId });
  }
  if (e.capabilityStatus === "eligible" && !e.realExitPayloadPresent) {
    issues.push({ code: "eligible_without_real_payload", detail: e.exitId });
  }
  if (e.metadataOnly && e.capabilityStatus === "eligible") {
    issues.push({ code: "metadata_marked_eligible", detail: e.exitId });
  }
  return issues;
}

export function assertReceiptsHonest(receipts: Batch8FieldReceipt[]): ValidationIssue[] {
  return receipts.flatMap(validateFieldReceipt);
}
