/** Supervisor QA View — slice 1 (per-case, render-only, no DB). */

export type SupervisorReviewStatus = "none" | "suggested" | "required";

export type SupervisorQAResult = {
  available: true;
  status: SupervisorReviewStatus;
  statusLabel: string;
  reasonsForReview: string[];
  topRisks: string[];
  missingCoreDisclosure: string[];
  contradictions: string[];
  doNotConcedePoints: string[];
  readinessStatus: string;
  evidenceChangeStatus: string;
  feedbackConcerns: string[];
  suggestedSupervisorAction: string;
  exportReminder: string;
};

export type SupervisorQAUnavailableReason = "no_reasoning";

export type SupervisorQAOutcome =
  | { available: false; reason: SupervisorQAUnavailableReason }
  | SupervisorQAResult;
