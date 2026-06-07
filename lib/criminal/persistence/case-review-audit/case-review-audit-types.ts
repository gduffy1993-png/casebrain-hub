/** Case review audit events — safe metadata only. */

export const CASE_REVIEW_AUDIT_SCHEMA_VERSION = "case-review-audit-v1";

export type CaseReviewAuditEventType =
  | "reasoning_feedback_saved"
  | "supervisor_signoff_saved"
  | "evidence_snapshot_saved"
  | "export_review_saved"
  | "export_generated"
  | "export_copied"
  | "export_marked_reviewed"
  | "export_marked_needs_review"
  | "material_change_reviewed"
  | "supervisor_escalated"
  | "supervisor_marked_reviewed";

export type CaseReviewAuditSourceSurface =
  | "control_room"
  | "war_room"
  | "reasoning_v2"
  | "evidence_change_detector"
  | "supervisor_qa"
  | "solicitor_export_builder"
  | "client_explanation";

export const CASE_REVIEW_AUDIT_EVENT_TYPES: ReadonlySet<CaseReviewAuditEventType> = new Set([
  "reasoning_feedback_saved",
  "supervisor_signoff_saved",
  "evidence_snapshot_saved",
  "export_review_saved",
  "export_generated",
  "export_copied",
  "export_marked_reviewed",
  "export_marked_needs_review",
  "material_change_reviewed",
  "supervisor_escalated",
  "supervisor_marked_reviewed",
]);

export const CASE_REVIEW_AUDIT_SOURCE_SURFACES: ReadonlySet<CaseReviewAuditSourceSurface> =
  new Set([
    "control_room",
    "war_room",
    "reasoning_v2",
    "evidence_change_detector",
    "supervisor_qa",
    "solicitor_export_builder",
    "client_explanation",
  ]);

export type CaseReviewAuditEventRecord = {
  id: string;
  caseId: string;
  actorId: string;
  eventType: CaseReviewAuditEventType;
  sourceSurface: CaseReviewAuditSourceSurface | null;
  safeLabel: string;
  relatedRecordId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  appVersion: string;
};

export type WriteCaseReviewAuditEventInput = {
  caseId: string;
  orgId: string;
  actorId: string;
  eventType: CaseReviewAuditEventType;
  sourceSurface?: CaseReviewAuditSourceSurface | null;
  safeLabel: string;
  relatedRecordId?: string | null;
  metadata?: Record<string, unknown>;
  appVersion?: string | null;
  createdAt?: string;
};
