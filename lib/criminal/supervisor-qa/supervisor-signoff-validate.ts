import { buildSupervisorSignoffRecord } from "./build-supervisor-signoff-record";
import {
  signoffRecordContainsForbiddenContent,
  sanitizeSupervisorSignoffEvidenceStatus,
  sanitizeSupervisorSignoffLabels,
  sanitizeSupervisorSignoffNote,
} from "./supervisor-signoff-sanitize";
import type {
  BuildSupervisorSignoffInput,
  SupervisorSignoffRecord,
  SupervisorSignoffStatus,
} from "./supervisor-signoff-types";
import type { SupervisorReviewStatus } from "./supervisor-qa-types";

const STATUSES: ReadonlySet<SupervisorSignoffStatus> = new Set([
  "pending",
  "reviewed",
  "escalated",
  "no_issue",
]);

const QA_STATUSES: ReadonlySet<SupervisorReviewStatus> = new Set(["none", "suggested", "required"]);

const READINESS_LEVELS = new Set(["green", "amber", "red"]);

export type SupervisorSignoffPostBody = {
  status?: unknown;
  qaStatus?: unknown;
  reasonLabels?: unknown;
  readinessLevel?: unknown;
  humanReviewRequired?: unknown;
  evidenceChangeStatus?: unknown;
  note?: unknown;
  reviewedAt?: unknown;
  appVersion?: unknown;
};

export function validateSupervisorSignoffPostBody(
  body: SupervisorSignoffPostBody,
  caseId: string,
): { ok: true; input: BuildSupervisorSignoffInput } | { ok: false; error: string } {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) return { ok: false, error: "caseId required" };

  const status = body.status;
  if (typeof status !== "string" || !STATUSES.has(status as SupervisorSignoffStatus)) {
    return { ok: false, error: "Invalid sign-off status" };
  }

  const qaStatus = body.qaStatus;
  if (typeof qaStatus !== "string" || !QA_STATUSES.has(qaStatus as SupervisorReviewStatus)) {
    return { ok: false, error: "Invalid QA status" };
  }

  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return { ok: false, error: "note must be a string" };
  }

  if (body.reasonLabels !== undefined && body.reasonLabels !== null && !Array.isArray(body.reasonLabels)) {
    return { ok: false, error: "reasonLabels must be an array" };
  }

  let readinessLevel: "green" | "amber" | "red" | null = null;
  if (body.readinessLevel !== undefined && body.readinessLevel !== null) {
    if (typeof body.readinessLevel !== "string" || !READINESS_LEVELS.has(body.readinessLevel)) {
      return { ok: false, error: "Invalid readiness level" };
    }
    readinessLevel = body.readinessLevel as "green" | "amber" | "red";
  }

  const rawLabels = Array.isArray(body.reasonLabels)
    ? body.reasonLabels.filter((l): l is string => typeof l === "string")
    : [];

  if (rawLabels.some((l) => l.trim() && sanitizeSupervisorSignoffLabels([l]).length === 0)) {
    return { ok: false, error: "Reason label rejected — disallowed content" };
  }

  const note = sanitizeSupervisorSignoffNote(typeof body.note === "string" ? body.note : null);
  if (typeof body.note === "string" && body.note.trim() && note === null) {
    return { ok: false, error: "Note rejected — disallowed content" };
  }

  const evidenceChangeStatus = sanitizeSupervisorSignoffEvidenceStatus(
    typeof body.evidenceChangeStatus === "string" ? body.evidenceChangeStatus : null,
  );
  if (
    typeof body.evidenceChangeStatus === "string" &&
    body.evidenceChangeStatus.trim() &&
    evidenceChangeStatus === null
  ) {
    return { ok: false, error: "Evidence change status rejected — disallowed content" };
  }

  const input: BuildSupervisorSignoffInput = {
    caseId: trimmedCaseId,
    status: status as SupervisorSignoffStatus,
    qaStatus: qaStatus as SupervisorReviewStatus,
    reasonLabels: sanitizeSupervisorSignoffLabels(rawLabels),
    readinessLevel,
    humanReviewRequired: Boolean(body.humanReviewRequired),
    evidenceChangeStatus,
    note,
    reviewedAt: typeof body.reviewedAt === "string" ? body.reviewedAt : undefined,
    appVersion: typeof body.appVersion === "string" ? body.appVersion.slice(0, 64) : undefined,
  };

  const record = buildSupervisorSignoffRecord(input);
  if (signoffRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    return { ok: false, error: "Sign-off rejected — forbidden content pattern" };
  }

  return { ok: true, input };
}

export type SupervisorSignoffRow = {
  id: string;
  case_id: string;
  org_id: string;
  reviewer_id: string;
  status: SupervisorSignoffStatus;
  qa_status: SupervisorReviewStatus;
  reason_labels: string[];
  readiness_level: string | null;
  human_review_required: boolean;
  evidence_change_status: string | null;
  note: string | null;
  app_version: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export function mapSupervisorSignoffRowToRecord(row: SupervisorSignoffRow): SupervisorSignoffRecord {
  const readiness =
    row.readiness_level === "green" ||
    row.readiness_level === "amber" ||
    row.readiness_level === "red"
      ? row.readiness_level
      : null;

  return {
    id: row.id,
    caseId: row.case_id,
    status: row.status,
    qaStatus: row.qa_status,
    reasonLabels: Array.isArray(row.reason_labels) ? row.reason_labels : [],
    readinessLevel: readiness,
    humanReviewRequired: row.human_review_required,
    evidenceChangeStatus: row.evidence_change_status,
    note: row.note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    appVersion: row.app_version ?? "unknown",
  };
}
