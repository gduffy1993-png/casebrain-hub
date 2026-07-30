/**
 * Exact per-control Stage-150 eligibility + receipts.
 * Empty hit arrays never silently imply a clean PASS.
 * No truth opening; no audit verdict programme PASS.
 *
 * Named-control exercise requires control-specific prerequisite tokens AND
 * validated exactPrerequisiteEvidenceRefs (not descriptive metadata only).
 */

import fs from "node:fs";
import path from "node:path";
import {
  inventoryOutputLeaves,
  type SourceLeaf,
} from "../every-word/independent-leaf-inventory";
import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  type Stage150HandlerDef,
} from "./detector-registry";
import {
  buildEvalContext,
  evaluateAllStage150Intelligence,
  includedWordingLeaves,
  reconcileInventory,
  type Stage150Hit,
} from "./detectors";

export type ReceiptStatus = "evaluated" | "unresolved" | "not_exercised";

export type NamedControlExerciseStatus =
  | "fully_exercised"
  | "partially_exercised"
  | "not_exercised";

export type PrerequisiteEvidenceHit = {
  ref: string;
  path: string;
  summary: string;
};

export type ControlReceipt = {
  caseId: string;
  controlId: string;
  /** @deprecated Prefer probeStatus — retained for Batch-1/2 compatibility. */
  status: ReceiptStatus;
  /** Narrow probe / detector-run status. */
  probeStatus: ReceiptStatus;
  /** Named assurance-control exercise — never conflated with probe evaluation. */
  namedControlExerciseStatus: NamedControlExerciseStatus;
  capabilityScope: string;
  exercisedInvariant: string;
  unexercisedInvariant: string;
  exactPrerequisiteEvidenceRefs: string[];
  /** Actual evidence paths resolved for partially_exercised receipts. */
  prerequisiteEvidenceFoundPaths: string[];
  /** Field/value summaries for resolved prerequisite evidence. */
  prerequisiteFieldValueSummary: PrerequisiteEvidenceHit[];
  prerequisiteEvidenceValidationOk: boolean;
  detectorClassification: string | null;
  missingInputReason: string | null;
  namedControlMissingInputReason: string | null;
  hitCount: number;
  findingCodes: string[];
  candidateClasses: string[];
  /** Hard rule: empty hits ≠ pass. */
  emptyHitsDoNotImplyPass: true;
  note: string;
  absenceIsFinding: boolean;
};

export type CaseEligibility = {
  caseId: string;
  packetPath: string;
  hasCasebrainOutput: boolean;
  truthKeyFilePresent: boolean;
  truthOpened: false;
  inventoryReconciliation: ReturnType<typeof reconcileInventory> | null;
  includedSolicitorVisibleWordingCount: number;
  receipts: ControlReceipt[];
  eligibleControlIds: string[];
  notExercisedControlIds: string[];
  unresolvedControlIds: string[];
  evaluatedControlIds: string[];
  namedFullyExercisedControlIds: string[];
  namedPartiallyExercisedControlIds: string[];
  namedNotExercisedControlIds: string[];
};

function nonemptyArray(output: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return Array.isArray(cur) && cur.length > 0;
}

function arrayPresent(output: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return Array.isArray(cur);
}

function fieldPresent(output: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur !== undefined && cur !== null;
}

