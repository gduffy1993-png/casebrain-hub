/**
 * Batch-8 structured adapter foundation — versioned schemas.
 * Packet-local only. Missing fields stay null. No fabricated IDs/pages.
 */

export const BATCH8_SCHEMA_VERSION = "maa-v2-stage150-batch8-structured-adapter@1.3.0" as const;
export const BATCH8_RECEIPT_SCHEMA = "maa-v2-stage150-batch8-field-receipt@1.0.0" as const;
export const BATCH8_CAPABILITY_SCHEMA = "maa-v2-stage150-batch8-capability@1.0.0" as const;
export const BATCH8_BASELINE = "e60790458f6c1030300c52c029e2318a28139252" as const;

export type Batch8AdapterId =
  | "charge_instruments"
  | "evidence_units"
  | "chronology_events"
  | "provenance"
  | "chase_relationships"
  | "exit_snapshots";

export const BATCH8_ADAPTER_IDS: readonly Batch8AdapterId[] = [
  "charge_instruments",
  "evidence_units",
  "chronology_events",
  "provenance",
  "chase_relationships",
  "exit_snapshots",
] as const;

export type Batch8CapabilityStatus = "eligible" | "partial" | "unavailable";

/** Exact source receipt for one populated field — never invent. */
export type Batch8FieldReceipt = {
  schemaVersion: typeof BATCH8_RECEIPT_SCHEMA;
  field: string;
  valueSummary: string;
  valueSha256: string;
  sourcePointer: string;
  sourceFile: "casebrain-output.json" | "bundle-text.md";
  derived: boolean;
  invented: false;
};

export type ChargeInstrumentRecord = {
  instrumentId: string | null;
  instrumentType: string | null;
  exactWording: string | null;
  count: number | null;
  defendantAllocation: string | null;
  sourceDocument: string | null;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  status: string | null;
  version: string | null;
  replacesInstrumentId: string | null;
  supersededByInstrumentId: string | null;
  occurrenceRef: string | null;
};

export type EvidenceUnitRecord = {
  /** Semantic evidence-unit ID — null unless explicitly present on packet. */
  evidenceUnitId: string | null;
  /** Packet JSON pointer occurrence — not a fabricated semantic ID. */
  occurrenceRef: string;
  evidenceTypeOrModality: string | null;
  modalityDerivation: "label_pattern" | "explicit_field" | "absent";
  subjectDefendantId: string | null;
  personId: string | null;
  existence: string | null;
  reliability: string | null;
  aliases: string[];
  /** Exact-label peer occurrence refs (not free-text similarity). */
  exactLabelPeerOccurrenceRefs: string[];
  draftFinalRelationship: "draft" | "final" | "unsigned" | null;
  extractFullRelationship: "extract" | "full" | null;
  sourceDocument: string | null;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  label: string | null;
};

export type ChronologyEventRecord = {
  eventId: string | null;
  eventType: string | null;
  timestamp: string | null;
  timezone: string | null;
  source: string | null;
  confidence: string | null;
  competingEventGroupId: string | null;
  occurrenceRef: string | null;
};

export type ProvenancePageClass =
  | "exact_source_page"
  | "compiled_page_only"
  | "document_only"
  | "honest_unknown_page"
  | "invalid_defaulted";

export type ProvenanceRecord = {
  occurrenceRef: string;
  sourceDocumentIdentity: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  limitationReason: string | null;
  evidenceAnchorRaw: string | null;
  /** Exact-page class — honest_unknown_page is schema-valid but not an exact-page prerequisite. */
  pageClass: ProvenancePageClass;
};

export type ChaseLinkageStatus = "linked" | "unresolved" | "unavailable" | "ambiguous";

