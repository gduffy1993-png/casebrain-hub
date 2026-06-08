import {
  auditEventContainsForbiddenContent,
  sanitizeCaseReviewAuditLabel,
  sanitizeCaseReviewAuditMetadata,
} from "./case-review-audit-sanitize";
import type {
  CaseReviewAuditEventRecord,
  CaseReviewAuditEventType,
  CaseReviewAuditSourceSurface,
  WriteCaseReviewAuditEventInput,
} from "./case-review-audit-types";
import {
  CASE_REVIEW_AUDIT_EVENT_TYPES,
  CASE_REVIEW_AUDIT_SCHEMA_VERSION,
  CASE_REVIEW_AUDIT_SOURCE_SURFACES,
} from "./case-review-audit-types";

export function resolveCaseReviewAuditAppVersion(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  return CASE_REVIEW_AUDIT_SCHEMA_VERSION;
}

export function buildCaseReviewAuditEventRecord(
  input: WriteCaseReviewAuditEventInput,
): CaseReviewAuditEventRecord {
  const safeLabel = sanitizeCaseReviewAuditLabel(input.safeLabel);
  if (!safeLabel) throw new Error("Invalid audit safe label");

  if (!CASE_REVIEW_AUDIT_EVENT_TYPES.has(input.eventType)) {
    throw new Error("Invalid audit event type");
  }

  const sourceSurface =
    input.sourceSurface && CASE_REVIEW_AUDIT_SOURCE_SURFACES.has(input.sourceSurface)
      ? input.sourceSurface
      : null;

  const metadata = sanitizeCaseReviewAuditMetadata(input.metadata ?? {});
  const now = new Date().toISOString();

  return {
    id: `${input.caseId}-audit-${Date.now()}`,
    caseId: input.caseId.trim(),
    actorId: input.actorId.trim(),
    eventType: input.eventType,
    sourceSurface,
    safeLabel,
    relatedRecordId: input.relatedRecordId?.trim() || null,
    metadata,
    createdAt: input.createdAt ?? now,
    appVersion: input.appVersion ?? resolveCaseReviewAuditAppVersion(),
  };
}

export type CaseReviewAuditPostBody = {
  eventType?: unknown;
  sourceSurface?: unknown;
  safeLabel?: unknown;
  relatedRecordId?: unknown;
  metadata?: unknown;
  appVersion?: unknown;
  fullText?: unknown;
  exportBody?: unknown;
};

export function validateCaseReviewAuditPostBody(
  body: CaseReviewAuditPostBody,
  caseId: string,
): { ok: true; input: WriteCaseReviewAuditEventInput } | { ok: false; error: string } {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) return { ok: false, error: "caseId required" };

  if (body.fullText !== undefined || body.exportBody !== undefined) {
    return { ok: false, error: "Audit event must not include export or evidence bodies" };
  }

  const eventType = body.eventType;
  if (
    typeof eventType !== "string" ||
    !CASE_REVIEW_AUDIT_EVENT_TYPES.has(eventType as CaseReviewAuditEventType)
  ) {
    return { ok: false, error: "Invalid event type" };
  }

  if (body.sourceSurface !== undefined && body.sourceSurface !== null) {
    if (
      typeof body.sourceSurface !== "string" ||
      !CASE_REVIEW_AUDIT_SOURCE_SURFACES.has(body.sourceSurface as CaseReviewAuditSourceSurface)
    ) {
      return { ok: false, error: "Invalid source surface" };
    }
  }

  if (body.relatedRecordId !== undefined && body.relatedRecordId !== null) {
    if (typeof body.relatedRecordId !== "string" || !body.relatedRecordId.trim()) {
      return { ok: false, error: "relatedRecordId must be a string" };
    }
  }

  const rawLabel = typeof body.safeLabel === "string" ? body.safeLabel : "";
  if (!rawLabel.trim() || !sanitizeCaseReviewAuditLabel(rawLabel)) {
    return { ok: false, error: "safeLabel rejected — disallowed content" };
  }

  if (body.metadata !== undefined && body.metadata !== null) {
    const rawBlob = JSON.stringify(body.metadata);
    if (auditEventContainsForbiddenContent({ metadata: body.metadata, safeLabel: rawLabel })) {
      return { ok: false, error: "metadata rejected — forbidden content pattern" };
    }
    if (rawBlob.length > 4000) {
      return { ok: false, error: "metadata too large" };
    }
  }

  const input: WriteCaseReviewAuditEventInput = {
    caseId: trimmedCaseId,
    orgId: "",
    actorId: "",
    eventType: eventType as CaseReviewAuditEventType,
    sourceSurface:
      typeof body.sourceSurface === "string"
        ? (body.sourceSurface as CaseReviewAuditSourceSurface)
        : null,
    safeLabel: rawLabel,
    relatedRecordId: typeof body.relatedRecordId === "string" ? body.relatedRecordId : null,
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {},
    appVersion: typeof body.appVersion === "string" ? body.appVersion.slice(0, 64) : undefined,
  };

  const record = buildCaseReviewAuditEventRecord(input);
  if (auditEventContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    return { ok: false, error: "Audit event rejected — forbidden content pattern" };
  }

  return { ok: true, input };
}

export type CaseReviewAuditRow = {
  id: string;
  case_id: string;
  org_id: string;
  actor_id: string;
  event_type: CaseReviewAuditEventType;
  source_surface: CaseReviewAuditSourceSurface | null;
  safe_label: string;
  related_record_id: string | null;
  metadata: Record<string, unknown>;
  app_version: string | null;
  created_at: string;
};

export function mapCaseReviewAuditRowToRecord(row: CaseReviewAuditRow): CaseReviewAuditEventRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    actorId: row.actor_id,
    eventType: row.event_type,
    sourceSurface: row.source_surface,
    safeLabel: row.safe_label,
    relatedRecordId: row.related_record_id,
    metadata: sanitizeCaseReviewAuditMetadata(row.metadata ?? {}),
    createdAt: row.created_at,
    appVersion: row.app_version ?? CASE_REVIEW_AUDIT_SCHEMA_VERSION,
  };
}

export function recordToAuditInsertPayload(
  record: CaseReviewAuditEventRecord,
  caseId: string,
  orgId: string,
  actorId: string,
) {
  return {
    case_id: caseId,
    org_id: orgId,
    actor_id: actorId,
    event_type: record.eventType,
    source_surface: record.sourceSurface,
    safe_label: record.safeLabel,
    related_record_id: record.relatedRecordId,
    metadata: record.metadata,
    app_version: record.appVersion,
    created_at: record.createdAt,
  };
}
