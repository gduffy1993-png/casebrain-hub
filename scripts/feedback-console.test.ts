#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildH5FeedbackInput } from "../lib/criminal/feedback-console/build-h5-feedback-input";
import { inferFeedbackSeverity } from "../lib/criminal/feedback-console/infer-feedback-severity";
import { H5_FEEDBACK_KINDS } from "../lib/criminal/feedback-console/types";
import { buildTrustFeedbackRecord } from "../lib/criminal/trust/feedback/build-trust-feedback-record";
import { validateTrustFeedbackPostBody } from "../lib/criminal/trust/feedback/trust-feedback-validate";

assert.equal(H5_FEEDBACK_KINDS.length, 10);

const h5Input = buildH5FeedbackInput({
  caseId: "case-h5",
  surface: "export_pack",
  section: "cps_chase",
  feedbackKind: "unsafe",
  lineSnippet: "Please provide BWV",
  sourceState: "referred_only",
  sendability: "provisional_check_source",
  exportId: "exp-abc-123",
  exportType: "h5_export_pack_v1",
  note: "Court wording leaked into CPS chase",
});

assert.equal(h5Input.tab, "export_pack");
assert.equal(h5Input.feedbackKind, "unsafe");
assert.equal(h5Input.severity, "blocking");
assert.equal(h5Input.exportId, "exp-abc-123");
assert.ok(h5Input.contextLabel?.includes("export_pack"));
assert.ok(h5Input.contextLabel?.includes("exp-abc-123"));

const record = buildTrustFeedbackRecord(h5Input);
assert.equal(record.section, "cps_chase");
assert.equal(record.severity, "blocking");
assert.equal(record.exportId, "exp-abc-123");

const validated = validateTrustFeedbackPostBody(
  {
    tab: "five_answers",
    feedbackKind: "good_for_court",
    section: "court_note",
    severity: "polish",
    sendability: "needs_solicitor_review",
  },
  "case-h5",
);
assert.equal(validated.ok, true);

const invalidSurface = validateTrustFeedbackPostBody(
  { tab: "papers", feedbackKind: "wrong" },
  "case-h5",
);
assert.equal(invalidSurface.ok, false);

assert.equal(inferFeedbackSeverity("missing_evidence"), "warning");
assert.equal(inferFeedbackSeverity("useful"), "polish");

console.log("feedback-console.test.ts: all assertions passed");
