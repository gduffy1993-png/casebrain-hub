/**
 * H3 trust feedback tests.
 * Run: npx tsx scripts/trust-feedback.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isTrustFeedbackPersistenceEnabled,
} from "../lib/criminal/persistence/persistence-flag";
import { buildTrustFeedbackRecord } from "../lib/criminal/trust/feedback/build-trust-feedback-record";
import {
  isBadOutputCandidateKind,
  sanitizeTrustFeedbackNote,
  sanitizeTrustFeedbackSnippet,
} from "../lib/criminal/trust/feedback/trust-feedback-sanitize";
import {
  filterBadOutputCandidateRecords,
  summarizeTrustFeedback,
} from "../lib/criminal/trust/feedback/trust-feedback-summary";
import { validateTrustFeedbackPostBody } from "../lib/criminal/trust/feedback/trust-feedback-validate";
import { TRUST_FEEDBACK_KINDS } from "../lib/criminal/trust/feedback/trust-feedback-types";

assert.equal(TRUST_FEEDBACK_KINDS.length, 6);
assert.equal(
  isTrustFeedbackPersistenceEnabled(true, false),
  true,
  "persistence on attempts DB/API path",
);
assert.equal(
  isTrustFeedbackPersistenceEnabled(true, true),
  false,
  "kill switch disables DB path",
);

const record = buildTrustFeedbackRecord({
  caseId: "case-abc",
  tab: "chase",
  feedbackKind: "unsafe",
  lineSnippet: "BWV confirms officer account",
  contextLabel: "Body-worn video chase item",
  sourceState: "not_safely_confirmed",
  sendability: "provisional_check_source",
  note: "Overstates served material",
  timestamp: "2026-06-28T12:00:00.000Z",
  outputVersion: "test-v1",
});

assert.equal(record.caseId, "case-abc");
assert.equal(record.tab, "chase");
assert.equal(record.feedbackKind, "unsafe");
assert.equal(record.sourceState, "not_safely_confirmed");
assert.equal(record.sendability, "provisional_check_source");
assert.equal(record.outputVersion, "test-v1");
assert.ok(isBadOutputCandidateKind("unsafe"));
assert.ok(!isBadOutputCandidateKind("useful"));

assert.equal(sanitizeTrustFeedbackNote("artifacts/casebrain-qa/foo"), null);
assert.equal(sanitizeTrustFeedbackSnippet("  short line  "), "short line");

const rejected = validateTrustFeedbackPostBody(
  { tab: "summary", feedbackKind: "wrong", note: "C:\\secrets\\bundle.pdf" },
  "case-abc",
);
assert.equal(rejected.ok, false, "forbidden note rejected");

const accepted = validateTrustFeedbackPostBody(
  {
    tab: "today",
    feedbackKind: "missing_issue",
    lineSnippet: "PACE safeguards line",
    sourceState: "missing",
    sendability: "needs_solicitor_review",
  },
  "case-abc",
);
assert.equal(accepted.ok, true);
if (accepted.ok) {
  assert.equal(accepted.input.feedbackKind, "missing_issue");
}

assert.equal(filterBadOutputCandidateRecords([record]).length, 1);

const summary = summarizeTrustFeedback([
  record,
  buildTrustFeedbackRecord({ caseId: "case-abc", tab: "summary", feedbackKind: "useful" }),
]);
assert.equal(summary.total, 2);
assert.equal(summary.badOutputCandidates, 1);

const invalidTab = validateTrustFeedbackPostBody({ tab: "papers", feedbackKind: "wrong" }, "case-abc");
assert.equal(invalidTab.ok, false, "invalid tab rejected");

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260628120000_trust_feedback.sql"),
  "utf8",
);
assert.ok(migration.includes("trust_feedback"));
assert.ok(migration.includes("feedback_kind"));
assert.ok(migration.includes("ENABLE ROW LEVEL SECURITY"));

console.log("trust-feedback.test.ts: all assertions passed");
