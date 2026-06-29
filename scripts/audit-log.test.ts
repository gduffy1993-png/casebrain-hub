/**
 * H5 Audit Log tests.
 * Run: npx tsx scripts/audit-log.test.ts
 */
import assert from "node:assert/strict";
import { buildAuditLogEntry, filterAuditLogEntries } from "../lib/criminal/audit-log/build-audit-log-entry";
import { parseAuditLogFilters } from "../lib/criminal/audit-log/parse-audit-log-filters";
import { suggestAuditActionCategories } from "../lib/criminal/audit-log/suggest-action-category";
import { isAuditLogPageEnabled } from "../lib/criminal/audit-log/audit-log-flag";
import { maskActorUserRef } from "../lib/criminal/audit-log/audit-log-labels";
import { buildTrustFeedbackRecord } from "../lib/criminal/trust/feedback/build-trust-feedback-record";

assert.equal(isAuditLogPageEnabled(true), true);
assert.equal(isAuditLogPageEnabled(false), false);

const parsed = parseAuditLogFilters({
  severity: "blocking",
  tab: "export_pack",
  kind: "unsafe",
  exportType: "h5_export_pack_v1",
  caseId: "6efa4426-8961-48cf-8f9f-fb95fc870fd3",
  concernsOnly: "1",
});
assert.equal(parsed.severity, "blocking");
assert.equal(parsed.tab, "export_pack");
assert.equal(parsed.feedbackKind, "unsafe");
assert.equal(parsed.exportType, "h5_export_pack_v1");
assert.equal(parsed.caseId, "6efa4426-8961-48cf-8f9f-fb95fc870fd3");
assert.equal(parsed.concernsOnly, true);

const badCase = parseAuditLogFilters({ caseId: "not-a-uuid" });
assert.equal(badCase.caseId, null);

const record = buildTrustFeedbackRecord({
  caseId: "case-audit-1",
  tab: "export_pack",
  feedbackKind: "unsafe",
  lineSnippet: "BWV confirms assault",
  sourceState: "referred_only",
  sendability: "provisional_check_source",
  exportId: "exp-001",
  exportType: "h5_export_pack_v1",
  note: "Referred BWV described as proof",
});

const entry = buildAuditLogEntry(record, {
  caseTitle: "R v Alex Quinn",
  userId: "user-abcdef1234567890",
});
assert.equal(entry.caseTitle, "R v Alex Quinn");
assert.equal(entry.effectiveSeverity, "blocking");
assert.equal(entry.exportId, "exp-001");
assert.ok(entry.suggestedActionCategories.includes("possible_false_served"));
assert.ok(entry.suggestedActionCategories.includes("add_to_bad_output_memory"));
assert.equal(maskActorUserRef("user-abcdef1234567890"), "user-abc…");

const cats = suggestAuditActionCategories(
  buildTrustFeedbackRecord({
    caseId: "c",
    tab: "five_answers",
    feedbackKind: "useful",
  }),
);
assert.ok(cats.includes("no_action"));

const filtered = filterAuditLogEntries(
  [
    entry,
    buildAuditLogEntry(
      buildTrustFeedbackRecord({ caseId: "other", tab: "today", feedbackKind: "useful" }),
      { caseTitle: "Other", userId: "u2" },
    ),
  ],
  { severity: "blocking", tab: "all", feedbackKind: "all", exportType: "all", caseId: null, concernsOnly: false },
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.caseId, "case-audit-1");

console.log("audit-log.test.ts: ok");
