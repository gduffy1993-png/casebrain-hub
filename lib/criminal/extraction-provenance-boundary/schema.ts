/**
 * Phase 7 — extraction and provenance boundary (versioned).
 * Keep source excerpt, evidence title, status, explanation, and action separate.
 */

export const EXTRACTION_PROVENANCE_BOUNDARY_VERSION = "1.0.0" as const;

export type ExtractionBoundaryErrorCode =
  | "boundary.truncated_excerpt_as_title"
  | "boundary.incomplete_quotation"
  | "boundary.raw_extraction_syntax"
  | "boundary.fields_collapsed"
  | "boundary.alias_not_deduped"
  | "boundary.missing_evidence_id";

export type ExtractionProvenanceBlockV1 = {
  schemaVersion: typeof EXTRACTION_PROVENANCE_BOUNDARY_VERSION;
  /** Evidence title / subject — never a truncated source excerpt. */
  evidenceTitle: string | null;
  /** Evidence existence / status. */
  evidenceStatus: string | null;
  /** Verbatim source excerpt — complete or omitted; never used as title. */
  sourceExcerpt: string | null;
  /** Generated explanation (why it matters). */
  generatedExplanation: string | null;
  /** Requested action. */
  requestedAction: string | null;
  /** Canonical evidence id when known. */
  sourceEvidenceId: string | null;
};

export type ExtractionBoundaryRejection = {
  code: ExtractionBoundaryErrorCode;
  detail: string;
  field?: keyof ExtractionProvenanceBlockV1;
};

export type ExtractionBoundaryResult = {
  ok: boolean;
  block: ExtractionProvenanceBlockV1;
  rejections: ExtractionBoundaryRejection[];
  /** Labels after alias dedupe (display-safe). */
  dedupedDisplayLabels: string[];
};
