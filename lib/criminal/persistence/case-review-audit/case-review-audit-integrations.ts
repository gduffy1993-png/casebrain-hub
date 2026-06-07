import type { ExportReviewRecord } from "@/lib/criminal/disclosure-export/export-review-types";
import type { EvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import type { ReasoningFeedbackRecord } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";
import type { SupervisorSignoffRecord } from "@/lib/criminal/supervisor-qa/supervisor-signoff-types";
import type {
  CaseReviewAuditEventType,
  CaseReviewAuditSourceSurface,
  WriteCaseReviewAuditEventInput,
} from "./case-review-audit-types";

type AuditContext = {
  caseId: string;
  orgId: string;
  actorId: string;
  relatedRecordId?: string | null;
};

function baseInput(
  ctx: AuditContext,
  eventType: CaseReviewAuditEventType,
  sourceSurface: CaseReviewAuditSourceSurface | null,
  safeLabel: string,
  metadata: Record<string, unknown> = {},
): WriteCaseReviewAuditEventInput {
  return {
    caseId: ctx.caseId,
    orgId: ctx.orgId,
    actorId: ctx.actorId,
    eventType,
    sourceSurface,
    safeLabel,
    relatedRecordId: ctx.relatedRecordId ?? null,
    metadata,
    appVersion: undefined,
  };
}

function mapReasoningSurface(surface: string): CaseReviewAuditSourceSurface {
  if (surface === "war-room-reasoning") return "war_room";
  return "control_room";
}

export function auditInputFromReasoningFeedback(
  ctx: AuditContext,
  record: ReasoningFeedbackRecord,
): WriteCaseReviewAuditEventInput {
  const label =
    record.routeLabel?.trim() ||
    `Reasoning feedback — ${record.feedbackOption.replace(/_/g, " ")}`;
  return baseInput(
    ctx,
    "reasoning_feedback_saved",
    mapReasoningSurface(record.surface),
    label.slice(0, 280),
    {
      feedback_option: record.feedbackOption,
      human_review_required: record.humanReviewRequired,
    },
  );
}

export function auditInputFromSupervisorSignoff(
  ctx: AuditContext,
  record: SupervisorSignoffRecord,
): WriteCaseReviewAuditEventInput {
  let eventType: CaseReviewAuditEventType = "supervisor_signoff_saved";
  if (record.status === "escalated") eventType = "supervisor_escalated";
  else if (record.status === "reviewed" || record.status === "no_issue") {
    eventType = "supervisor_marked_reviewed";
  }

  const label =
    record.reasonLabels[0]?.trim() ||
    `Supervisor sign-off — ${record.status.replace(/_/g, " ")}`;

  return baseInput(ctx, eventType, "supervisor_qa", label.slice(0, 280), {
    status: record.status,
    qa_status: record.qaStatus,
    readiness_level: record.readinessLevel,
    human_review_required: record.humanReviewRequired,
  });
}

export function auditInputFromEvidenceSnapshot(
  ctx: AuditContext,
  snapshot: EvidenceChangeSnapshot,
): WriteCaseReviewAuditEventInput {
  const label = snapshot.routeLabel?.trim() || "Evidence snapshot saved for review";
  const metadata: Record<string, unknown> = {
    readiness_level: snapshot.readinessLevel,
    human_review_required: snapshot.humanReviewRequired,
  };
  if (snapshot.sourceState) {
    metadata.document_count = snapshot.sourceState.documentCount;
    metadata.source_material_changed = false;
  }

  return baseInput(
    ctx,
    "evidence_snapshot_saved",
    "evidence_change_detector",
    label.slice(0, 280),
    metadata,
  );
}

function exportReviewEventType(reviewStatus: string): CaseReviewAuditEventType {
  switch (reviewStatus) {
    case "generated":
      return "export_generated";
    case "copied":
      return "export_copied";
    case "reviewed":
      return "export_marked_reviewed";
    case "needs_review":
      return "export_marked_needs_review";
    default:
      return "export_review_saved";
  }
}

function exportReviewSurface(exportType: string): CaseReviewAuditSourceSurface {
  if (exportType === "client_explanation") return "client_explanation";
  return "solicitor_export_builder";
}

export function auditInputFromExportReview(
  ctx: AuditContext,
  record: ExportReviewRecord,
): WriteCaseReviewAuditEventInput {
  const label =
    record.routeLabel?.trim() ||
    `Export ${record.exportType.replace(/_/g, " ")} — ${record.reviewStatus.replace(/_/g, " ")}`;

  return baseInput(
    ctx,
    exportReviewEventType(record.reviewStatus),
    exportReviewSurface(record.exportType),
    label.slice(0, 280),
    {
      export_type: record.exportType,
      review_status: record.reviewStatus,
      readiness_level: record.readinessLevel,
      solicitor_review_required: record.solicitorReviewRequired,
      has_export_hash: Boolean(record.exportHash),
    },
  );
}
