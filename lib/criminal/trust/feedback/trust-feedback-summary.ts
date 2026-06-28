import { isBadOutputCandidateKind } from "./trust-feedback-sanitize";
import type { TrustFeedbackKind, TrustFeedbackRecord, TrustFeedbackTab } from "./trust-feedback-types";

export type TrustFeedbackSummary = {
  total: number;
  byKind: Record<TrustFeedbackKind, number>;
  byTab: Record<TrustFeedbackTab, number>;
  badOutputCandidates: number;
  latestAt: string | null;
};

export function summarizeTrustFeedback(records: TrustFeedbackRecord[]): TrustFeedbackSummary {
  const byKind = {
    wrong: 0,
    unclear: 0,
    unsafe: 0,
    useful: 0,
    missing_issue: 0,
    bad_source: 0,
  } satisfies Record<TrustFeedbackKind, number>;

  const byTab = {
    today: 0,
    chase: 0,
    summary: 0,
  } satisfies Record<TrustFeedbackTab, number>;

  let badOutputCandidates = 0;
  let latestAt: string | null = null;

  for (const record of records) {
    byKind[record.feedbackKind] += 1;
    byTab[record.tab] += 1;
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
