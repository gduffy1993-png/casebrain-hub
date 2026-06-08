/** Solicitor feedback on Reasoning V2 — local capture with optional DB persistence. */

export type ReasoningFeedbackSurface = "control-room-reasoning" | "war-room-reasoning";

export type ReasoningFeedbackOption =
  | "useful"
  | "missed_key_issue"
  | "too_vague"
  | "unsafe_overconfident"
  | "needs_solicitor_review"
  | "good_enough_hearing_prep";

export const REASONING_FEEDBACK_OPTIONS: ReadonlyArray<{
  value: ReasoningFeedbackOption;
  label: string;
}> = [
  { value: "useful", label: "Useful" },
  { value: "missed_key_issue", label: "Missed key issue" },
  { value: "too_vague", label: "Too vague" },
  { value: "unsafe_overconfident", label: "Unsafe / overconfident" },
  { value: "needs_solicitor_review", label: "Needs solicitor review" },
  { value: "good_enough_hearing_prep", label: "Good enough for hearing prep" },
] as const;

export type ReasoningFeedbackRecord = {
  id: string;
  caseId: string;
  surface: ReasoningFeedbackSurface;
  feedbackOption: ReasoningFeedbackOption;
  /** Optional solicitor note — sanitized; never bundle/evidence text. */
  note: string | null;
  routeLabel: string | null;
  humanReviewRequired: boolean;
  timestamp: string;
  /** App/build marker for slice 1 local capture. */
  appVersion: string;
};

export type BuildReasoningFeedbackInput = {
  caseId: string;
  surface: ReasoningFeedbackSurface;
  feedbackOption: ReasoningFeedbackOption;
  note?: string | null;
  routeLabel?: string | null;
  humanReviewRequired: boolean;
  timestamp?: string;
  appVersion?: string;
};

export const REASONING_FEEDBACK_STORAGE_KEY = "casebrain:reasoningV2:feedback";
export const REASONING_FEEDBACK_SCHEMA_VERSION = "reasoning-feedback-v1";
export const REASONING_FEEDBACK_NOTE_MAX_CHARS = 400;
