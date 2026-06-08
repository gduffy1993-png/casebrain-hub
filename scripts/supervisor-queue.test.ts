/**
 * Multi-case Supervisor Queue — slice 1 tests.
 * Run: npx tsx scripts/supervisor-queue.test.ts
 */
import assert from "node:assert/strict";
import {
  buildSupervisorQueueRow,
  buildSupervisorQueueRows,
  filterSupervisorQueueRows,
} from "../lib/criminal/supervisor-queue/build-supervisor-queue";
import { buildSupervisorQueueCaseHref } from "../lib/criminal/supervisor-queue/supervisor-queue-links";
import {
  lintSupervisorQueueOutput,
  sanitizeSupervisorQueueLabel,
  supervisorQueueRowIsSafe,
} from "../lib/criminal/supervisor-queue/supervisor-queue-sanitize";
import { isSupervisorQueuePageEnabled } from "../lib/criminal/supervisor-queue/supervisor-queue-flag";

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const EXAMPLE_CASE_ID = "295d9bee-d14a-461a-aa7b-91872b868e99";

assert.equal(sanitizeSupervisorQueueLabel("artifacts/casebrain-auditor/run/foo"), null);
assert.equal(sanitizeSupervisorQueueLabel("R v Example — supervisor review"), "R v Example — supervisor review");

const href = buildSupervisorQueueCaseHref(CASE_ID);
assert.ok(href, "valid case id yields href");
assert.equal(href, `/cases/${CASE_ID}?tab=strategy&controlRoom=1`, "clean control room open case href");
assert.ok(!href!.includes("reasoningV2="), "workflow flags omitted when pilot defaults apply");
assert.equal(buildSupervisorQueueCaseHref("not-a-uuid"), null);
assert.equal(buildSupervisorQueueCaseHref(""), null);

const exampleHref = buildSupervisorQueueCaseHref(EXAMPLE_CASE_ID);
assert.equal(
  exampleHref,
  `/cases/${EXAMPLE_CASE_ID}?tab=strategy&controlRoom=1`,
  "example open case href shape",
);

assert.equal(isSupervisorQueuePageEnabled(true, false), true);
assert.equal(isSupervisorQueuePageEnabled(false, true), true);
assert.equal(isSupervisorQueuePageEnabled(false, false), false);

