/**
 * Case review audit events — slice 5 tests.
 * Run: npx tsx scripts/case-review-audit-events.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditInputFromExportReview,
  auditInputFromReasoningFeedback,
  auditInputFromSupervisorSignoff,
} from "../lib/criminal/persistence/case-review-audit/case-review-audit-integrations";
import {
  auditEventContainsForbiddenContent,
  sanitizeCaseReviewAuditLabel,
  sanitizeCaseReviewAuditMetadata,
} from "../lib/criminal/persistence/case-review-audit/case-review-audit-sanitize";
import {
  buildCaseReviewAuditEventRecord,
  validateCaseReviewAuditPostBody,
} from "../lib/criminal/persistence/case-review-audit/case-review-audit-validate";
import {
  isCaseReviewAuditPersistenceEnabled,
  isPersistenceEnabled,
} from "../lib/criminal/persistence/persistence-flag";

const params = (q: Record<string, string | null>) => ({
  get: (key: string) => q[key] ?? null,
});

assert.equal(isPersistenceEnabled(params({ persistence: "0" }), true), false);
assert.equal(isCaseReviewAuditPersistenceEnabled(true, false), true);
assert.equal(isCaseReviewAuditPersistenceEnabled(false, false), false);

assert.equal(sanitizeCaseReviewAuditLabel("artifacts/casebrain-auditor/run/foo"), null);
assert.equal(
  sanitizeCaseReviewAuditLabel("Reasoning feedback saved for review"),
  "Reasoning feedback saved for review",
);

const badMetadata = sanitizeCaseReviewAuditMetadata({
  fullText: "secret export body",
  export_type: "disclosure_chase",
  labels: ["pp-gold-pack route"],
});
assert.equal(badMetadata.fullText, undefined);
assert.equal(Array.isArray(badMetadata.labels) ? badMetadata.labels.length : 0, 0);

const goodMetadata = sanitizeCaseReviewAuditMetadata({
  export_type: "hearing_prep",
  review_status: "copied",
  readiness_level: "amber",
});
assert.equal(goodMetadata.export_type, "hearing_prep");

const valid = validateCaseReviewAuditPostBody(
  {
    eventType: "export_copied",
    sourceSurface: "solicitor_export_builder",
    safeLabel: "Export disclosure chase — copied",
    metadata: goodMetadata,
  },
  "case-abc",
);
assert.equal(valid.ok, true);

const rejectedPath = validateCaseReviewAuditPostBody(
  {
    eventType: "evidence_snapshot_saved",
    safeLabel: "C:\\Users\\secret\\bundle.pdf",
  },
  "case-abc",
);
assert.equal(rejectedPath.ok, false);

const rejectedBody = validateCaseReviewAuditPostBody(
  {
    eventType: "export_generated",
    safeLabel: "Export generated",
    fullText: "DRAFT FOR SOLICITOR REVIEW ONLY ... long body ...",
  },
  "case-abc",
);
assert.equal(rejectedBody.ok, false, "rejects fullText in POST");

const rejectedProof = validateCaseReviewAuditPostBody(
  {
    eventType: "reasoning_feedback_saved",
    safeLabel: "pp-gold-pack feedback route",
  },
  "case-abc",
);
assert.equal(rejectedProof.ok, false);

const record = buildCaseReviewAuditEventRecord({
  caseId: "case-abc",
  orgId: "org-1",
  actorId: "user-1",
  eventType: "supervisor_marked_reviewed",
  sourceSurface: "supervisor_qa",
  safeLabel: "Supervisor marked reviewed",
  metadata: { status: "reviewed", qa_status: "required" },
});
assert.equal(auditEventContainsForbiddenContent(record as unknown as Record<string, unknown>), false);
assert.ok(!JSON.stringify(record).includes("fullText"));
assert.ok(record.safeLabel.length <= 280);

const feedbackAudit = auditInputFromReasoningFeedback(
  { caseId: "case-1", orgId: "org-1", actorId: "user-1", relatedRecordId: "fb-1" },
  {
    id: "fb-1",
    caseId: "case-1",
    surface: "control-room-reasoning",
    feedbackOption: "useful",
    note: null,
    routeLabel: "Dispute identification",
    humanReviewRequired: false,
    timestamp: new Date().toISOString(),
    appVersion: "test",
  },
);
assert.equal(feedbackAudit.eventType, "reasoning_feedback_saved");
assert.equal(feedbackAudit.sourceSurface, "control_room");

const signoffAudit = auditInputFromSupervisorSignoff(
  { caseId: "case-1", orgId: "org-1", actorId: "user-1" },
  {
    id: "so-1",
    caseId: "case-1",
    status: "escalated",
    qaStatus: "required",
    reasonLabels: ["Missing core disclosure"],
    readinessLevel: "red",
    humanReviewRequired: true,
    evidenceChangeStatus: null,
    note: null,
    createdAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    appVersion: "test",
  },
);
assert.equal(signoffAudit.eventType, "supervisor_escalated");

const exportAudit = auditInputFromExportReview(
  { caseId: "case-1", orgId: "org-1", actorId: "user-1" },
  {
    id: "er-1",
    caseId: "case-1",
    exportType: "client_explanation",
    reviewStatus: "copied",
    routeLabel: "Dispute identification",
    readinessLevel: "amber",
    humanReviewRequired: false,
    solicitorReviewRequired: true,
    exportHash: "a".repeat(64),
    note: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    appVersion: "test",
  },
);
assert.equal(exportAudit.eventType, "export_copied");
assert.equal(exportAudit.sourceSurface, "client_explanation");
assert.equal(exportAudit.metadata.has_export_hash, true);

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260605120000_case_review_audit_events.sql"),
  "utf8",
);
assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"), "migration enables RLS");
assert.ok(migrationSql.includes("case_review_audit_events"), "table exists");
assert.ok(migrationSql.includes("FOR SELECT"), "SELECT policy");
assert.ok(migrationSql.includes("FOR INSERT"), "INSERT policy");
assert.ok(!migrationSql.includes("FOR UPDATE"), "no UPDATE policy");
assert.ok(!migrationSql.includes("FOR DELETE"), "no DELETE policy");

console.log("case-review-audit-events.test.ts: ok");
