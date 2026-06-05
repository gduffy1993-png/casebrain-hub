/**
 * Solicitor feedback marking loop — slice 1 tests.
 * Run: npx tsx scripts/reasoning-feedback.test.ts
 */
import assert from "node:assert/strict";
import { buildReasoningFeedbackRecord } from "../lib/criminal/reasoning-v2/feedback/build-reasoning-feedback-record";
import { shouldShowReasoningFeedback } from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-flag";
import {
  feedbackRecordContainsForbiddenContent,
  sanitizeReasoningFeedbackNote,
} from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-sanitize";
import { summarizeReasoningFeedback } from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-summary";
import {
  REASONING_FEEDBACK_OPTIONS,
  type ReasoningFeedbackOption,
} from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";

assert.equal(REASONING_FEEDBACK_OPTIONS.length, 6);
const optionValues = REASONING_FEEDBACK_OPTIONS.map((o) => o.value);
const expected: ReasoningFeedbackOption[] = [
  "useful",
  "missed_key_issue",
  "too_vague",
  "unsafe_overconfident",
  "needs_solicitor_review",
  "good_enough_hearing_prep",
];
assert.deepEqual(optionValues, expected);

assert.equal(shouldShowReasoningFeedback(false), false, "flag off = no feedback UI");
assert.equal(shouldShowReasoningFeedback(true), true, "flag on = feedback UI");

const record = buildReasoningFeedbackRecord({
  caseId: "case-abc",
  surface: "control-room-reasoning",
  feedbackOption: "useful",
  note: "Helpful for disclosure chase list",
  routeLabel: "Fraud / account-control pressure",
  humanReviewRequired: true,
  timestamp: "2026-06-01T12:00:00.000Z",
  appVersion: "test-v1",
});

assert.equal(record.caseId, "case-abc");
assert.equal(record.surface, "control-room-reasoning");
assert.equal(record.feedbackOption, "useful");
assert.equal(record.humanReviewRequired, true);
assert.equal(record.routeLabel, "Fraud / account-control pressure");
assert.ok(!record.note?.includes("MG5"), "note should not contain bundle sections");

const blob = JSON.stringify(record);
assert.ok(!blob.includes("artifacts/"), "no artifact paths");
assert.ok(!/\b[a-z]:\\/.test(blob), "no local paths");
assert.ok(!blob.includes("=== SECTION:"), "no bundle text");
assert.equal(feedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>), false);

const rejectedNote = sanitizeReasoningFeedbackNote("See artifacts/casebrain-auditor/run/foo");
assert.equal(rejectedNote, null, "note with artifact path rejected");

const badRecord = {
  ...record,
  note: "C:\\Users\\secret\\bundle.pdf",
};
assert.equal(feedbackRecordContainsForbiddenContent(badRecord as unknown as Record<string, unknown>), true);

const summary = summarizeReasoningFeedback([
  record,
  buildReasoningFeedbackRecord({
    caseId: "case-xyz",
    surface: "war-room-reasoning",
    feedbackOption: "too_vague",
    routeLabel: "Provisional route",
    humanReviewRequired: false,
  }),
]);
assert.equal(summary.total, 2);
assert.equal(summary.byOption.useful, 1);
assert.equal(summary.byOption.too_vague, 1);
assert.ok(summary.unsafeOrVagueCount >= 1);
assert.ok(summary.casesNeedingReview.includes("case-xyz"));

console.log("reasoning-feedback.test.ts: ok");
