/** H3 chunk 3 — solicitor trust feedback on Today / Chase / Summary (metadata only). */

import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

export type TrustFeedbackTab = "today" | "chase" | "summary";

export type TrustFeedbackKind =
  | "wrong"
  | "unclear"
  | "unsafe"
  | "useful"
  | "missing_issue"
  | "bad_source";

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
};

export const TRUST_FEEDBACK_STORAGE_KEY = "casebrain:trustFeedback:v1";
export const TRUST_FEEDBACK_SCHEMA_VERSION = "trust-feedback-v1";
export const TRUST_FEEDBACK_NOTE_MAX_CHARS = 400;
export const TRUST_FEEDBACK_SNIPPET_MAX_CHARS = 280;
export const TRUST_FEEDBACK_CONTEXT_MAX_CHARS = 240;