function rows(output: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = output[key];
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function chaseItems(output: Record<string, unknown>): Record<string, unknown>[] {
  const gaps = (output.warningsAndGaps ?? {}) as Record<string, unknown>;
  return Array.isArray(gaps.chaseItems) ? (gaps.chaseItems as Record<string, unknown>[]) : [];
}

function strNonempty(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeExhibitLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function summarizeValue(v: unknown, max = 120): string {
  if (v == null) return "null";
  if (typeof v === "string") return v.length <= max ? v : `${v.slice(0, max)}…`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array(len=${v.length})`;
  if (typeof v === "object") return `object(keys=${Object.keys(v as object).slice(0, 8).join(",")})`;
  return String(v);
}

/** Walk JSON paths; `*` expands over array indices. */
export function walkJsonPath(
  output: Record<string, unknown>,
  ref: string,
): PrerequisiteEvidenceHit[] {
  const parts = ref.replace(/^\//, "").split("/").filter(Boolean);
  const out: PrerequisiteEvidenceHit[] = [];

  function walk(cur: unknown, idx: number, pathSoFar: string): void {
    if (idx >= parts.length) {
      if (cur !== undefined && cur !== null) {
        out.push({ ref, path: pathSoFar || "/", summary: summarizeValue(cur) });
      }
      return;
    }
    const part = parts[idx]!;
    if (part === "*") {
      if (!Array.isArray(cur)) return;
      cur.forEach((item, i) => walk(item, idx + 1, `${pathSoFar}/${i}`));
      return;
    }
    if (cur == null || typeof cur !== "object") return;
    const next = (cur as Record<string, unknown>)[part];
    walk(next, idx + 1, `${pathSoFar}/${part}`);
  }

  walk(output, 0, "");
  return out.filter((h) => {
    // Wildcard leaf fields: only count non-empty / meaningful values
    if (parts[parts.length - 1] === "*") return true;
    const leaf = parts[parts.length - 1];
    if (!leaf) return true;
    // Empty strings on leaf fields do not count as present evidence
    if (typeof h.summary === "string" && h.summary.trim() === "") return false;
    return h.summary !== '""';
  });
}

export function hasSameExhibitLabelAcrossTwoDocumentIds(
  output: Record<string, unknown>,
): boolean {
  const states = rows(output, "evidenceStates");
  const byLabel = new Map<string, Set<string>>();
  for (const s of states) {
    const label = normalizeExhibitLabel(String(s.exhibitLabel ?? s.label ?? ""));
    const id = String(s.sourceDocumentId ?? s.documentId ?? "").trim();
    if (!label || !id) continue;
    const set = byLabel.get(label) ?? new Set<string>();
    set.add(id);
    byLabel.set(label, set);
  }
  return [...byLabel.values()].some((ids) => ids.size >= 2);
}

/** Two different labels alone are NOT a collision prerequisite. */
export function hasTwoDifferentExhibitLabelsOnly(output: Record<string, unknown>): boolean {
  const states = rows(output, "evidenceStates");
  const labels = new Set<string>();
  const ids = new Set<string>();
  for (const s of states) {
    const label = normalizeExhibitLabel(String(s.exhibitLabel ?? s.label ?? ""));
    const id = String(s.sourceDocumentId ?? s.documentId ?? "").trim();
    if (label) labels.add(label);
    if (id) ids.add(id);
  }
  return labels.size >= 2 && !hasSameExhibitLabelAcrossTwoDocumentIds(output);
}

export function hasChaseFivePartSchema(output: Record<string, unknown>): boolean {
  return chaseItems(output).some(
    (c) =>
      strNonempty(c.what) &&
      strNonempty(c.why) &&
      strNonempty(c.fromWhom) &&
      strNonempty(c.byWhen) &&
      strNonempty(c.ifNot),
  );
}

export function hasChaseProvenanceLinks(output: Record<string, unknown>): boolean {
  return chaseItems(output).some(
    (c) =>
      strNonempty(c.evidenceRef) ||
      strNonempty(c.sourceEvidenceId) ||
      strNonempty(c.linkedEvidenceId) ||
      c.evidenceRelationship != null,
  );
}

export function hasChaseTypeFields(output: Record<string, unknown>): boolean {
  return chaseItems(output).some(
    (c) =>
      strNonempty(c.chaseType) &&
      /evidential|procedural/i.test(String(c.chaseType)),
  );
}

export function hasChaseServiceHistory(output: Record<string, unknown>): boolean {
  return chaseItems(output).some((c) => {
    const prior = c.priorServiceState != null && String(c.priorServiceState).trim() !== "";
    const current =
      c.currentServiceState != null && String(c.currentServiceState).trim() !== "";
    const hist = Array.isArray(c.updateHistory)
      ? c.updateHistory.length > 0
      : c.updateHistory != null;
    return prior && current && hist;
  });
}

export function hasExcludedQuarantinedAndDisclosed(
  output: Record<string, unknown>,
): boolean {
  const excl = rows(output, "excludedRequests");
  const quar = rows(output, "quarantinedRequests");
  const counts = output.disclosedCounts;
  const hasRows = excl.length > 0 || quar.length > 0;
  const hasCounts = counts != null && typeof counts === "object";
  return hasRows && hasCounts;
}

export function hasContradictionClassification(output: Record<string, unknown>): boolean {
  return rows(output, "contradictions").some((c) => strNonempty(c.classification));
}

export function hasTwoContradictionComparableRank(
  output: Record<string, unknown>,
): boolean {
  const ranked = rows(output, "contradictions").filter(
    (c) => c.materiality != null || c.rank != null,
  );
  return ranked.length >= 2;
}

export function hasSourceContextComparison(output: Record<string, unknown>): boolean {
  return fieldPresent(output, "/sourceComparison") || fieldPresent(output, "/bundleSourceContext");
}

export function hasSolicitorSurfaceInventory(output: Record<string, unknown>): boolean {
  return (
    nonemptyArray(output, "/expectedSolicitorSurfaces") &&
    nonemptyArray(output, "/observedSolicitorSurfaces")
  );
}

function hasTwoDocumentVersionsWithOrdering(output: Record<string, unknown>): boolean {
  const versions = rows(output, "documentVersions");
  if (versions.length >= 2) {
    return (
      versions.every(
        (v) =>
          (typeof v.documentId === "string" && v.documentId.trim()) ||
          (typeof v.versionId === "string" && v.versionId.trim()),
      ) &&
      versions.some((v) => v.operative === true || v.ordering != null || v.precedence != null)
    );
  }
  return false;
}

function hasAttachmentRefPlusInventory(output: Record<string, unknown>): boolean {
  const states = rows(output, "evidenceStates");
  return states.some((s) => {
    const blob = `${s.label ?? ""} ${s.note ?? ""} ${s.attachmentRef ?? ""} ${s.existenceLabel ?? ""}`;
    return (
      /\battachment\b/i.test(blob) &&
      /\b(missing|absent|served|referred|attached)\b/i.test(blob) &&
      (typeof s.attachmentRef === "string" || typeof s.sourceDocumentId === "string")
    );
  });
}

function hasDefendantRosterAllocation(output: Record<string, unknown>): boolean {
  const roster = rows(output, "defendants");
  const alloc = rows(output, "countAllocations");
  if (roster.length >= 1 && alloc.length >= 1) return true;
  const charge = output.chargeInstrument;
  if (charge && typeof charge === "object") {
    const c = charge as Record<string, unknown>;
    return Array.isArray(c.defendants) && Array.isArray(c.counts);
  }
  return false;
}

function hasEventDatePlusDeadline(output: Record<string, unknown>): boolean {
  const events = rows(output, "chronologyEvents");
  const deadlines = rows(output, "proceduralDeadlines");
  return (
    events.some((e) => typeof e.eventDate === "string" && e.eventDate.trim()) &&
    deadlines.some((d) => typeof d.deadlineDate === "string" || d.deadlineState != null)
  );
}

function hasSurfacePositionOrder(output: Record<string, unknown>): boolean {
  const pri = rows(output, "priorityItems");
  if (pri.some((p) => p.surfacePosition != null || p.orderIndex != null || p.rank != null))
    return true;
  const exp = output.exportVersion;
  if (exp && typeof exp === "object") {
    const e = exp as Record<string, unknown>;
    return Array.isArray(e.surfaceOrder) || Array.isArray(e.sectionOrder);
  }
  return false;
}

function hasComparableExitReceipts(output: Record<string, unknown>): boolean {
  const exits = rows(output, "exitReceipts");
  if (exits.length >= 2) return true;
  const bag = output.multiExitEvidence;
  return (
    bag != null &&
    typeof bag === "object" &&
    Array.isArray((bag as { artefacts?: unknown }).artefacts)
  );
}

function hasAttributionGraph(output: Record<string, unknown>): boolean {
  return rows(output, "attributionEdges").length >= 1 || rows(output, "documentOwnership").length >= 1;
}

function hasDocumentRelationshipVersions(output: Record<string, unknown>): boolean {
  return (
    rows(output, "documentRelationships").length >= 1 ||
    rows(output, "documentVersions").length >= 1
  );
}

function hasInventoryCompletenessFields(output: Record<string, unknown>): boolean {
  const states = rows(output, "evidenceStates");
  return states.some(
    (s) =>
      s.inventoryComplete === true ||
      s.inventoryComplete === false ||
      (typeof s.inventoryStatus === "string" && s.inventoryStatus.trim()),
  );
}

function hasReasonTaxonomyFields(output: Record<string, unknown>): boolean {
  const states = rows(output, "evidenceStates");
  return states.some(
    (s) =>
      (typeof s.reasonCode === "string" && s.reasonCode.trim()) ||
      (typeof s.reasonTaxonomy === "string" && s.reasonTaxonomy.trim()) ||
      (typeof s.stateReason === "string" && s.stateReason.trim()),
  );
}

function chargeObj(output: Record<string, unknown>): Record<string, unknown> | null {
  const c = output.chargeInstrument;
  return c && typeof c === "object" ? (c as Record<string, unknown>) : null;
}

export function hasChargeStatutoryProvision(output: Record<string, unknown>): boolean {
  const c = chargeObj(output);
  return Boolean(c && strNonempty(c.statutoryProvision));
}

export function hasChargeDiscrepancyState(output: Record<string, unknown>): boolean {
  const c = chargeObj(output);
  if (c && (c.discrepancyState != null || Array.isArray(c.discrepancies))) return true;
  return rows(output, "discrepancies").length >= 1;
}

export function hasChargeSourceAndAction(output: Record<string, unknown>): boolean {
  const c = chargeObj(output);
  return Boolean(c && strNonempty(c.sourceIssue) && strNonempty(c.requiredAction));
}

export function hasChargeOperativeInstrument(output: Record<string, unknown>): boolean {
  const c = chargeObj(output);
  return Boolean(c && (c.operative != null || c.operativeInstrument != null));
}

export function hasChargeParticularsChange(output: Record<string, unknown>): boolean {
  const c = chargeObj(output);
  if (!c) return false;
  const particulars = Array.isArray(c.particulars) && c.particulars.length > 0;
  const hist = Array.isArray(c.amendmentHistory) && c.amendmentHistory.length > 0;
  return particulars && hist;
}

export function hasChargeStatementAndParticulars(output: Record<string, unknown>): boolean {
  const c = chargeObj(output);
  if (!c || !Array.isArray(c.particulars) || c.particulars.length === 0) return false;
  return fieldPresent(output, "/statementIdentity") || strNonempty(c.statementId);
}

export function hasResolvableExhibitDocBindings(output: Record<string, unknown>): boolean {
  return rows(output, "evidenceStates").some(
    (s) =>
      strNonempty(s.sourceDocumentId ?? s.documentId) &&
      strNonempty(s.exhibitLabel ?? s.label),
  );
}

type NamedTokenCheck = {
  ok: (output: Record<string, unknown>) => boolean;
  evidenceSummary: (output: Record<string, unknown>) => PrerequisiteEvidenceHit[];
};

function tokenHit(ref: string, pathStr: string, summary: string): PrerequisiteEvidenceHit {
  return { ref, path: pathStr, summary };
}

const NAMED_TOKEN_CHECKS: Record<string, NamedTokenCheck> = {
  two_identified_document_versions_with_ordering: {
    ok: hasTwoDocumentVersionsWithOrdering,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/documentVersions").map((h) => ({
        ...h,
        ref: "two_identified_document_versions_with_ordering",
      })),
  },
  same_exhibit_label_across_two_document_ids: {
    ok: hasSameExhibitLabelAcrossTwoDocumentIds,
    evidenceSummary: (o) => {
      const hits: PrerequisiteEvidenceHit[] = [];
      rows(o, "evidenceStates").forEach((s, i) => {
        const label = String(s.exhibitLabel ?? s.label ?? "");
        const id = String(s.sourceDocumentId ?? s.documentId ?? "");
        if (label && id) {
          hits.push(
            tokenHit(
              "same_exhibit_label_across_two_document_ids",
              `/evidenceStates/${i}`,
              `label=${label}; docId=${id}`,
            ),
          );
        }
      });
      return hits;
    },
  },
  /** @deprecated — retained for fail-closed recognition only */
  separate_document_identities_with_exhibit_labels: {
    ok: hasSameExhibitLabelAcrossTwoDocumentIds,
    evidenceSummary: (o) =>
      NAMED_TOKEN_CHECKS.same_exhibit_label_across_two_document_ids!.evidenceSummary(o),
  },
  attachment_reference_plus_inventory_state: {
    ok: hasAttachmentRefPlusInventory,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/evidenceStates/*/attachmentRef").map((h) => ({
        ...h,
        ref: "attachment_reference_plus_inventory_state",
      })),
  },
  defendant_roster_plus_count_allocation: {
    ok: hasDefendantRosterAllocation,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/defendants"),
      ...walkJsonPath(o, "/countAllocations"),
    ].map((h) => ({ ...h, ref: "defendant_roster_plus_count_allocation" })),
  },
  event_date_plus_deadline_state: {
    ok: hasEventDatePlusDeadline,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/chronologyEvents/*/eventDate"),
      ...walkJsonPath(o, "/proceduralDeadlines"),
    ].map((h) => ({ ...h, ref: "event_date_plus_deadline_state" })),
  },
  chase_rows_with_evidence_relationships: {
    ok: hasChaseProvenanceLinks,
    evidenceSummary: (o) =>
      NAMED_TOKEN_CHECKS.chase_to_evidence_provenance_links!.evidenceSummary(o),
  },
  chase_five_part_finding_schema: {
    ok: hasChaseFivePartSchema,
    evidenceSummary: (o) => {
      const hits: PrerequisiteEvidenceHit[] = [];
      for (const part of ["what", "why", "fromWhom", "byWhen", "ifNot"] as const) {
        hits.push(
          ...walkJsonPath(o, `/warningsAndGaps/chaseItems/*/${part}`).map((h) => ({
            ...h,
            ref: "chase_five_part_finding_schema",
          })),
        );
      }
      return hits;
    },
  },
  chase_to_evidence_provenance_links: {
    ok: hasChaseProvenanceLinks,
    evidenceSummary: (o) => {
      const hits: PrerequisiteEvidenceHit[] = [];
      chaseItems(o).forEach((c, i) => {
        const ref =
          c.evidenceRef ?? c.sourceEvidenceId ?? c.linkedEvidenceId ?? c.evidenceRelationship;
        if (ref != null && String(ref).trim()) {
          hits.push(
            tokenHit(
              "chase_to_evidence_provenance_links",
              `/warningsAndGaps/chaseItems/${i}`,
              summarizeValue(ref),
            ),
          );
        }
      });
      return hits;
    },
  },
  chase_evidential_procedural_type_fields: {
    ok: hasChaseTypeFields,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/warningsAndGaps/chaseItems/*/chaseType").map((h) => ({
        ...h,
        ref: "chase_evidential_procedural_type_fields",
      })),
  },
  chase_service_state_with_update_history: {
    ok: hasChaseServiceHistory,
    evidenceSummary: (o) => {
      const hits: PrerequisiteEvidenceHit[] = [];
      chaseItems(o).forEach((c, i) => {
        if (c.priorServiceState != null && c.currentServiceState != null && c.updateHistory != null) {
          hits.push(
            tokenHit(
              "chase_service_state_with_update_history",
              `/warningsAndGaps/chaseItems/${i}`,
              `prior=${summarizeValue(c.priorServiceState)}; current=${summarizeValue(c.currentServiceState)}; hist=${summarizeValue(c.updateHistory)}`,
            ),
          );
        }
      });
      return hits;
    },
  },
  excluded_quarantined_rows_and_disclosed_counts: {
    ok: hasExcludedQuarantinedAndDisclosed,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/excludedRequests"),
      ...walkJsonPath(o, "/quarantinedRequests"),
      ...walkJsonPath(o, "/disclosedCounts"),
    ].map((h) => ({ ...h, ref: "excluded_quarantined_rows_and_disclosed_counts" })),
  },
  surface_position_order_metadata: {
    ok: hasSurfacePositionOrder,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/priorityItems/*/surfacePosition"),
      ...walkJsonPath(o, "/priorityItems/*/orderIndex"),
      ...walkJsonPath(o, "/exportVersion/surfaceOrder"),
    ].map((h) => ({ ...h, ref: "surface_position_order_metadata" })),
  },
  contradiction_records_with_classification: {
    ok: hasContradictionClassification,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/contradictions/*/classification").map((h) => ({
        ...h,
        ref: "contradiction_records_with_classification",
      })),
  },
  two_contradiction_records_with_comparable_rank: {
    ok: hasTwoContradictionComparableRank,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/contradictions/*/materiality"),
      ...walkJsonPath(o, "/contradictions/*/rank"),
    ].map((h) => ({ ...h, ref: "two_contradiction_records_with_comparable_rank" })),
  },
  contradiction_records_with_materiality_rank: {
    ok: hasTwoContradictionComparableRank,
    evidenceSummary: (o) =>
      NAMED_TOKEN_CHECKS.two_contradiction_records_with_comparable_rank!.evidenceSummary(o),
  },
  comparable_exit_receipts: {
    ok: hasComparableExitReceipts,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/exitReceipts").map((h) => ({
        ...h,
        ref: "comparable_exit_receipts",
      })),
  },
  charge_instrument_identity_fields: {
    // Intentionally narrow: instrumentId alone — used only to prove it is NOT enough for charge controls
    ok: (o) => {
      const c = chargeObj(o);
      return Boolean(c && strNonempty(c.instrumentId));
    },
    evidenceSummary: (o) =>
      walkJsonPath(o, "/chargeInstrument/instrumentId").map((h) => ({
        ...h,
        ref: "charge_instrument_identity_fields",
      })),
  },
  charge_statutory_provision_field: {
    ok: hasChargeStatutoryProvision,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/chargeInstrument/statutoryProvision").map((h) => ({
        ...h,
        ref: "charge_statutory_provision_field",
      })),
  },
  charge_discrepancy_state_records: {
    ok: hasChargeDiscrepancyState,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/chargeInstrument/discrepancyState"),
      ...walkJsonPath(o, "/discrepancies"),
    ].map((h) => ({ ...h, ref: "charge_discrepancy_state_records" })),
  },
  charge_source_and_required_action_fields: {
    ok: hasChargeSourceAndAction,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/chargeInstrument/sourceIssue"),
      ...walkJsonPath(o, "/chargeInstrument/requiredAction"),
    ].map((h) => ({ ...h, ref: "charge_source_and_required_action_fields" })),
  },
  charge_operative_instrument_fields: {
    ok: hasChargeOperativeInstrument,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/chargeInstrument/operative").map((h) => ({
        ...h,
        ref: "charge_operative_instrument_fields",
      })),
  },
  charge_particulars_change_records: {
    ok: hasChargeParticularsChange,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/chargeInstrument/particulars"),
      ...walkJsonPath(o, "/chargeInstrument/amendmentHistory"),
    ].map((h) => ({ ...h, ref: "charge_particulars_change_records" })),
  },
  charge_statement_and_particulars_identities: {
    ok: hasChargeStatementAndParticulars,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/chargeInstrument/particulars"),
      ...walkJsonPath(o, "/statementIdentity"),
    ].map((h) => ({ ...h, ref: "charge_statement_and_particulars_identities" })),
  },
  attribution_graph_fields: {
    ok: hasAttributionGraph,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/attributionEdges"),
      ...walkJsonPath(o, "/documentOwnership"),
    ].map((h) => ({ ...h, ref: "attribution_graph_fields" })),
  },
  document_relationship_version_fields: {
    ok: hasDocumentRelationshipVersions,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/documentRelationships"),
      ...walkJsonPath(o, "/documentVersions"),
    ].map((h) => ({ ...h, ref: "document_relationship_version_fields" })),
  },
  inventory_completeness_state_fields: {
    ok: hasInventoryCompletenessFields,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/evidenceStates").map((h) => ({
        ...h,
        ref: "inventory_completeness_state_fields",
      })),
  },
  evidence_state_reason_taxonomy_fields: {
    ok: hasReasonTaxonomyFields,
    evidenceSummary: (o) =>
      walkJsonPath(o, "/evidenceStates/*/reasonCode").map((h) => ({
        ...h,
        ref: "evidence_state_reason_taxonomy_fields",
      })),
  },
  source_context_comparison_fields: {
    ok: hasSourceContextComparison,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/sourceComparison"),
      ...walkJsonPath(o, "/bundleSourceContext"),
    ].map((h) => ({ ...h, ref: "source_context_comparison_fields" })),
  },
  solicitor_expected_and_observed_surface_inventory: {
    ok: hasSolicitorSurfaceInventory,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/expectedSolicitorSurfaces"),
      ...walkJsonPath(o, "/observedSolicitorSurfaces"),
    ].map((h) => ({ ...h, ref: "solicitor_expected_and_observed_surface_inventory" })),
  },
  resolvable_exhibit_document_bindings: {
    ok: hasResolvableExhibitDocBindings,
    evidenceSummary: (o) => [
      ...walkJsonPath(o, "/evidenceStates/*/exhibitLabel"),
      ...walkJsonPath(o, "/evidenceStates/*/sourceDocumentId"),
    ].map((h) => ({ ...h, ref: "resolvable_exhibit_document_bindings" })),
  },
};

