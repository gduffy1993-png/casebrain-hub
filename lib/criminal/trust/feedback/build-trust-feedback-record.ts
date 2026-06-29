import {
  sanitizeTrustFeedbackContextLabel,
  sanitizeTrustFeedbackNote,
  sanitizeTrustFeedbackSnippet,
} from "./trust-feedback-sanitize";
import { inferFeedbackSeverity } from "@/lib/criminal/feedback-console/infer-feedback-severity";
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
    section: input.section?.trim().slice(0, 120) || null,
    severity: input.severity ?? inferFeedbackSeverity(input.feedbackKind),
    exportId: input.exportId?.trim().slice(0, 80) || null,
    exportType: input.exportType?.trim().slice(0, 64) || null,
  };
}
