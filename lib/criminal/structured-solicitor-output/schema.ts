/**
 * Phase 5 — versioned structured solicitor output objects.
 * Replace legacy string concatenation; render only through this module.
 */

export const STRUCTURED_SOLICITOR_OUTPUT_VERSION = "1.0.0" as const;

/** Stable rule/error codes for every rejected field or sentence. */
export type StructuredComposerErrorCode =
  | "field.empty"
  | "field.raw_extraction_marker"
  | "field.unresolved_placeholder"
  | "field.truncated_fragment"
  | "field.malformed_punctuation"
  | "field.bullet_label_concat"
  | "field.contradictory_clause"
  | "field.incomplete_sentence"
  | "field.speculative_quotation"
  | "field.source_excerpt_as_heading"
  | "field.pipe_join_forbidden"
  | "field.partial_sentence"
  | "compose.no_usable_fields"
  | "compose.legacy_passthrough_rejected";

export type EvidenceExistenceState =
  | "served"
  | "referred_only"
  | "missing"
  | "incomplete"
  | "not_safely_confirmed"
  | "unknown";

/**
 * Structured solicitor output unit — one renderable block.
 * Never emit by joining arbitrary bullets with punctuation outside renderStructuredSolicitorOutput.
 */
export type StructuredSolicitorOutputV1 = {
  schemaVersion: typeof STRUCTURED_SOLICITOR_OUTPUT_VERSION;
  /** Short subject / evidence label (never a raw source quotation). */
  subject: string | null;
  /** Evidence / matter state for this block. */
  evidenceState: EvidenceExistenceState | null;
  /** Canonical evidence id when known. */
  sourceEvidenceId: string | null;
  /** Why the item matters (solicitor-facing). */
  whyItMatters: string | null;
  /** Requested action (chase / court / client). */
  requestedAction: string | null;
  /** Hearing or deadline state label. */
  hearingDeadlineState: string | null;
  /** Safety qualification / provisional wording. */
  safetyQualification: string | null;
  /** Optional verbatim quotation — must be complete; never completed speculatively. */
  sourceQuotation: string | null;
  /** Kind of surface this block feeds. */
  kind: "court_line" | "cps_chase" | "client_summary" | "overview_proof" | "letter" | "hearing_prep" | "generic";
};

export type StructuredFieldRejection = {
  field: keyof StructuredSolicitorOutputV1 | "rendered";
  code: StructuredComposerErrorCode;
  detail: string;
};

export type StructuredComposeResult = {
  ok: boolean;
  /** Rendered prose when ok (or partial when degraded). */
  text: string | null;
  output: StructuredSolicitorOutputV1 | null;
  rejections: StructuredFieldRejection[];
  /** How a legacy string was handled when migrating stock. */
  disposition?: "reconstructed" | "safely_omitted" | "still_blocked";
};
