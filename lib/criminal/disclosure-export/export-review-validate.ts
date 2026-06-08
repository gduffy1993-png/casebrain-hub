import {
  exportReviewRecordContainsForbiddenContent,
  sanitizeExportReviewNote,
  sanitizeExportReviewRouteLabel,
  isValidExportHash,
} from "./export-review-sanitize";
import type {
  BuildExportReviewInput,
  ExportReviewRecord,
  ExportReviewStatus,
  ExportReviewType,
} from "./export-review-types";
import {
  EXPORT_REVIEW_SCHEMA_VERSION,
  EXPORT_REVIEW_STATUSES,
  EXPORT_REVIEW_TYPES,
} from "./export-review-types";

export function resolveExportReviewAppVersion(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  return EXPORT_REVIEW_SCHEMA_VERSION;
}

export function buildExportReviewRecord(input: BuildExportReviewInput): ExportReviewRecord {
  const caseId = input.caseId.trim();
  if (!caseId) throw new Error("caseId required for export review");
  if (!EXPORT_REVIEW_TYPES.has(input.exportType)) {
    throw new Error("Invalid export type");
  }
  if (!EXPORT_REVIEW_STATUSES.has(input.reviewStatus)) {
    throw new Error("Invalid review status");
  }

  const now = new Date().toISOString();
  const reviewedAt =
    input.reviewStatus === "reviewed" || input.reviewStatus === "needs_review"
      ? input.reviewedAt ?? now
      : input.reviewedAt ?? null;

  const exportHash =
    input.exportHash && isValidExportHash(input.exportHash) ? input.exportHash.toLowerCase() : null;

  return {
    id: `${caseId}-export-${input.exportType}-${Date.now()}`,
    caseId,
    exportType: input.exportType,
    reviewStatus: input.reviewStatus,
    routeLabel: sanitizeExportReviewRouteLabel(input.routeLabel),
    readinessLevel: input.readinessLevel ?? null,
    humanReviewRequired: Boolean(input.humanReviewRequired),
    solicitorReviewRequired: input.solicitorReviewRequired !== false,
    exportHash,
    note: sanitizeExportReviewNote(input.note),
    createdAt: input.createdAt ?? now,
    reviewedAt,
    appVersion: input.appVersion ?? resolveExportReviewAppVersion(),
  };
}

export type ExportReviewPostBody = {
  exportType?: unknown;
  reviewStatus?: unknown;
  routeLabel?: unknown;
  readinessLevel?: unknown;
  humanReviewRequired?: unknown;
  solicitorReviewRequired?: unknown;
  exportHash?: unknown;
  note?: unknown;
  reviewedAt?: unknown;
  appVersion?: unknown;
  fullText?: unknown;
  exportBody?: unknown;
};

const READINESS_LEVELS = new Set(["green", "amber", "red"]);

export function validateExportReviewPostBody(
  body: ExportReviewPostBody,
  caseId: string,
): { ok: true; input: BuildExportReviewInput } | { ok: false; error: string } {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) return { ok: false, error: "caseId required" };

  if (body.fullText !== undefined || body.exportBody !== undefined) {
    return { ok: false, error: "Export body must not be sent — metadata only" };
  }

  const exportType = body.exportType;
  if (typeof exportType !== "string" || !EXPORT_REVIEW_TYPES.has(exportType as ExportReviewType)) {
    return { ok: false, error: "Invalid export type" };
  }

  const reviewStatus = body.reviewStatus;
  if (
    typeof reviewStatus !== "string" ||
    !EXPORT_REVIEW_STATUSES.has(reviewStatus as ExportReviewStatus)
  ) {
    return { ok: false, error: "Invalid review status" };
  }

  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return { ok: false, error: "note must be a string" };
  }

  if (body.routeLabel !== undefined && body.routeLabel !== null && typeof body.routeLabel !== "string") {
    return { ok: false, error: "routeLabel must be a string" };
  }

  let readinessLevel: "green" | "amber" | "red" | null = null;
  if (body.readinessLevel !== undefined && body.readinessLevel !== null) {
    if (typeof body.readinessLevel !== "string" || !READINESS_LEVELS.has(body.readinessLevel)) {
      return { ok: false, error: "Invalid readiness level" };
    }
    readinessLevel = body.readinessLevel as "green" | "amber" | "red";
  }

  if (body.exportHash !== undefined && body.exportHash !== null) {
    if (typeof body.exportHash !== "string" || !isValidExportHash(body.exportHash)) {
      return { ok: false, error: "Invalid export hash" };
    }
  }

  const rawRoute =
    typeof body.routeLabel === "string" ? body.routeLabel : null;
  if (rawRoute?.trim() && !sanitizeExportReviewRouteLabel(rawRoute)) {
    return { ok: false, error: "routeLabel rejected — disallowed content" };
  }

  const rawNote = typeof body.note === "string" ? body.note : null;
  if (rawNote?.trim() && !sanitizeExportReviewNote(rawNote)) {
    return { ok: false, error: "note rejected — disallowed content" };
  }

  const input: BuildExportReviewInput = {
    caseId: trimmedCaseId,
    exportType: exportType as ExportReviewType,
    reviewStatus: reviewStatus as ExportReviewStatus,
    routeLabel: rawRoute,
    readinessLevel,
    humanReviewRequired: Boolean(body.humanReviewRequired),
    solicitorReviewRequired: body.solicitorReviewRequired !== false,
    exportHash: typeof body.exportHash === "string" ? body.exportHash : null,
    note: rawNote,
    reviewedAt: typeof body.reviewedAt === "string" ? body.reviewedAt : undefined,
    appVersion: typeof body.appVersion === "string" ? body.appVersion.slice(0, 64) : undefined,
  };

  const record = buildExportReviewRecord(input);
  if (exportReviewRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    return { ok: false, error: "Export review rejected — forbidden content pattern" };
  }

  return { ok: true, input };
}

export type ExportReviewRow = {
  id: string;
  case_id: string;
  org_id: string;
  user_id: string;
  export_type: ExportReviewType;
  review_status: ExportReviewStatus;
  route_label: string | null;
  readiness_level: "green" | "amber" | "red" | null;
  human_review_required: boolean;
  solicitor_review_required: boolean;
  export_hash: string | null;
  note: string | null;
  app_version: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export function mapExportReviewRowToRecord(row: ExportReviewRow): ExportReviewRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    exportType: row.export_type,
    reviewStatus: row.review_status,
    routeLabel: row.route_label,
    readinessLevel: row.readiness_level,
    humanReviewRequired: row.human_review_required,
    solicitorReviewRequired: row.solicitor_review_required,
    exportHash: row.export_hash,
    note: row.note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    appVersion: row.app_version ?? EXPORT_REVIEW_SCHEMA_VERSION,
  };
}

export function recordToInsertPayload(
  record: ExportReviewRecord,
  caseId: string,
  orgId: string,
  userId: string,
) {
  return {
    case_id: caseId,
    org_id: orgId,
    user_id: userId,
    export_type: record.exportType,
    review_status: record.reviewStatus,
    route_label: record.routeLabel,
    readiness_level: record.readinessLevel,
    human_review_required: record.humanReviewRequired,
    solicitor_review_required: record.solicitorReviewRequired,
    export_hash: record.exportHash,
    note: record.note,
    app_version: record.appVersion,
    created_at: record.createdAt,
    reviewed_at: record.reviewedAt,
  };
}