const escalated = buildSupervisorQueueRow(
  { caseId: CASE_ID, title: "R v Vale", hearingDate: null },
  {
    signoff: {
      status: "escalated",
      qaStatus: "required",
      reasonLabels: ["Missing core disclosure"],
      readinessLevel: "red",
      evidenceChangeStatus: null,
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    snapshot: null,
    feedback: null,
    exportReview: null,
    auditEvents: [],
  },
);
assert.ok(escalated);
assert.ok(escalated!.buckets.includes("escalated"));
assert.equal(escalated!.openCaseHref, href);
assert.equal(supervisorQueueRowIsSafe(escalated as unknown as Record<string, unknown>), true);

const redSnapshot = buildSupervisorQueueRow(
  { caseId: CASE_ID, title: "R v Doyle", hearingDate: "2026-06-05T09:00:00.000Z" },
  {
    signoff: null,
    snapshot: {
      readinessLevel: "red",
      humanReviewRequired: true,
      routeLabel: "Dispute identification",
      createdAt: "2026-06-02T10:00:00.000Z",
    },
    feedback: null,
    exportReview: null,
    auditEvents: [],
  },
  new Date("2026-06-01T12:00:00.000Z"),
);
assert.ok(redSnapshot);
assert.ok(redSnapshot!.buckets.includes("hearing_soon_red"));

const feedbackConcern = buildSupervisorQueueRow(
  { caseId: CASE_ID, title: "R v Marsh", hearingDate: null },
  {
    signoff: null,
    snapshot: null,
    feedback: {
      feedbackOption: "unsafe_overconfident",
      routeLabel: "Dispute identification",
      createdAt: "2026-06-03T10:00:00.000Z",
    },
    exportReview: null,
    auditEvents: [],
  },
);
assert.ok(feedbackConcern);
assert.ok(feedbackConcern!.buckets.includes("feedback_concerns"));

const exportNeeds = buildSupervisorQueueRow(
  { caseId: CASE_ID, title: "R v Shaw", hearingDate: null },
  {
    signoff: null,
    snapshot: null,
    feedback: null,
    exportReview: {
      exportType: "disclosure_chase",
      reviewStatus: "needs_review",
      solicitorReviewRequired: true,
      routeLabel: "Dispute identification",
      createdAt: "2026-06-04T10:00:00.000Z",
    },
    auditEvents: [],
  },
);
assert.ok(exportNeeds);
assert.ok(exportNeeds!.buckets.includes("export_needs_review"));

const reviewedOnly = buildSupervisorQueueRow(
  { caseId: CASE_ID, title: "R v Reviewed", hearingDate: null },
  {
    signoff: {
      status: "no_issue",
      qaStatus: "none",
      reasonLabels: [],
      readinessLevel: "green",
      evidenceChangeStatus: null,
      createdAt: "2026-06-05T10:00:00.000Z",
    },
    snapshot: null,
    feedback: null,
    exportReview: null,
    auditEvents: [],
  },
);
assert.ok(reviewedOnly);
assert.ok(reviewedOnly!.buckets.includes("reviewed"));

const allRows = buildSupervisorQueueRows(
  [
    { caseId: CASE_ID, title: "R v Vale", hearingDate: null },
    { caseId: "22222222-2222-4222-8222-222222222222", title: "R v Doyle", hearingDate: null },
    { caseId: "33333333-3333-4333-8333-333333333333", title: "R v Reviewed", hearingDate: null },
  ],
  new Map([
    [
      CASE_ID,
      {
        signoff: {
          status: "escalated",
          qaStatus: "required",
          reasonLabels: ["Contradiction unresolved"],
          readinessLevel: "red",
          evidenceChangeStatus: null,
          createdAt: "2026-06-01T10:00:00.000Z",
        },
        snapshot: null,
        feedback: null,
        exportReview: null,
        auditEvents: [],
      },
    ],
    [
      "22222222-2222-4222-8222-222222222222",
      {
        signoff: null,
        snapshot: {
          readinessLevel: "red",
          humanReviewRequired: true,
          routeLabel: "Route A",
          createdAt: "2026-06-02T10:00:00.000Z",
        },
        feedback: null,
        exportReview: null,
        auditEvents: [],
      },
    ],
    [
      "33333333-3333-4333-8333-333333333333",
      {
        signoff: {
          status: "no_issue",
          qaStatus: "none",
          reasonLabels: [],
          readinessLevel: "green",
          evidenceChangeStatus: null,
          createdAt: "2026-06-05T10:00:00.000Z",
        },
        snapshot: null,
        feedback: null,
        exportReview: null,
        auditEvents: [],
      },
    ],
  ]),
);

assert.ok(allRows.length >= 2);
const defaultFiltered = filterSupervisorQueueRows(allRows, "all");
assert.ok(defaultFiltered.every((r) => !r.buckets.every((b) => b === "reviewed")), "reviewed-only hidden from all");
const reviewedFiltered = filterSupervisorQueueRows(allRows, "reviewed");
assert.ok(reviewedFiltered.some((r) => r.buckets.includes("reviewed")));

const unsafeBlob = JSON.stringify({
  caseId: CASE_ID,
  caseLabel: "pp-gold-pack route",
  openCaseHref: href,
});
assert.ok(lintSupervisorQueueOutput(unsafeBlob).length > 0, "lint rejects proof ids");

const safeBlob = JSON.stringify(escalated);
assert.equal(lintSupervisorQueueOutput(safeBlob).length, 0);
assert.ok(!safeBlob.includes("fullText"));
assert.ok(!safeBlob.includes("artifacts/"));

console.log("supervisor-queue.test.ts: ok");
