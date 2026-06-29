/**
 * H5 Confidence Dashboard tests.
 * Run: npx tsx scripts/confidence-dashboard.test.ts
 */
import assert from "node:assert/strict";
import {
  buildConfidenceDashboard,
  summarizeFeedbackRecords,
} from "../lib/criminal/confidence-dashboard";
import { dashboardSendabilityLabel, outputHasSourceSupport } from "../lib/criminal/confidence-dashboard/confidence-dashboard-sanitize";
import { compareRerunDiff } from "../lib/criminal/re-run-diff/compare-rerun-diff";
import { buildRerunDiffSnapshot } from "../lib/criminal/re-run-diff/build-rerun-diff-snapshot";

import type { BuildConfidenceDashboardInput } from "../lib/criminal/confidence-dashboard/confidence-dashboard-types";

const baseInput = (): BuildConfidenceDashboardInput => ({
  documentCount: 3,
  evidenceRows: [
    { existence: "served", reliability: "needs_review", sourceAnchor: "MG11" },
    { existence: "referred_only", reliability: "weak", sourceAnchor: "BWV" },
    { existence: "missing", reliability: "needs_review", sourceAnchor: null },
  ],
  chaseItems: [{ label: "Custody record", baseStatus: "outstanding", source: "PACE" }],
  matterLevel: "needs_review",
  missingMaterialLabels: ["Custody record"],
  contradictions: [{ kind: "attribution_issue", label: "Phone attribution unclear" }],
  mustNotOverstate: ["Do not say BWV shows the assault"],
  outstandingChaseLabels: ["Body-worn video", "Custody record"],
  exportSections: [
    {
      id: "cps_chase",
      title: "CPS chase",
      sendability: "needs_solicitor_review",
      sendabilityLabel: "Solicitor review required",
      blockedReason: null,
    },
    {
      id: "full_pack",
      title: "Full export pack",
      sendability: "safe_to_send",
      sendabilityLabel: "Safe to send",
      blockedReason: null,
    },
  ],
  exportVersion: { exportId: "exp-test-001", generatedAt: "2026-06-29T12:00:00.000Z", warningCount: 2 },
  courtNoteSendability: "needs_solicitor_review",
  courtNoteSendabilityLabel: "Solicitor review required",
  sourceBadges: ["missing", "referred_only"],
  feedback: { blocking: 0, warning: 1, polish: 0, exportRelated: 0, unsafeOrOverstated: 0, latestTimestamp: null },
  recent: {
    rerunDiffHeadline: null,
    rerunDiffLines: [],
    rerunHasBaseline: false,
    adviceChangeSummary: null,
    adviceChangeItemCount: 0,
    adviceHasBaseline: false,
    exportId: "exp-test-001",
    exportGeneratedAt: "2026-06-29T12:00:00.000Z",
    auditConcernCount: 0,
  },
});

const noData = buildConfidenceDashboard({
  ...baseInput(),
  documentCount: 0,
  evidenceRows: [],
  chaseItems: [],
});
assert.equal(noData.status, "insufficient_information");
assert.equal(noData.evidenceCounts.available, false);

const model = buildConfidenceDashboard(baseInput());
assert.equal(model.evidenceCounts.served, 1);
assert.equal(model.evidenceCounts.referred_only, 1);
assert.equal(model.evidenceCounts.missing, 1);
assert.ok(model.evidenceCounts.available);
assert.notEqual(model.status, "ready_for_solicitor_review");
assert.ok(model.unresolvedWork.length > 0);
assert.ok(model.riskWarnings.length > 0);
assert.ok(!model.statusLabel.toLowerCase().includes("guaranteed"));
assert.ok(!model.recommendedAction.toLowerCase().includes("you must advise"));

assert.equal(outputHasSourceSupport("safe_to_send", "missing"), false);
const labelNoSource = dashboardSendabilityLabel("safe_to_send", false);
assert.ok(!/safe to copy/i.test(labelNoSource));

const fullPack = model.outputSendability.find((r) => r.outputId === "full_pack");
assert.ok(fullPack);
assert.ok(!/safe to copy/i.test(fullPack.sendabilityLabel));

const blockingFb = summarizeFeedbackRecords([
  {
    id: "1",
    caseId: "c",
    tab: "export_pack",
    feedbackKind: "unsafe",
    lineSnippet: null,
    contextLabel: null,
    sourceState: null,
    sendability: null,
    note: null,
    timestamp: "2026-06-29T12:00:00.000Z",
    outputVersion: "v1",
    section: null,
    severity: "blocking",
    exportId: "exp-1",
    exportType: "h5_export_pack_v1",
  },
]);
assert.equal(blockingFb.blocking, 1);
const blockedModel = buildConfidenceDashboard({
  ...baseInput(),
  feedback: blockingFb,
});
assert.equal(blockedModel.status, "blocked_pending_material");

const noBaseline = compareRerunDiff(
  null,
  buildRerunDiffSnapshot({
    documentCount: 1,
    matterConfidenceLevel: null,
    chaseSendability: null,
    summarySendability: null,
    courtLineStatus: null,
    evidence: [],
    chase: [],
    riskLabels: [],
    exportStamp: null,
  }),
);
assert.equal(noBaseline.hasPrevious, false);

console.log("confidence-dashboard.test.ts: ok");