/**
 * Resolve and validate exactPrerequisiteEvidenceRefs against packet output.
 * Unknown refs / tokens fail closed.
 */
export function collectExactPrerequisiteEvidence(
  refs: string[],
  output: Record<string, unknown>,
  leaves: SourceLeaf[],
): { ok: boolean; missingRefs: string[]; found: PrerequisiteEvidenceHit[] } {
  const found: PrerequisiteEvidenceHit[] = [];
  const missingRefs: string[] = [];
  const wording = includedWordingLeaves(leaves);

  for (const ref of refs) {
    if (ref === "included_solicitor_visible_wording") {
      if (wording.length === 0) {
        missingRefs.push(ref);
      } else {
        found.push(
          tokenHit(ref, "included_solicitor_visible_wording", `leafCount=${wording.length}`),
        );
      }
      continue;
    }

    const token = NAMED_TOKEN_CHECKS[ref];
    if (token) {
      if (!token.ok(output)) {
        missingRefs.push(ref);
      } else {
        const hits = token.evidenceSummary(output);
        if (hits.length === 0) missingRefs.push(ref);
        else found.push(...hits);
      }
      continue;
    }

    // JSON path (leading slash or known top-level key path)
    if (ref.startsWith("/") || ref.includes("/")) {
      const pathRef = ref.startsWith("/") ? ref : `/${ref}`;
      const hits = walkJsonPath(output, pathRef).filter((h) => {
        // Skip empty-string leaf values
        return h.summary !== '""' && h.summary !== "";
      });
      // For OR-style path pairs handled as separate refs, each must independently resolve.
      // Empty-string values: treat as missing.
      const meaningful = hits.filter((h) => h.summary !== '""');
      if (meaningful.length === 0) missingRefs.push(ref);
      else found.push(...meaningful.map((h) => ({ ...h, ref })));
      continue;
    }

    // Bare top-level key
    if (ref in output && output[ref] != null) {
      found.push(tokenHit(ref, `/${ref}`, summarizeValue(output[ref])));
      continue;
    }

    missingRefs.push(ref);
  }

  return { ok: missingRefs.length === 0, missingRefs, found };
}

