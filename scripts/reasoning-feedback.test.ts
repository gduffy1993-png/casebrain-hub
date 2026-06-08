/**
 * Solicitor feedback marking loop — slice 1 tests.
 * Run: npx tsx scripts/reasoning-feedback.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPersistenceEnabled,
  isReasoningFeedbackPersistenceEnabled,
} from "../lib/criminal/persistence/persistence-flag";
import { buildReasoningFeedbackRecord } from "../lib/criminal/reasoning-v2/feedback/build-reasoning-feedback-record";
import { shouldShowReasoningFeedback } from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-flag";
import {
  feedbackRecordContainsForbiddenContent,
  sanitizeReasoningFeedbackNote,
} from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-sanitize";
import { saveReasoningFeedback, saveReasoningFeedbackLocal } from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-storage";
import { summarizeReasoningFeedback } from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-summary";
import {
  sanitizeReasoningFeedbackRouteLabel,
  validateReasoningFeedbackPostBody,
} from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-validate";
import {
  REASONING_FEEDBACK_OPTIONS,
  type ReasoningFeedbackOption,
} from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";

const params = (q: Record<string, string | null>) => ({
  get: (key: string) => q[key] ?? null,
});

async function main() {
assert.equal(isPersistenceEnabled(params({ persistence: "1" }), false), true, "persistence=1 enables");
assert.equal(isPersistenceEnabled(params({ persistence: "0" }), true), false, "persistence=0 disables");
assert.equal(isPersistenceEnabled(params({}), true), true, "storage enables when query unset");
assert.equal(isPersistenceEnabled(params({}), false, { defaultOn: false }), false, "persistence off when not pilot default");
assert.equal(
  isReasoningFeedbackPersistenceEnabled(true, true),
  false,
  "feedback kill switch disables DB path",
);
assert.equal(
  isReasoningFeedbackPersistenceEnabled(true, false),
  true,
  "persistence on attempts DB/API path",
);

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

const rejectedRoute = sanitizeReasoningFeedbackRouteLabel("pp-gold-pack route");
assert.equal(rejectedRoute, null, "route label with proof id rejected");

const badRecord = {
  ...record,
  note: "C:\\Users\\secret\\bundle.pdf",
};
assert.equal(feedbackRecordContainsForbiddenContent(badRecord as unknown as Record<string, unknown>), true);

const validBody = validateReasoningFeedbackPostBody(
  {
    surface: "control-room-reasoning",
    feedbackOption: "useful",
    note: "Brief product note",
    routeLabel: "Provisional route",
    humanReviewRequired: true,
  },
  "case-abc",
);
assert.equal(validBody.ok, true, "valid API body accepted");

const rejectedBody = validateReasoningFeedbackPostBody(
  {
    surface: "control-room-reasoning",
    feedbackOption: "useful",
    note: "See artifacts/casebrain-auditor/local-real-matters/rm-001",
  },
  "case-abc",
);
assert.equal(rejectedBody.ok, false, "API validation rejects artifact path in note");

const rejectedProofBody = validateReasoningFeedbackPostBody(
  {
    surface: "war-room-reasoning",
    feedbackOption: "too_vague",
    routeLabel: "pp-pilot-3 matter",
  },
  "case-xyz",
);
assert.equal(rejectedProofBody.ok, false, "API validation rejects proof-id route label");

const localOnly = saveReasoningFeedbackLocal({
  caseId: "case-local",
  surface: "control-room-reasoning",
  feedbackOption: "useful",
  humanReviewRequired: false,
});
assert.equal(localOnly.caseId, "case-local", "localStorage fallback still works");

const asyncLocal = await saveReasoningFeedback(
  {
    caseId: "case-async",
    surface: "war-room-reasoning",
    feedbackOption: "good_enough_hearing_prep",
    humanReviewRequired: false,
  },
  { persistenceEnabled: false },
);
assert.equal(asyncLocal.persisted, false, "persistence flag off skips DB path");
assert.equal(asyncLocal.record.caseId, "case-async");

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260601120000_reasoning_feedback.sql"),
  "utf8",
);
assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"), "migration enables RLS");
assert.ok(migrationSql.includes("CREATE POLICY"), "migration defines RLS policies");
assert.ok(migrationSql.includes("reasoning_feedback"), "reasoning_feedback table exists in migration");

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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
