import {
  sanitizeSupervisorSignoffEvidenceStatus,
  sanitizeSupervisorSignoffLabels,
  sanitizeSupervisorSignoffNote,
} from "./supervisor-signoff-sanitize";
import type {
  BuildSupervisorSignoffInput,
  SupervisorSignoffRecord,
} from "./supervisor-signoff-types";
import { SUPERVISOR_SIGNOFF_SCHEMA_VERSION } from "./supervisor-signoff-types";

export function resolveSupervisorSignoffAppVersion(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  return SUPERVISOR_SIGNOFF_SCHEMA_VERSION;
}

export function buildSupervisorSignoffRecord(input: BuildSupervisorSignoffInput): SupervisorSignoffRecord {
  const caseId = input.caseId.trim();
  if (!caseId) throw new Error("caseId required for supervisor sign-off");

  const now = new Date().toISOString();
  const reviewedAt =
    input.status === "pending"
      ? input.reviewedAt ?? null
      : input.reviewedAt ?? now;

  return {
    id: `${caseId}-signoff-${Date.now()}`,
    caseId,
    status: input.status,
    qaStatus: input.qaStatus,
    reasonLabels: sanitizeSupervisorSignoffLabels(input.reasonLabels),
    readinessLevel: input.readinessLevel ?? null,
    humanReviewRequired: Boolean(input.humanReviewRequired),
    evidenceChangeStatus: sanitizeSupervisorSignoffEvidenceStatus(input.evidenceChangeStatus),
    note: sanitizeSupervisorSignoffNote(input.note),
    createdAt: input.createdAt ?? now,
    reviewedAt,
    appVersion: input.appVersion ?? resolveSupervisorSignoffAppVersion(),
  };
}