/**
 * Exact prerequisite check. Returns null if eligible to evaluate; else missing reason.
 * Used for both probe (`requiredInputs`) and named-control (`namedControlRequiredInputs`) sets.
 * Unknown prerequisite tokens fail closed.
 */
export function missingPrerequisite(
  h: Stage150HandlerDef,
  output: Record<string, unknown>,
  leaves: SourceLeaf[],
  inputSet: "probe" | "named" = "probe",
): string | null {
  const wording = includedWordingLeaves(leaves);
  const reqs =
    inputSet === "named"
      ? (h.namedControlRequiredInputs ?? h.requiredInputs)
      : h.requiredInputs;

  for (const req of reqs) {
    if (req === "casebrain-output.json") continue;

    if (req === "included_solicitor_visible_wording") {
      if (wording.length === 0) return "missing:included_solicitor_visible_wording";
      continue;
    }

    if (req === "nonempty:/evidenceStates") {
      if (!nonemptyArray(output, "/evidenceStates")) return "missing_or_empty:/evidenceStates";
      continue;
    }
    if (req === "nonempty:/fiveAnswersEvidenceRows") {
      if (!nonemptyArray(output, "/fiveAnswersEvidenceRows"))
        return "missing_or_empty:/fiveAnswersEvidenceRows";
      continue;
    }
    if (req === "array:/warningsAndGaps/chaseItems") {
      if (!arrayPresent(output, "/warningsAndGaps/chaseItems"))
        return "missing:/warningsAndGaps/chaseItems";
      continue;
    }
    if (req === "nonempty:/warningsAndGaps/chaseItems") {
      if (!nonemptyArray(output, "/warningsAndGaps/chaseItems"))
        return "missing_or_empty:/warningsAndGaps/chaseItems";
      continue;
    }
    if (req === "array:/warningsAndGaps/doNotOverstate") {
      if (!arrayPresent(output, "/warningsAndGaps/doNotOverstate"))
        return "missing:/warningsAndGaps/doNotOverstate";
      continue;
    }
    if (req === "nonempty:/warningsAndGaps/doNotOverstate") {
      if (!nonemptyArray(output, "/warningsAndGaps/doNotOverstate"))
        return "missing_or_empty:/warningsAndGaps/doNotOverstate";
      continue;
    }
    if (req === "/courtNote/text") {
      const court = (output.courtNote ?? {}) as Record<string, unknown>;
      if (typeof court.text !== "string" || !court.text.trim()) return "missing_or_empty:/courtNote/text";
      continue;
    }
    if (req === "/courtNote/sendabilityLabel") {
      const court = (output.courtNote ?? {}) as Record<string, unknown>;
      if (typeof court.sendabilityLabel !== "string" || !court.sendabilityLabel.trim())
        return "missing_or_empty:/courtNote/sendabilityLabel";
      continue;
    }
    if (req === "/exportVersion/reviewFooter") {
      const exp = (output.exportVersion ?? {}) as Record<string, unknown>;
      if (typeof exp.reviewFooter !== "string" || !exp.reviewFooter.trim())
        return "missing_or_empty:/exportVersion/reviewFooter";
      continue;
    }
    if (req === "array_allow_empty:/fiveAnswersEvidenceRows") {
      if (!("fiveAnswersEvidenceRows" in output) && !fieldPresent(output, "/courtNote")) {
        return "missing:/fiveAnswersEvidenceRows_and_/courtNote";
      }
      continue;
    }
    if (req === "original_source_binary") {
      return "missing:original_source_binary";
    }

    const token = NAMED_TOKEN_CHECKS[req];
    if (token) {
      if (!token.ok(output)) return `missing:${req}`;
      continue;
    }

    return `missing:unrecognised_prerequisite:${req}`;
  }
  return null;
}

