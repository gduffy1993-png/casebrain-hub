/**
 * MAA V2 Stage-150 Batch-10 — source-backed structured rematerialisation schemas.
 * Packet version: stage150-structured-case-packet@1.0.0
 * Never invent. Missing stays null/unavailable. ESA originals untouched.
 */

export const BATCH10_SCHEMA_VERSION = "maa-v2-stage150-batch10-structured-rematerialisation@1.0.0" as const;
export const BATCH10_PACKET_SCHEMA = "stage150-structured-case-packet@1.0.0" as const;
export const BATCH10_BASELINE = "78d16bb1a2606f7187f69fc8474e97629bce69ca" as const;
export const BATCH10_CANDIDATE_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-structured-candidates" as const;
export const BATCH10_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10" as const;

export const BATCH10_EXIT_IDS = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
  "authenticated_browser",
] as const;
export type Batch10ExitId = (typeof BATCH10_EXIT_IDS)[number];

export type Batch10IdDerivation = {
  algorithm: "sha256";
  of: string;
  note: string;
};

export type Batch10SourceDocument = {
  documentId: string;
  documentIdDerivation: Batch10IdDerivation;
  contentSha256: string | null;
  title: string | null;
  documentType: string | null;
  uploadOrder: number | null;
  sourcePageStart: string | null;
  sourcePageEnd: string | null;
  compiledPageStart: string | null;
  compiledPageEnd: string | null;
  pageIdentityKnown: boolean;
  limitationReason: string | null;
  sourcePointer: string;
};

export type Batch10ChargeInstrument = {
  instrumentId: string;
  instrumentIdDerivation: Batch10IdDerivation;
  instrumentType: string | null;
  exactWording: string | null;
  count: number | null;
  defendantAllocation: string | null;
  status: string | null;
  version: string | null;
  replacesInstrumentId: string | null;
  supersededByInstrumentId: string | null;
  sourceDocumentId: string | null;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  statementClassification: string | null;
  legalStateRole: string | null;
  sourcePointer: string;
};

export type Batch10EvidenceUnit = {
  evidenceUnitId: string;
  evidenceUnitIdDerivation: Batch10IdDerivation;
  label: string | null;
  subjectDefendantId: string | null;
  personId: string | null;
  existence: string | null;
  reliability: string | null;
  aliases: string[];
  extractFullRelationship: "extract" | "full" | null;
  stillClipMasterRelationship: "still" | "clip" | "master" | null;
  recordingTranscriptRelationship: "recording" | "transcript" | null;
  draftFinalRelationship: "draft" | "final" | "unsigned" | "signed" | null;
  ambiguity: "none" | "ambiguous_multiple_matches" | "unresolved_zero_matches";
  sourceDocumentId: string | null;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  sourcePointer: string;
};

export type Batch10ChronologyEvent = {
  eventId: string;
  eventIdDerivation: Batch10IdDerivation;
  eventType: string | null;
  timestamp: string | null;
  timezone: string | null;
  sourceDocumentId: string | null;
  sourcePointer: string;
  competingEventGroupId: string | null;
  confidence: string | null;
};

export type Batch10ProvenanceRow = {
  occurrenceRef: string;
  quotationExactText: string | null;
  quotedSpan: string | null;
  sourceDocumentId: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  limitationReason: string | null;
  sourcePointer: string;
};

export type Batch10ChaseRelationship = {
  requestId: string;
  requestIdDerivation: Batch10IdDerivation;
  chaseLabel: string | null;
  evidenceUnitId: string | null;
  linkMethod: "explicit_id" | "exact_label_match" | "none";
  resolutionState: string | null;
  duplicateOrAliasRelationship: string | null;
  ambiguity: "none" | "ambiguous_multiple_matches" | "unresolved_zero_matches";
  sourcePointer: string;
};

export type Batch10ExitPayloadReceipt = {
  exitId: Batch10ExitId;
  payloadIdentity: string | null;
  payloadPath: string | null;
  realPayloadPresent: boolean;
  sendability: string | null;
  unavailableReason: string | null;
  chargeWarningAttached: boolean | null;
  evidencePartialWarning: boolean | null;
  quarantineScope: "partial" | "total" | null;
  metadataOnly: boolean;
  sourcePointer: string | null;
};

export type Batch10AdapterCapability = "eligible" | "partial" | "unavailable";

export type Batch10StructuredCasePacket = {
  schemaVersion: typeof BATCH10_PACKET_SCHEMA;
  caseId: string;
  sourceLaneId: string;
  sourceCasePath: string;
  preservedOriginalHashes: {
    bundleTextSha256: string | null;
    casebrainOutputSha256: string | null;
    truthKeySha256: string | null;
    bundlePdfSha256: string | null;
    pdfExtractionMetaSha256: string | null;
    canonicalBundleSha256: string | null;
  };
  truthKeyIdentified: boolean;
  truthKeyContentsOpened: false;
  invented: false;
  sourceManifest: Batch10SourceDocument[];
  chargeInstruments: Batch10ChargeInstrument[];
  evidenceUnits: Batch10EvidenceUnit[];
  chronologyEvents: Batch10ChronologyEvent[];
  provenance: Batch10ProvenanceRow[];
  chaseRelationships: Batch10ChaseRelationship[];
  exitPayloadReceipts: Record<Batch10ExitId, Batch10ExitPayloadReceipt>;
  adapterCapability: {
    sourceManifest: Batch10AdapterCapability;
    chargeInstruments: Batch10AdapterCapability;
    evidenceUnits: Batch10AdapterCapability;
    chronologyEvents: Batch10AdapterCapability;
    provenance: Batch10AdapterCapability;
    chaseRelationships: Batch10AdapterCapability;
    exitPayloadReceipts: Batch10AdapterCapability;
  };
  acceptance: {
    accepted: boolean;
    reasons: string[];
  };
  materialisedAt: string;
  materialiserVersion: typeof BATCH10_SCHEMA_VERSION;
};

export type Batch10CorpusLaneId =
  | "esa_valid_499"
  | "esa_materialised_530_all_dirs"
  | "esa_demo_audit_pdf_backed"
  | "gold_manual_proof_set_v1"
  | "scale3000_messy_pdf_proof_v9"
  | "scale3000_solicitor_materialisation_runs"
  | "phase11_related_gold"
  | "malik_price_heavy_bundle"
  | "pdf_gold_manual_proof_packs"
  | "controlled_pilot_assets"
  | "demo_audit_thirty_surfaces"
  | "demo_audit_five_surfaces"
  | "stage150_deficit120_controlled";

export type Batch10CaseCapability = {
  caseId: string;
  laneId: Batch10CorpusLaneId;
  relativePath: string;
  hasSourceDocuments: boolean;
  hasDocumentHashes: boolean;
  hasDocumentPageUnits: boolean;
  hasCompiledAndSourcePageIdentity: boolean;
  hasChargeInstruments: boolean;
  hasDefendantCountAllocation: boolean;
  hasEvidenceUnitIdentities: boolean;
  hasChronologyEventsTimezone: boolean;
  hasChaseRequestRelationships: boolean;
  hasRealExitOutputs: Partial<Record<Batch10ExitId, boolean>>;
  truthKeyPresent: boolean;
  truthKeySha256: string | null;
  truthKeyContentsOpened: false;
  casebrainOutputPresent: boolean;
  casebrainOutputSha256: string | null;
  notes: string[];
};
