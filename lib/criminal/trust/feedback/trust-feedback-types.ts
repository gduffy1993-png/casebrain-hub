/** H3/H5 — solicitor trust feedback (metadata only; does not alter live output). */

import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

export type TrustFeedbackTab =
  | "today"
  | "chase"
  | "summary"
  | "five_answers"
  | "hearing_mode"
  | "export_pack"
  | "evidence_trace"
  | "decision_board"
  | "advice_change_radar";

export type TrustFeedbackKind =
  | "wrong"
  | "unclear"
  | "unsafe"
  | "useful"
  | "missing_issue"
  | "bad_source"
  | "missing_evidence"
  | "overstated"
  | "needs_rewrite"
  | "good_for_court"
  | "good_for_cps_chase"
  | "good_for_client_explanation";

export type TrustFeedbackSeverity = "polish" | "warning" | "blocking";

export const TRUST_FEEDBACK_KINDS: ReadonlyArray<{ value: TrustFeedbackKind; label: string }> = [
  { value: "wrong", label: "Wrong" },
  { value: "unclear", label: "Unclear" },
  { value: "unsafe", label: "Unsafe" },
  { value: "useful", label: "Useful" },
  { value: "missing_issue", label: "Missing issue" },
  { value: "bad_source", label: "Bad source" },
] as const;

/** Kinds that may feed Bad Output Memory later — does not alter live output. */
export const BAD_OUTPUT_CANDIDATE_KINDS: ReadonlySet<TrustFeedbackKind> = new Set([
  "wrong",
  "unsafe",
  "bad_source",
  "missing_issue",
  "missing_evidence",
  "overstated",
  "needs_rewrite",
]);

export type TrustFeedbackRecord = {
  id: string;
  caseId: string;
  tab: TrustFeedbackTab;
  feedbackKind: TrustFeedbackKind;
  /** Short description of the line/section — sanitized; never full bundle text. */
  lineSnippet: string | null;
  contextLabel: string | null;
  sourceState: SourceStateKind | null;
  sendability: SendabilityLevel | null;
  note: string | null;
  timestamp: string;
  outputVersion: string;
  section: string | null;
  severity: TrustFeedbackSeverity | null;
  exportId: string | null;
  exportType: string | null;
};

export type BuildTrustFeedbackInput = {
  caseId: string;
  tab: TrustFeedbackTab;
  feedbackKind: TrustFeedbackKind;
  lineSnippet?: string | null;
  contextLabel?: string | null;
  sourceState?: SourceStateKind | null;
  sendability?: SendabilityLevel | null;
  note?: string | null;
  timestamp?: string;
  outputVersion?: string;
  section?: string | null;
  severity?: TrustFeedbackSeverity | null;
  exportId?: string | null;
  exportType?: string | null;
};

export const TRUST_FEEDBACK_STORAGE_KEY = "casebrain:trustFeedback:v1";
export const TRUST_FEEDBACK_SCHEMA_VERSION = "trust-feedback-v2";
export const TRUST_FEEDBACK_NOTE_MAX_CHARS = 400;
export const TRUST_FEEDBACK_SNIPPET_MAX_CHARS = 280;
export const TRUST_FEEDBACK_CONTEXT_MAX_CHARS = 240;
