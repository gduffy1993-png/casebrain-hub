import { sanitizeReasoningFeedbackNote } from "./reasoning-feedback-sanitize";
import type {
  BuildReasoningFeedbackInput,
  ReasoningFeedbackRecord,
} from "./reasoning-feedback-types";
import { REASONING_FEEDBACK_SCHEMA_VERSION } from "./reasoning-feedback-types";

export function resolveReasoningFeedbackAppVersion(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  return REASONING_FEEDBACK_SCHEMA_VERSION;
}

export function buildReasoningFeedbackRecord(input: BuildReasoningFeedbackInput): ReasoningFeedbackRecord {
  const caseId = input.caseId.trim();
  if (!caseId) throw new Error("caseId required for feedback record");

  const routeLabel = input.routeLabel?.trim().slice(0, 240) || null;
  const note = sanitizeReasoningFeedbackNote(input.note);

  return {
    id: `${caseId}-${input.surface}-${Date.now()}`,
    caseId,
    surface: input.surface,
    feedbackOption: input.feedbackOption,
    note,
    routeLabel,
    humanReviewRequired: Boolean(input.humanReviewRequired),
    timestamp: input.timestamp ?? new Date().toISOString(),
    appVersion: input.appVersion ?? resolveReasoningFeedbackAppVersion(),
  };
}
