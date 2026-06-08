/** Supervisor sign-off persistence — safe metadata only. */

import type { SupervisorReviewStatus } from "./supervisor-qa-types";

export type SupervisorSignoffStatus = "pending" | "reviewed" | "escalated" | "no_issue";

export type SupervisorSignoffRecord = {
  id: string;
  caseId: string;
  status: SupervisorSignoffStatus;
  /** Render-only QA status captured at sign-off time. */
  qaStatus: SupervisorReviewStatus;
  reasonLabels: string[];
  readinessLevel: "green" | "amber" | "red" | null;
  humanReviewRequired: boolean;
  evidenceChangeStatus: string | null;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  appVersion: string;
};

export type BuildSupervisorSignoffInput = {
  caseId: string;
  status: SupervisorSignoffStatus;
  qaStatus: SupervisorReviewStatus;
  reasonLabels?: string[];
  readinessLevel?: "green" | "amber" | "red" | null;
  humanReviewRequired: boolean;
  evidenceChangeStatus?: string | null;
  note?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  appVersion?: string;
};

export const SUPERVISOR_SIGNOFF_STORAGE_KEY = "casebrain:supervisor:signoffs";
export const SUPERVISOR_SIGNOFF_SCHEMA_VERSION = "supervisor-signoff-v1";
export const SUPERVISOR_SIGNOFF_NOTE_MAX_CHARS = 400;
export const SUPERVISOR_SIGNOFF_MAX_REASON_LABELS = 12;
export const SUPERVISOR_SIGNOFF_REASON_LABEL_MAX_CHARS = 200;
