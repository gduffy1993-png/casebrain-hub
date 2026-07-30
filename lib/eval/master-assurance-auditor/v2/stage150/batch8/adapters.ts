/**
 * Batch-8 deterministic structured adapters.
 * Packet-local output (+ optional bundle bytes for hashing only).
 * Never opens truth keys. Never invents IDs/pages/links from free-text similarity.
 */

import crypto from "node:crypto";
import { inferEvidenceModality } from "@/lib/criminal/evidence-state-reconcile";
import {
  BATCH8_RECEIPT_SCHEMA,
  BATCH8_REQUIRED_EXIT_IDS,
  BATCH8_SCHEMA_VERSION,
  type Batch8AdapterResult,
  type Batch8FieldReceipt,
  type ChargeInstrumentRecord,
  type ChronologyEventRecord,
  type ChaseRelationshipRecord,
  type EvidenceUnitRecord,
  type ExitSnapshotRecord,
  type ProvenanceRecord,
} from "./schemas";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function summarize(v: unknown, max = 96): string {
  if (v == null) return "null";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function receipt(
  field: string,
  value: unknown,
  sourcePointer: string,
  opts?: { derived?: boolean; sourceFile?: Batch8FieldReceipt["sourceFile"] },
): Batch8FieldReceipt {
  const raw = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return {
    schemaVersion: BATCH8_RECEIPT_SCHEMA,
    field,
    valueSummary: summarize(value),
    valueSha256: sha256(raw),
    sourcePointer,
    sourceFile: opts?.sourceFile ?? "casebrain-output.json",
    derived: opts?.derived ?? false,
    invented: false,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Eligible only when applicable>0 and every applicable record is complete. */
function rollupCapability(args: {
  applicableRecordCount: number;
  completeRecordCount: number;
  incompleteRecordCount: number;
  ambiguousRelationshipCount?: number;
  emptyReason: string;
  eligibleReason: string;
  partialReason: string;
}): {
  capabilityStatus: "eligible" | "partial" | "unavailable";
  eligibilityReason: string;
} {
  const ambiguous = args.ambiguousRelationshipCount ?? 0;
  if (args.applicableRecordCount === 0) {
    return { capabilityStatus: "unavailable", eligibilityReason: args.emptyReason };
  }
  if (
    args.completeRecordCount === args.applicableRecordCount &&
    args.incompleteRecordCount === 0 &&
    ambiguous === 0
  ) {
    return { capabilityStatus: "eligible", eligibilityReason: args.eligibleReason };
  }
  return { capabilityStatus: "partial", eligibilityReason: args.partialReason };
}

function isChargeComplete(r: ChargeInstrumentRecord): boolean {
  return Boolean(
    r.instrumentId &&
      r.instrumentType &&
      r.exactWording &&
      r.count != null &&
      r.defendantAllocation != null &&
      r.sourceDocument &&
      r.status &&
      r.version,
  );
}

function isEvidenceComplete(r: EvidenceUnitRecord): boolean {
  return Boolean(
    r.evidenceUnitId &&
      (r.subjectDefendantId || r.personId) &&
      r.existence &&
      r.sourcePage &&
      r.pageIdentityKnown,
  );
}

function isChronologyComplete(r: ChronologyEventRecord): boolean {
  return Boolean(r.eventType && r.timestamp && r.timezone);
}

function isProvenanceComplete(r: ProvenanceRecord): boolean {
  return Boolean(
    r.pageIdentityKnown && r.sourcePage && r.compiledPage && r.sourceDocumentIdentity,
  );
}

function isChaseComplete(r: ChaseRelationshipRecord): boolean {
  return Boolean(
    r.requestId &&
      r.linkMethod === "explicit_id" &&
      r.linkedEvidenceOccurrenceRef &&
      r.resolutionState,
  );
}


/** Explicit structured bags only — never scrape court prose into instruments. */
export function adaptChargeInstruments(
  caseId: string,
  output: Record<string, unknown>,
): Batch8AdapterResult<ChargeInstrumentRecord> {
  const bag = output.chargeInstruments;
  const receipts: Batch8FieldReceipt[] = [];
  const records: ChargeInstrumentRecord[] = [];
  const missing = [
    "instrumentId",
    "instrumentType",
    "exactWording",
    "count",
    "defendantAllocation",
    "sourceDocument",
    "sourcePage",
    "status",
    "version",
    "replacement/supersession link",
  ];

  if (!Array.isArray(bag) || bag.length === 0) {
    return {
      schemaVersion: BATCH8_SCHEMA_VERSION,
      adapterId: "charge_instruments",
      caseId,
      capabilityStatus: "unavailable",
      opensTruth: false,
      invented: false,
      records: [],
      fieldReceipts: [],
      missingRequiredFields: missing,
      blockers: [
        "No /chargeInstruments array on casebrain-output.json",
        "Free-text courtNote/bundle cannot create instrument identity or defendant allocation",
      ],
      note: "Charge instrument adapter unavailable on ESA — not_exercised for CHG/LSL instrument controls.",
      applicableRecordCount: 0,
      completeRecordCount: 0,
      incompleteRecordCount: 0,
      ambiguousRelationshipCount: 0,
      eligibilityReason: "No applicable chargeInstruments records.",
    };
  }

  bag.forEach((raw, i) => {
    if (!isObj(raw)) return;
    const occurrenceRef = `/chargeInstruments/${i}`;
    const pageIdentityKnown = raw.pageIdentityKnown === true;
    const sourcePage = typeof raw.sourcePage === "string" ? raw.sourcePage : null;
    const rec: ChargeInstrumentRecord = {
      instrumentId: typeof raw.instrumentId === "string" ? raw.instrumentId : null,
      instrumentType: typeof raw.instrumentType === "string" ? raw.instrumentType : null,
      exactWording: typeof raw.exactWording === "string" ? raw.exactWording : null,
      count: typeof raw.count === "number" ? raw.count : null,
      defendantAllocation:
        typeof raw.defendantAllocation === "string" ? raw.defendantAllocation : null,
      sourceDocument: typeof raw.sourceDocument === "string" ? raw.sourceDocument : null,
      sourcePage: pageIdentityKnown ? sourcePage : null,
      pageIdentityKnown,
      status: typeof raw.status === "string" ? raw.status : null,
      version: typeof raw.version === "string" ? raw.version : null,
      replacesInstrumentId:
        typeof raw.replacesInstrumentId === "string" ? raw.replacesInstrumentId : null,
      supersededByInstrumentId:
        typeof raw.supersededByInstrumentId === "string" ? raw.supersededByInstrumentId : null,
      occurrenceRef,
    };
    records.push(rec);
    for (const [field, val] of Object.entries(rec)) {
      if (val != null && field !== "occurrenceRef") {
        receipts.push(receipt(`chargeInstruments.${field}`, val, `${occurrenceRef}/${field}`));
      }
    }
  });

  const completeRecordCount = records.filter(isChargeComplete).length;
  const incompleteRecordCount = records.length - completeRecordCount;
  const rollup = rollupCapability({
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    emptyReason: "No applicable chargeInstruments records.",
    eligibleReason: `All ${records.length} charge instrument record(s) complete.`,
    partialReason: `Aggregate incomplete: complete=${completeRecordCount}/${records.length}; one complete record does not upgrade the adapter.`,
  });
  return {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapterId: "charge_instruments",
    caseId,
    capabilityStatus: rollup.capabilityStatus,
    opensTruth: false,
    invented: false,
    records,
    fieldReceipts: receipts,
    missingRequiredFields: rollup.capabilityStatus === "eligible" ? [] : missing,
    blockers:
      rollup.capabilityStatus === "eligible"
        ? []
        : ["Structured chargeInstruments present but not every applicable record is complete"],
    note: rollup.eligibilityReason,
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount: 0,
    eligibilityReason: rollup.eligibilityReason,
  };
}

export function adaptEvidenceUnits(
  caseId: string,
  output: Record<string, unknown>,
): Batch8AdapterResult<EvidenceUnitRecord> {
  const five = arr(output.fiveAnswersEvidenceRows);
  const states = arr(output.evidenceStates);
  const receipts: Batch8FieldReceipt[] = [];
  const records: EvidenceUnitRecord[] = [];

  const labelToRefs = new Map<string, string[]>();
  const noteLabel = (label: string, ref: string) => {
    const key = label.trim().toLowerCase();
    if (!key) return;
    const list = labelToRefs.get(key) ?? [];
    list.push(ref);
    labelToRefs.set(key, list);
  };

  five.forEach((row, i) => {
    const occurrenceRef = `/fiveAnswersEvidenceRows/${i}`;
    const label = str(row.label);
    noteLabel(label, occurrenceRef);
    const modality =
      typeof row.modality === "string" && row.modality.trim()
        ? str(row.modality)
        : label
          ? inferEvidenceModality(label)
          : null;
    const modalityDerivation =
      typeof row.modality === "string" && row.modality.trim()
        ? ("explicit_field" as const)
        : label
          ? ("label_pattern" as const)
          : ("absent" as const);
    const pageIdentityKnown = row.pageIdentityKnown === true;
    const sourcePage = typeof row.sourcePage === "string" ? row.sourcePage : null;
    const rec: EvidenceUnitRecord = {
      evidenceUnitId: typeof row.evidenceUnitId === "string" ? row.evidenceUnitId : null,
      occurrenceRef,
      evidenceTypeOrModality: modality,
      modalityDerivation,
      subjectDefendantId: typeof row.subjectDefendantId === "string" ? row.subjectDefendantId : null,
      personId: typeof row.personId === "string" ? row.personId : null,
      existence: typeof row.existence === "string" ? row.existence : null,
      reliability: typeof row.reliability === "string" ? row.reliability : null,
      aliases: [],
      exactLabelPeerOccurrenceRefs: [],
      draftFinalRelationship: null,
      extractFullRelationship: null,
      sourceDocument: typeof row.sourceDocument === "string" ? row.sourceDocument : null,
      sourcePage: pageIdentityKnown ? sourcePage : null,
      pageIdentityKnown,
      label: label || null,
    };
    records.push(rec);
    if (rec.existence != null) {
      receipts.push(receipt("existence", rec.existence, `${occurrenceRef}/existence`));
    }
    if (rec.reliability != null) {
      receipts.push(receipt("reliability", rec.reliability, `${occurrenceRef}/reliability`));
    }
    if (rec.label != null) {
      receipts.push(receipt("label", rec.label, `${occurrenceRef}/label`));
    }
    if (rec.evidenceTypeOrModality != null && modalityDerivation === "label_pattern") {
      receipts.push(
        receipt("evidenceTypeOrModality", rec.evidenceTypeOrModality, `${occurrenceRef}/label`, {
          derived: true,
        }),
      );
    }
  });

  states.forEach((row, i) => {
    const occurrenceRef = `/evidenceStates/${i}`;
    const label = str(row.label);
    noteLabel(label, occurrenceRef);
    // Only add a separate evidenceStates unit when not already represented by identical fiveAnswers index pairing.
    // We always record evidenceStates rows as units with state fields.
    const modality = label ? inferEvidenceModality(label) : null;
    const pageIdentityKnown = row.pageIdentityKnown === true;
    const sourcePage = typeof row.sourcePage === "string" ? row.sourcePage : null;
    const rec: EvidenceUnitRecord = {
      evidenceUnitId: typeof row.evidenceUnitId === "string" ? row.evidenceUnitId : null,
      occurrenceRef,
      evidenceTypeOrModality: modality,
      modalityDerivation: label ? "label_pattern" : "absent",
      subjectDefendantId: typeof row.subjectDefendantId === "string" ? row.subjectDefendantId : null,
      personId: typeof row.personId === "string" ? row.personId : null,
      existence:
        typeof row.inferredSourceState === "string"
          ? row.inferredSourceState
          : typeof row.existenceLabel === "string"
            ? row.existenceLabel
            : null,
      reliability: null,
      aliases: [],
      exactLabelPeerOccurrenceRefs: [],
      draftFinalRelationship: null,
      extractFullRelationship: null,
      sourceDocument: typeof row.source === "string" ? row.source : null,
      sourcePage: pageIdentityKnown ? sourcePage : null,
      pageIdentityKnown,
      label: label || null,
    };
    records.push(rec);
    if (rec.existence != null) {
      receipts.push(
        receipt(
          "existence",
          rec.existence,
          typeof row.inferredSourceState === "string"
            ? `${occurrenceRef}/inferredSourceState`
            : `${occurrenceRef}/existenceLabel`,
        ),
      );
    }
    if (rec.sourceDocument != null) {
      receipts.push(receipt("sourceDocument", rec.sourceDocument, `${occurrenceRef}/source`));
    }
    if (rec.label != null) {
      receipts.push(receipt("label", rec.label, `${occurrenceRef}/label`));
    }
  });

  for (const rec of records) {
    const key = (rec.label ?? "").trim().toLowerCase();
    const peers = (labelToRefs.get(key) ?? []).filter((r) => r !== rec.occurrenceRef);
    rec.exactLabelPeerOccurrenceRefs = peers;
    if (peers.length) {
      receipts.push(
        receipt("exactLabelPeerOccurrenceRefs", peers, rec.occurrenceRef, { derived: true }),
      );
    }
  }

  const hasCore = records.some((r) => r.existence != null || r.reliability != null);
  const completeRecordCount = records.filter(isEvidenceComplete).length;
  const incompleteRecordCount = records.length - completeRecordCount;
  const rollup = rollupCapability({
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    emptyReason: "No fiveAnswers/evidenceStates rows.",
    eligibleReason: `All ${records.length} evidence unit record(s) complete.`,
    partialReason: `Aggregate incomplete: complete=${completeRecordCount}/${records.length}; semantic IDs/pages missing on incomplete rows.`,
  });

  return {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapterId: "evidence_units",
    caseId,
    capabilityStatus: !hasCore && records.length === 0 ? "unavailable" : rollup.capabilityStatus,
    opensTruth: false,
    invented: false,
    records,
    fieldReceipts: receipts,
    missingRequiredFields:
      rollup.capabilityStatus === "eligible"
        ? []
        : [
            "evidenceUnitId",
            "subjectDefendantId",
            "personId",
            "sourcePage",
            "draftFinalRelationship",
            "extractFullRelationship",
          ],
    blockers:
      rollup.capabilityStatus === "eligible"
        ? []
        : [
            "Not every applicable evidence unit is complete",
            "Aliases limited to exact-label peers — free-text similarity forbidden",
          ],
    note: rollup.eligibilityReason,
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount: 0,
    eligibilityReason: rollup.eligibilityReason,
  };
}

export function adaptChronologyEvents(
  caseId: string,
  output: Record<string, unknown>,
): Batch8AdapterResult<ChronologyEventRecord> {
  const bag = output.chronologyEvents;
  if (!Array.isArray(bag) || bag.length === 0) {
    return {
      schemaVersion: BATCH8_SCHEMA_VERSION,
      adapterId: "chronology_events",
      caseId,
      capabilityStatus: "unavailable",
      opensTruth: false,
      invented: false,
      records: [],
      fieldReceipts: [],
      missingRequiredFields: [
        "eventId",
        "eventType",
        "timestamp",
        "timezone",
        "source",
        "confidence",
        "competingEventGroupId",
      ],
      blockers: [
        "No /chronologyEvents on casebrain-output.json",
        "exportVersion.generatedAt / generatedAt are export clocks — not chronology events",
      ],
      note: "Chronology adapter unavailable on ESA.",
      applicableRecordCount: 0,
      completeRecordCount: 0,
      incompleteRecordCount: 0,
      ambiguousRelationshipCount: 0,
      eligibilityReason: "No applicable chronologyEvents records.",
    };
  }

  const receipts: Batch8FieldReceipt[] = [];
  const records: ChronologyEventRecord[] = [];
  bag.forEach((raw, i) => {
    if (!isObj(raw)) return;
    const occurrenceRef = `/chronologyEvents/${i}`;
    const rec: ChronologyEventRecord = {
      eventId: typeof raw.eventId === "string" ? raw.eventId : null,
      eventType: typeof raw.eventType === "string" ? raw.eventType : null,
      timestamp: typeof raw.timestamp === "string" ? raw.timestamp : null,
      timezone: typeof raw.timezone === "string" ? raw.timezone : null,
      source: typeof raw.source === "string" ? raw.source : null,
      confidence: typeof raw.confidence === "string" ? raw.confidence : null,
      competingEventGroupId:
        typeof raw.competingEventGroupId === "string" ? raw.competingEventGroupId : null,
      occurrenceRef,
    };
    records.push(rec);
    for (const [field, val] of Object.entries(rec)) {
      if (val != null && field !== "occurrenceRef") {
        receipts.push(receipt(`chronology.${field}`, val, `${occurrenceRef}/${field}`));
      }
    }
  });

  const completeRecordCount = records.filter(isChronologyComplete).length;
  const incompleteRecordCount = records.length - completeRecordCount;
  const rollup = rollupCapability({
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    emptyReason: "No applicable chronologyEvents records.",
    eligibleReason: `All ${records.length} chronology event(s) complete (type+timestamp+timezone).`,
    partialReason: `Aggregate incomplete: complete=${completeRecordCount}/${records.length}; one complete event does not upgrade the adapter.`,
  });
  return {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapterId: "chronology_events",
    caseId,
    capabilityStatus: rollup.capabilityStatus,
    opensTruth: false,
    invented: false,
    records,
    fieldReceipts: receipts,
    missingRequiredFields:
      rollup.capabilityStatus === "eligible" ? [] : ["timezone", "eventType", "timestamp"],
    blockers:
      rollup.capabilityStatus === "eligible"
        ? []
        : ["Not every applicable chronology event is complete (timestamp+timezone+type required)"],
    note: rollup.eligibilityReason,
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount: 0,
    eligibilityReason: rollup.eligibilityReason,
  };
}

export function adaptProvenance(
  caseId: string,
  output: Record<string, unknown>,
): Batch8AdapterResult<ProvenanceRecord> {
  const states = arr(output.evidenceStates);
  const five = arr(output.fiveAnswersEvidenceRows);
  const receipts: Batch8FieldReceipt[] = [];
  const records: ProvenanceRecord[] = [];

  // Applicable provenance surface = evidenceStates rows (page identity). Limitation notes are incomplete cues.
  states.forEach((row, i) => {
    const occurrenceRef = `/evidenceStates/${i}`;
    const sourcePage = typeof row.sourcePage === "string" ? row.sourcePage : null;
    const compiledPage = typeof row.compiledPage === "string" ? row.compiledPage : null;
    const pageIdentityKnown = row.pageIdentityKnown === true;
    const rec: ProvenanceRecord = {
      occurrenceRef,
      sourceDocumentIdentity: typeof row.source === "string" ? row.source : null,
      sourcePage: pageIdentityKnown ? sourcePage : null,
      compiledPage: pageIdentityKnown ? compiledPage : null,
      pageIdentityKnown,
      limitationReason: null,
      evidenceAnchorRaw: typeof row.evidenceAnchor === "string" ? row.evidenceAnchor : null,
    };
    records.push(rec);
    if (rec.sourceDocumentIdentity) {
      receipts.push(receipt("sourceDocumentIdentity", rec.sourceDocumentIdentity, `${occurrenceRef}/source`));
    }
    if (rec.evidenceAnchorRaw) {
      receipts.push(receipt("evidenceAnchorRaw", rec.evidenceAnchorRaw, `${occurrenceRef}/evidenceAnchor`));
    }
    receipts.push(
      receipt("pageIdentityKnown", rec.pageIdentityKnown, `${occurrenceRef}/pageIdentityKnown`, {
        derived: !("pageIdentityKnown" in row),
      }),
    );
  });

  five.forEach((row, i) => {
    const occurrenceRef = `/fiveAnswersEvidenceRows/${i}`;
    const note = typeof row.note === "string" ? row.note : null;
    if (!note) return;
    records.push({
      occurrenceRef,
      sourceDocumentIdentity: null,
      sourcePage: null,
      compiledPage: null,
      pageIdentityKnown: false,
      limitationReason: note,
      evidenceAnchorRaw: null,
    });
    receipts.push(receipt("limitationReason", note, `${occurrenceRef}/note`));
  });

  const completeRecordCount = records.filter(isProvenanceComplete).length;
  const incompleteRecordCount = records.length - completeRecordCount;
  const rollup = rollupCapability({
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    emptyReason: "No provenance cues.",
    eligibleReason: `All ${records.length} provenance record(s) complete (pageIdentityKnown+pages+sourceDocument).`,
    partialReason: `Aggregate incomplete: complete=${completeRecordCount}/${records.length}; one complete provenance row does not upgrade the adapter.`,
  });

  return {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapterId: "provenance",
    caseId,
    capabilityStatus: rollup.capabilityStatus,
    opensTruth: false,
    invented: false,
    records,
    fieldReceipts: receipts,
    missingRequiredFields:
      rollup.capabilityStatus === "eligible"
        ? []
        : ["sourcePage", "compiledPage", "pageIdentityKnown=true", "sourceDocumentIdentity"],
    blockers:
      rollup.capabilityStatus === "eligible"
        ? []
        : [
            "Not every applicable provenance record is complete",
            "evidenceAnchor text is not a page identity",
          ],
    note: rollup.eligibilityReason,
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount: 0,
    eligibilityReason: rollup.eligibilityReason,
  };
}

export function adaptChaseRelationships(
  caseId: string,
  output: Record<string, unknown>,
): Batch8AdapterResult<ChaseRelationshipRecord> {
  const gaps = (output.warningsAndGaps ?? {}) as Record<string, unknown>;
  const chaseItems = arr(gaps.chaseItems);
  const states = arr(output.evidenceStates);
  const receipts: Batch8FieldReceipt[] = [];
  const records: ChaseRelationshipRecord[] = [];

  /** Collect ALL exact-label candidates — never Map overwrite / last-row wins. */
  const candidatesByExactLabel = new Map<string, Array<{ ref: string; state: string }>>();
  states.forEach((row, i) => {
    const label = str(row.label).trim().toLowerCase();
    if (!label) return;
    const list = candidatesByExactLabel.get(label) ?? [];
    list.push({
      ref: `/evidenceStates/${i}`,
      state: str(row.inferredSourceState || row.existenceLabel),
    });
    candidatesByExactLabel.set(label, list);
  });

  chaseItems.forEach((row, i) => {
    const occurrenceRef = `/warningsAndGaps/chaseItems/${i}`;
    const label = str(row.label);
    const candidates = candidatesByExactLabel.get(label.trim().toLowerCase()) ?? [];
    const candidateRefs = candidates.map((c) => c.ref);

    let linkAmbiguity: ChaseRelationshipRecord["linkAmbiguity"] = "none";
    let linkMethod: ChaseRelationshipRecord["linkMethod"] = "none";
    let linkedEvidenceOccurrenceRef: string | null = null;
    let requestedState: string | null =
      typeof row.requestedState === "string" ? row.requestedState : null;

    if (typeof row.evidenceUnitId === "string" && row.evidenceUnitId.trim()) {
      linkMethod = "explicit_id";
      linkedEvidenceOccurrenceRef = `evidenceUnitId:${row.evidenceUnitId}`;
      linkAmbiguity = "none";
      receipts.push(receipt("evidenceUnitId", row.evidenceUnitId, `${occurrenceRef}/evidenceUnitId`));
    } else if (candidates.length === 1) {
      linkMethod = "exact_label_match";
      linkedEvidenceOccurrenceRef = candidates[0]!.ref;
      requestedState = candidates[0]!.state;
      linkAmbiguity = "none";
    } else if (candidates.length === 0) {
      linkAmbiguity = "unresolved_zero_matches";
      linkMethod = "none";
      linkedEvidenceOccurrenceRef = null;
    } else {
      linkAmbiguity = "ambiguous_multiple_matches";
      linkMethod = "none";
      linkedEvidenceOccurrenceRef = null;
      // Do not pick a requestedState from conflicting candidates.
      requestedState = null;
    }

    const rec: ChaseRelationshipRecord = {
      requestId: typeof row.requestId === "string" ? row.requestId : null,
      occurrenceRef,
      chaseLabel: label || null,
      linkedEvidenceOccurrenceRef,
      candidateEvidenceOccurrenceRefs: candidateRefs,
      linkAmbiguity,
      linkMethod,
      requestedState,
      resolutionState: typeof row.resolutionState === "string" ? row.resolutionState : null,
      sendabilityLabel: typeof row.sendabilityLabel === "string" ? row.sendabilityLabel : null,
      copySuggestionPresent: typeof row.copySuggestion === "string" && row.copySuggestion.trim().length > 0,
      recordComplete: false,
    };
    rec.recordComplete = isChaseComplete(rec);
    records.push(rec);

    if (rec.chaseLabel) receipts.push(receipt("chaseLabel", rec.chaseLabel, `${occurrenceRef}/label`));
    if (candidateRefs.length) {
      receipts.push(
        receipt("candidateEvidenceOccurrenceRefs", candidateRefs, occurrenceRef, { derived: true }),
      );
    }
    if (rec.linkedEvidenceOccurrenceRef && rec.linkMethod === "exact_label_match") {
      receipts.push(
        receipt("linkedEvidenceOccurrenceRef", rec.linkedEvidenceOccurrenceRef, candidates[0]!.ref, {
          derived: true,
        }),
      );
    }
    if (rec.linkAmbiguity !== "none") {
      receipts.push(receipt("linkAmbiguity", rec.linkAmbiguity, occurrenceRef, { derived: true }));
    }
    if (rec.requestedState) {
      receipts.push(
        receipt(
          "requestedState",
          rec.requestedState,
          rec.linkMethod === "exact_label_match" ? `${candidates[0]!.ref}/inferredSourceState` : occurrenceRef,
          { derived: rec.linkMethod === "exact_label_match" },
        ),
      );
    }
    if (rec.sendabilityLabel) {
      receipts.push(receipt("sendabilityLabel", rec.sendabilityLabel, `${occurrenceRef}/sendabilityLabel`));
    }
  });

  const completeRecordCount = records.filter((r) => r.recordComplete).length;
  const incompleteRecordCount = records.length - completeRecordCount;
  const ambiguousRelationshipCount = records.filter(
    (r) => r.linkAmbiguity === "ambiguous_multiple_matches",
  ).length;
  const rollup = rollupCapability({
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount,
    emptyReason: "No chaseItems.",
    eligibleReason: `All ${records.length} chase relationship(s) complete (requestId+explicit evidenceUnitId+resolutionState).`,
    partialReason: `Aggregate incomplete: complete=${completeRecordCount}/${records.length}; ambiguous=${ambiguousRelationshipCount}. One complete chase row does not upgrade the adapter.`,
  });

  return {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapterId: "chase_relationships",
    caseId,
    capabilityStatus: rollup.capabilityStatus,
    opensTruth: false,
    invented: false,
    records,
    fieldReceipts: receipts,
    missingRequiredFields:
      rollup.capabilityStatus === "eligible"
        ? []
        : ["requestId", "evidenceUnitId link", "resolutionState"],
    blockers:
      rollup.capabilityStatus === "eligible"
        ? []
        : [
            "Not every applicable chase relationship is complete",
            "Exact-label links require exactly one evidence match; ambiguous/zero matches select no target",
          ],
    note: rollup.eligibilityReason,
    applicableRecordCount: records.length,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount,
    eligibilityReason: rollup.eligibilityReason,
  };
}

export function adaptExitSnapshots(
  caseId: string,
  output: Record<string, unknown>,
): Batch8AdapterResult<ExitSnapshotRecord> {
  const receipts: Batch8FieldReceipt[] = [];
  const records: ExitSnapshotRecord[] = [];
  const court = isObj(output.courtNote) ? output.courtNote : {};
  const exp = isObj(output.exportVersion) ? output.exportVersion : {};
  const exitBag = isObj(output.exitPayloadReceipts) ? output.exitPayloadReceipts : null;

  const byExit = new Map<ExitSnapshotRecord["exitId"], ExitSnapshotRecord>();

  const ensureExit = (exitId: ExitSnapshotRecord["exitId"]) => {
    if (byExit.has(exitId)) return byExit.get(exitId)!;
    const rec: ExitSnapshotRecord = {
      exitId,
      payloadIdentity: null,
      sendability: null,
      unavailableReason: `No /exitPayloadReceipts/${exitId} on packet`,
      realExitPayloadPresent: false,
      metadataOnly: false,
      capabilityStatus: "unavailable",
      evidencePointersPresent: [],
    };
    byExit.set(exitId, rec);
    return rec;
  };

  // Real payload bag — only path to per-exit eligible.
  if (exitBag) {
    for (const exitId of BATCH8_REQUIRED_EXIT_IDS) {
      const raw = exitBag[exitId];
      if (!isObj(raw) || typeof raw.payloadIdentity !== "string" || !raw.payloadIdentity.trim()) {
        continue;
      }
      const rec = ensureExit(exitId);
      rec.payloadIdentity = raw.payloadIdentity;
      rec.sendability = typeof raw.sendability === "string" ? raw.sendability : null;
      rec.unavailableReason = typeof raw.unavailableReason === "string" ? raw.unavailableReason : null;
      rec.realExitPayloadPresent = true;
      rec.metadataOnly = false;
      rec.capabilityStatus = "eligible";
      rec.evidencePointersPresent = [`/exitPayloadReceipts/${exitId}/payloadIdentity`];
      receipts.push(
        receipt(`${exitId}.payloadIdentity`, raw.payloadIdentity, `/exitPayloadReceipts/${exitId}/payloadIdentity`),
      );
    }
  }

  const attachMetadata = (
    exitId: "view" | "copy" | "export",
    pointers: Array<{ pointer: string; value: unknown }>,
    unavailableReason: string,
  ) => {
    const rec = ensureExit(exitId);
    if (rec.realExitPayloadPresent) return;
    const present = pointers.filter((p) => {
      const v = p.value;
      return v != null && !(typeof v === "string" && !v.trim());
    });
    rec.sendability =
      exitId === "export"
        ? typeof exp.sendability === "string"
          ? exp.sendability
          : null
        : typeof court.sendabilityLabel === "string"
          ? court.sendabilityLabel
          : null;
    rec.unavailableReason = unavailableReason;
    rec.realExitPayloadPresent = false;
    rec.metadataOnly = present.length > 0;
    // Metadata alone is not genuine exit exercise — keep per-exit unavailable (or partial only if we treat metadata as partial).
    // User: track independently; overall unavailable when none genuinely exercised.
    // Per-exit: metadata → partial (fields present but not real payload); no metadata → unavailable.
    rec.capabilityStatus = present.length ? "partial" : "unavailable";
    rec.evidencePointersPresent = present.map((p) => p.pointer);
    for (const p of present) {
      receipts.push(receipt(`${exitId}.metadata`, p.value, p.pointer));
    }
  };

  attachMetadata(
    "view",
    [
      { pointer: "/courtNote/text", value: court.text },
      { pointer: "/courtNote/sendabilityLabel", value: court.sendabilityLabel },
    ],
    "Real view payload receipt absent; courtNote metadata is not a view exit",
  );
  attachMetadata(
    "copy",
    [
      { pointer: "/courtNote/canCopy", value: court.canCopy },
      { pointer: "/courtNote/sendabilityLabel", value: court.sendabilityLabel },
      { pointer: "/courtNote/blockedReason", value: court.blockedReason },
    ],
    "Real copy payload receipt absent; canCopy metadata is not a copy exit",
  );
  attachMetadata(
    "export",
    [
      { pointer: "/exportVersion/exportId", value: exp.exportId },
      { pointer: "/exportVersion/sendability", value: exp.sendability },
      { pointer: "/exportVersion/reviewFooter", value: exp.reviewFooter },
    ],
    "Real export bytes/payload receipt absent; exportVersion metadata is not an export exit",
  );

  for (const exitId of BATCH8_REQUIRED_EXIT_IDS) {
    ensureExit(exitId);
  }

  records.push(...BATCH8_REQUIRED_EXIT_IDS.map((id) => byExit.get(id)!));

  const genuineCount = records.filter((r) => r.realExitPayloadPresent).length;
  const applicableRecordCount = BATCH8_REQUIRED_EXIT_IDS.length;
  const completeRecordCount = genuineCount;
  const incompleteRecordCount = applicableRecordCount - completeRecordCount;

  let capabilityStatus: "eligible" | "partial" | "unavailable";
  let eligibilityReason: string;
  if (genuineCount === 0) {
    capabilityStatus = "unavailable";
    eligibilityReason =
      "No exits genuinely exercised with payload receipts; metadata-only surfaces do not count.";
  } else if (genuineCount === applicableRecordCount) {
    capabilityStatus = "eligible";
    eligibilityReason = `All ${applicableRecordCount} required exits have genuine payload receipts.`;
  } else {
    capabilityStatus = "partial";
    eligibilityReason = `Only ${genuineCount}/${applicableRecordCount} exits genuinely exercised; one real exit does not make the adapter eligible.`;
  }

  return {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapterId: "exit_snapshots",
    caseId,
    capabilityStatus,
    opensTruth: false,
    invented: false,
    records,
    fieldReceipts: receipts,
    missingRequiredFields:
      capabilityStatus === "eligible"
        ? []
        : ["exitPayloadReceipts.*.payloadIdentity for view/copy/export/api/pdf/composed_prose/authenticated_browser"],
    blockers:
      capabilityStatus === "eligible"
        ? []
        : [
            "Complete required exit set not present",
            "courtNote/exportVersion metadata must not be treated as real exit payloads",
          ],
    note: eligibilityReason,
    applicableRecordCount,
    completeRecordCount,
    incompleteRecordCount,
    ambiguousRelationshipCount: 0,
    eligibilityReason,
  };
}

export function adaptAllBatch8(caseId: string, output: Record<string, unknown>) {
  return {
    charge_instruments: adaptChargeInstruments(caseId, output),
    evidence_units: adaptEvidenceUnits(caseId, output),
    chronology_events: adaptChronologyEvents(caseId, output),
    provenance: adaptProvenance(caseId, output),
    chase_relationships: adaptChaseRelationships(caseId, output),
    exit_snapshots: adaptExitSnapshots(caseId, output),
  };
}