function emptyEvidenceFields(): Pick<
  ControlReceipt,
  | "prerequisiteEvidenceFoundPaths"
  | "prerequisiteFieldValueSummary"
  | "prerequisiteEvidenceValidationOk"
> {
  return {
    prerequisiteEvidenceFoundPaths: [],
    prerequisiteFieldValueSummary: [],
    prerequisiteEvidenceValidationOk: false,
  };
}

function receiptFromHits(
  caseId: string,
  h: Stage150HandlerDef,
  hits: Stage150Hit[],
  probeMissing: string | null,
  namedMissing: string | null,
  evidence:
    | ReturnType<typeof collectExactPrerequisiteEvidence>
    | null = null,
): ControlReceipt {
  const capabilityScope = h.capabilityScope ?? "packet-local detector probe";
  const exercisedInvariant =
    h.exercisedInvariant ?? "Probe prerequisites present; detector may emit candidates";
  const unexercisedInvariant =
    h.unexercisedInvariant ?? "Probe or named-control prerequisites absent";
  const exactPrerequisiteEvidenceRefs = h.exactPrerequisiteEvidenceRefs ?? [...h.requiredInputs];
  const detectorClassification = h.detectorClassification ?? null;

  if (probeMissing) {
    return {
      caseId,
      controlId: h.controlId,
      status: "not_exercised",
      probeStatus: "not_exercised",
      namedControlExerciseStatus: "not_exercised",
      capabilityScope,
      exercisedInvariant,
      unexercisedInvariant,
      exactPrerequisiteEvidenceRefs,
      ...emptyEvidenceFields(),
      detectorClassification,
      missingInputReason: probeMissing,
      namedControlMissingInputReason: namedMissing ?? probeMissing,
      hitCount: 0,
      findingCodes: [],
      candidateClasses: [],
      emptyHitsDoNotImplyPass: true,
      note: `probe not_exercised — ${probeMissing}. Named control also not_exercised. Never PASS on missing input.`,
      absenceIsFinding: Boolean(h.absenceIsFinding),
    };
  }

  const classes = [...new Set(hits.map((x) => x.candidateClass))];
  const hasUnresolved = classes.includes("unresolved") || classes.includes("human_review_required");
  const probeStatus: ReceiptStatus =
    hits.length === 0
      ? "evaluated"
      : hasUnresolved && !classes.includes("candidate_defect")
        ? "unresolved"
        : "evaluated";

  // Named control: never fully_exercised at Stage-150 partial layer.
  // Fail closed unless named tokens AND exactPrerequisiteEvidenceRefs all validate.
  let effectiveNamedMissing = namedMissing;
  let evidenceFoundPaths: string[] = [];
  let fieldSummary: PrerequisiteEvidenceHit[] = [];
  let evidenceOk = false;

  if (!namedMissing) {
    const ev =
      evidence ??
      ({
        ok: false,
        missingRefs: exactPrerequisiteEvidenceRefs,
        found: [],
      } as ReturnType<typeof collectExactPrerequisiteEvidence>);
    evidenceOk = ev.ok;
    evidenceFoundPaths = [...new Set(ev.found.map((f) => f.path))];
    fieldSummary = ev.found;
    if (!ev.ok) {
      effectiveNamedMissing = `missing:exactPrerequisiteEvidenceRefs:${ev.missingRefs.join(",")}`;
    }
  }

  const namedControlExerciseStatus: NamedControlExerciseStatus =
    !effectiveNamedMissing && evidenceOk ? "partially_exercised" : "not_exercised";

  return {
    caseId,
    controlId: h.controlId,
    status: probeStatus,
    probeStatus,
    namedControlExerciseStatus,
    capabilityScope,
    exercisedInvariant,
    unexercisedInvariant,
    exactPrerequisiteEvidenceRefs,
    prerequisiteEvidenceFoundPaths: evidenceFoundPaths,
    prerequisiteFieldValueSummary: fieldSummary,
    prerequisiteEvidenceValidationOk: evidenceOk && !effectiveNamedMissing,
    detectorClassification,
    missingInputReason: null,
    namedControlMissingInputReason: effectiveNamedMissing,
    hitCount: hits.length,
    findingCodes: hits.map((x) => x.findingCode),
    candidateClasses: classes,
    emptyHitsDoNotImplyPass: true,
    note:
      hits.length === 0
        ? `probe=${probeStatus} (zero hits ≠ PASS); namedControl=${namedControlExerciseStatus}${effectiveNamedMissing ? ` (${effectiveNamedMissing})` : ""}; evidencePaths=${evidenceFoundPaths.length}.`
        : `probe=${probeStatus} with ${hits.length} candidate hit(s); namedControl=${namedControlExerciseStatus}${effectiveNamedMissing ? ` — ${effectiveNamedMissing}` : ""}; evidencePaths=${evidenceFoundPaths.length}. Calibration-only — not programme PASS.`,
    absenceIsFinding: Boolean(h.absenceIsFinding),
  };
}

