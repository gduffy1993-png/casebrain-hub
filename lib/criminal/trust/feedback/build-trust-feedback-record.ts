import {
  sanitizeTrustFeedbackContextLabel,
  sanitizeTrustFeedbackNote,
  sanitizeTrustFeedbackSnippet,
} from "./trust-feedback-sanitize";
import type { BuildTrustFeedbackInput, TrustFeedbackRecord } from "./trust-feedback-types";
import { TRUST_FEEDBACK_SCHEMA_VERSION } from "./trust-feedback-types";

export function resolveTrustFeedbackOutputVersion(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  return TRUST_FEEDBACK_SCHEMA_VERSION;
}

export function buildTrustFeedbackRecord(input: BuildTrustFeedbackInput): TrustFeedbackRecord {
  const caseId = input.caseId.trim();
  if (!caseId) throw new Error("caseId required for trust feedback record");

  return {
    id: `${caseId}-${input.tab}-${Date.now()}`,
    caseId,
    tab: input.tab,
    feedbackKind: input.feedbackKind,
    lineSnippet: sanitizeTrustFeedbackSnippet(input.lineSnippet),
    contextLabel: sanitizeTrustFeedbackContextLabel(input.contextLabel),
    sourceState: input.sourceState ?? null,
    sendability: input.sendability ?? null,
    note: sanitizeTrustFeedbackNote(input.note),
    timestamp: input.timestamp ?? new Date().toISOString(),
    outputVersion: input.outputVersion ?? resolveTrustFeedbackOutputVersion(),
  };
}
