import type {
  ReasoningFeedbackOption,
  ReasoningFeedbackRecord,
  ReasoningFeedbackSurface,
} from "./reasoning-feedback-types";
import { REASONING_FEEDBACK_OPTIONS } from "./reasoning-feedback-types";

export type ReasoningFeedbackSummary = {
  total: number;
  byOption: Record<ReasoningFeedbackOption, number>;
  bySurface: Record<ReasoningFeedbackSurface, number>;
  unsafeOrVagueCount: number;
  casesNeedingReview: string[];
  surfacesWithMostConcerns: Array<{ surface: ReasoningFeedbackSurface; count: number }>;
};

function emptyByOption(): Record<ReasoningFeedbackOption, number> {
  return Object.fromEntries(REASONING_FEEDBACK_OPTIONS.map((o) => [o.value, 0])) as Record<
    ReasoningFeedbackOption,
    number
  >;
}

export function summarizeReasoningFeedback(records: ReasoningFeedbackRecord[]): ReasoningFeedbackSummary {
  const byOption = emptyByOption();
  const bySurface: Record<ReasoningFeedbackSurface, number> = {
    "control-room-reasoning": 0,
    "war-room-reasoning": 0,
  };
  const reviewCaseIds = new Set<string>();

  for (const r of records) {
    byOption[r.feedbackOption] = (byOption[r.feedbackOption] ?? 0) + 1;
    bySurface[r.surface] = (bySurface[r.surface] ?? 0) + 1;
    if (
      r.feedbackOption === "unsafe_overconfident" ||
      r.feedbackOption === "too_vague" ||
      r.feedbackOption === "needs_solicitor_review" ||
      r.feedbackOption === "missed_key_issue"
    ) {
      reviewCaseIds.add(r.caseId);
    }
  }

  const unsafeOrVagueCount =
    (byOption.unsafe_overconfident ?? 0) + (byOption.too_vague ?? 0);

  const surfacesWithMostConcerns = (
    Object.entries(bySurface) as Array<[ReasoningFeedbackSurface, number]>
  )
    .map(([surface, count]) => ({ surface, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: records.length,
    byOption,
    bySurface,
    unsafeOrVagueCount,
    casesNeedingReview: [...reviewCaseIds].sort(),
    surfacesWithMostConcerns,
  };
}