/**
 * Scan a single packet: exact eligibility + per-control receipts.
 * Reads casebrain-output.json only. Truth file existence via existsSync — never open contents.
 */
export function scanCaseEligibility(
  caseId: string,
  packetAbsDir: string,
  handlers: Stage150HandlerDef[] = STAGE150_PACKET_LOCAL_HANDLERS,
): CaseEligibility {
  const outputPath = path.join(packetAbsDir, "casebrain-output.json");
  const truthPath = path.join(packetAbsDir, "truth-key.json");
  const hasCasebrainOutput = fs.existsSync(outputPath);
  const truthKeyFilePresent = fs.existsSync(truthPath);

  if (!hasCasebrainOutput) {
    const receipts = handlers.map((h) =>
      receiptFromHits(caseId, h, [], "missing:casebrain-output.json", "missing:casebrain-output.json"),
    );
    return {
      caseId,
      packetPath: packetAbsDir,
      hasCasebrainOutput,
      truthKeyFilePresent,
      truthOpened: false,
      inventoryReconciliation: null,
      includedSolicitorVisibleWordingCount: 0,
      receipts,
      eligibleControlIds: [],
      notExercisedControlIds: handlers.map((h) => h.controlId),
      unresolvedControlIds: [],
      evaluatedControlIds: [],
      namedFullyExercisedControlIds: [],
      namedPartiallyExercisedControlIds: [],
      namedNotExercisedControlIds: handlers.map((h) => h.controlId),
    };
  }

  const output = JSON.parse(fs.readFileSync(outputPath, "utf8")) as Record<string, unknown>;
  const leaves = inventoryOutputLeaves(caseId, output);
  const recon = reconcileInventory(leaves);
  const ctx = buildEvalContext(caseId, output);
  ctx.leaves = leaves;

  const allHits = evaluateAllStage150Intelligence(ctx);
  const hitsByControl = new Map<string, Stage150Hit[]>();
  for (const hit of allHits) {
    const bucket = hitsByControl.get(hit.controlId) ?? [];
    bucket.push(hit);
    hitsByControl.set(hit.controlId, bucket);
  }

  const receipts: ControlReceipt[] = [];
  for (const h of handlers) {
    const probeMissing = missingPrerequisite(h, output, leaves, "probe");
    const namedMissing = missingPrerequisite(h, output, leaves, "named");
    const refs = h.exactPrerequisiteEvidenceRefs ?? [...h.requiredInputs];
    const evidence =
      !probeMissing && !namedMissing
        ? collectExactPrerequisiteEvidence(refs, output, leaves)
        : !probeMissing
          ? collectExactPrerequisiteEvidence(refs, output, leaves)
          : null;
    if (probeMissing) {
      receipts.push(receiptFromHits(caseId, h, [], probeMissing, namedMissing, evidence));
      continue;
    }
    receipts.push(
      receiptFromHits(
        caseId,
        h,
        hitsByControl.get(h.controlId) ?? [],
        null,
        namedMissing,
        evidence,
      ),
    );
  }

  return {
    caseId,
    packetPath: packetAbsDir,
    hasCasebrainOutput,
    truthKeyFilePresent,
    truthOpened: false,
    inventoryReconciliation: recon,
    includedSolicitorVisibleWordingCount: includedWordingLeaves(leaves).length,
    receipts,
    eligibleControlIds: receipts.filter((r) => r.probeStatus !== "not_exercised").map((r) => r.controlId),
    notExercisedControlIds: receipts
      .filter((r) => r.probeStatus === "not_exercised")
      .map((r) => r.controlId),
    unresolvedControlIds: receipts.filter((r) => r.probeStatus === "unresolved").map((r) => r.controlId),
    evaluatedControlIds: receipts.filter((r) => r.probeStatus === "evaluated").map((r) => r.controlId),
    namedFullyExercisedControlIds: receipts
      .filter((r) => r.namedControlExerciseStatus === "fully_exercised")
      .map((r) => r.controlId),
    namedPartiallyExercisedControlIds: receipts
      .filter((r) => r.namedControlExerciseStatus === "partially_exercised")
      .map((r) => r.controlId),
    namedNotExercisedControlIds: receipts
      .filter((r) => r.namedControlExerciseStatus === "not_exercised")
      .map((r) => r.controlId),
  };
}
