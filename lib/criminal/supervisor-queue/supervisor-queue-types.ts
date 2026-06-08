/** Multi-case Supervisor Queue — read-only safe metadata (slice 1). */

export type SupervisorQueueBucket =
  | "review_required"
  | "escalated"
  | "hearing_soon_red"
  | "new_material"
  | "export_needs_review"
  | "feedback_concerns"
  | "reviewed";

export type SupervisorQueueFilter =
  | "all"
  | "escalated"
  | "red_readiness"
  | "new_material"
  | "exports_need_review"
  | "feedback_concerns"
  | "reviewed";

export type SupervisorQueueRow = {
  caseId: string;
  caseLabel: string;
  hearingDate: string | null;
  readinessLevel: "green" | "amber" | "red" | null;
  supervisorStatus: string | null;
  reviewReasonLabels: string[];
  materialChangeLabel: string | null;
  exportReviewStatus: string | null;
  unsafeFeedbackLabel: string | null;
  lastActivityAt: string;
  suggestedAction: string;
  buckets: SupervisorQueueBucket[];
  priority: number;
  openCaseHref: string | null;
};

export const SUPERVISOR_QUEUE_FILTER_BUCKETS: Record<
  Exclude<SupervisorQueueFilter, "all">,
  SupervisorQueueBucket
> = {
  escalated: "escalated",
  red_readiness: "hearing_soon_red",
  new_material: "new_material",
  exports_need_review: "export_needs_review",
  feedback_concerns: "feedback_concerns",
  reviewed: "reviewed",
};

export const CONCERN_FEEDBACK_OPTIONS = new Set([
  "missed_key_issue",
  "too_vague",
  "unsafe_overconfident",
  "needs_solicitor_review",
]);