export type ChaseRelationshipRecord = {
  requestId: string | null;
  occurrenceRef: string;
  chaseLabel: string | null;
  linkedEvidenceOccurrenceRef: string | null;
  /** All exact-label candidate evidence occurrence refs (never last-row wins). */
  candidateEvidenceOccurrenceRefs: string[];
  linkAmbiguity: "none" | "unresolved_zero_matches" | "ambiguous_multiple_matches";
  linkMethod: "exact_label_match" | "explicit_id" | "none";
  /** Linked-edge status — unresolved without evidenceUnitId is never "linked". */
  linkageStatus: ChaseLinkageStatus;
  requestedState: string | null;
  resolutionState: string | null;
  /** Explicit request type when present — never inferred from offence family. */
  requestType: string | null;
  /** Supported reason / source basis when present. */
  supportedReason: string | null;
  sourceBasis: string | null;
  /** Exit/surface ids carrying this chase relationship when present. */
  outputSurfaces: string[];
  sendabilityLabel: string | null;
  copySuggestionPresent: boolean;
  /**
   * Named-control linked-edge completeness only.
   * Honest unresolved (evidenceUnitId=null) is never recordComplete.
   */
  recordComplete: boolean;
  /** Schema-valid representation of known/unknown/unresolved state (≠ linked-edge complete). */
  schemaValidRepresentation: boolean;
};

export type EvidenceExclusionEntry = {
  originalPath: string;
  rowSha256: string;
  reasonExcluded: string;
  retainedProvenanceDestination: string;
};

export type ExitSnapshotRecord = {
  exitId: "view" | "copy" | "export" | "api" | "pdf" | "composed_prose" | "authenticated_browser";
  payloadIdentity: string | null;
  sendability: string | null;
  unavailableReason: string | null;
  /** True only when a real exit payload receipt exists — never from bare metadata. */
  realExitPayloadPresent: boolean;
  metadataOnly: boolean;
  /** Per-exit status — independent of overall adapter rollup. */
  capabilityStatus: Batch8CapabilityStatus;
  evidencePointersPresent: string[];
  /** Optional production payload metadata — never upgrades eligibility alone. */
  payloadSchemaVersion: string | null;
  captureRunId: string | null;
  surfaceList: string[];
  provenanceLimitationContent: string | null;
  generatedAt: string | null;
  /** True when genuine payload identity + schema/version + capture/run id present. */
  productionPayloadFieldsComplete: boolean;
};

/**
 * Genuine production exits required for exit_snapshots eligibility.
 * authenticated_browser is tracked separately and does not block eligibility.
 */
export const BATCH8_PRODUCTION_EXIT_IDS = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
] as const;

/** All tracked exits (production + authenticated_browser). */
export const BATCH8_REQUIRED_EXIT_IDS = [
  ...BATCH8_PRODUCTION_EXIT_IDS,
  "authenticated_browser",
] as const;

export type DualRepresentationStatus = {
  /** Packet honestly represents known / unknown / unresolved state. */
  schemaValidRepresentation: Batch8CapabilityStatus;
  schemaValidReason: string;
  /** Exact fields required by linked/named-control prerequisites are present. */
  namedControlPrerequisiteComplete: Batch8CapabilityStatus;
  namedPrerequisiteReason: string;
  note: "schemaValidRepresentation ≠ namedControlPrerequisiteComplete";
};

export type Batch8AdapterResult<T> = {
  schemaVersion: typeof BATCH8_SCHEMA_VERSION;
  adapterId: Batch8AdapterId;
  caseId: string;
  /**
   * Named-control prerequisite rollup (never schema-valid unresolved alone).
   * Prefer dualStatus for the separated meanings.
   */
  capabilityStatus: Batch8CapabilityStatus;
  opensTruth: false;
  invented: false;
  records: T[];
  fieldReceipts: Batch8FieldReceipt[];
  missingRequiredFields: string[];
  blockers: string[];
  note: string;
  /** Applicable structured records considered for this adapter. */
  applicableRecordCount: number;
  /** Records meeting the named-control completeness bar. */
  completeRecordCount: number;
  incompleteRecordCount: number;
  /** Ambiguous exact-label (or similar) relationships — no selected target. */
  ambiguousRelationshipCount: number;
  /** Why capabilityStatus was chosen (aggregate rule). */
  eligibilityReason: string;
  /** Separated meanings — schema-valid ≠ named-control complete. */
  dualStatus: DualRepresentationStatus;
  /** Evidence adapter: skipped page-only/meta rows with retention destination. */
  exclusionLedger?: EvidenceExclusionEntry[];
  /** Chase adapter relationship class counts. */
  chaseRelationshipCounts?: {
    linked: number;
    unresolved: number;
    unavailable: number;
    ambiguous: number;
  };
  /** Provenance adapter page-class counts. */
  provenancePageClassCounts?: Record<ProvenancePageClass, number>;
};
