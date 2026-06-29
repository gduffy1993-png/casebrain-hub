import { isBadOutputCandidateKind } from "./trust-feedback-sanitize";
import type { TrustFeedbackKind, TrustFeedbackRecord, TrustFeedbackTab } from "./trust-feedback-types";

export type TrustFeedbackSummary = {
  total: number;
  byKind: Partial<Record<TrustFeedbackKind, number>>;
  byTab: Partial<Record<TrustFeedbackTab, number>>;
  badOutputCandidates: number;
  latestAt: string | null;
};

export function summarizeTrustFeedback(records: TrustFeedbackRecord[]): TrustFeedbackSummary {
  const byKind: Partial<Record<TrustFeedbackKind, number>> = {};
  const byTab: Partial<Record<TrustFeedbackTab, number>> = {};

  let badOutputCandidates = 0;
  let latestAt: string | null = null;

  for (const record of records) {
    byKind[record.feedbackKind] = (byKind[record.feedbackKind] ?? 0) + 1;
    byTab[record.tab] = (byTab[record.tab] ?? 0) + 1;
    if (isBadOutputCandidateKind(record.feedbackKind)) badOutputCandidates += 1;
    if (!latestAt || record.timestamp > latestAt) latestAt = record.timestamp;
  }

  return {
    total: records.length,
    byKind,
    byTab,
    badOutputCandidates,
    latestAt,
  };
}

/** Records suitable for Bad Output Memory review queue — does not alter live output. */
export function filterBadOutputCandidateRecords(records: TrustFeedbackRecord[]): TrustFeedbackRecord[] {
  return records.filter((r) => isBadOutputCandidateKind(r.feedbackKind));
}
