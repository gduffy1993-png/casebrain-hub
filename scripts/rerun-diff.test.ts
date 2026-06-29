/**
 * H5 Re-run Diff tests.
 * Run: npx tsx scripts/rerun-diff.test.ts
 */
import assert from "node:assert/strict";
import { buildRerunDiffSnapshot } from "../lib/criminal/re-run-diff/build-rerun-diff-snapshot";
import { compareRerunDiff } from "../lib/criminal/re-run-diff/compare-rerun-diff";

const base = buildRerunDiffSnapshot({
  documentCount: 3,
  matterConfidenceLevel: "needs_review",
  chaseSendability: "needs_solicitor_review",
  summarySendability: "needs_solicitor_review",
  courtLineStatus: "needs_review",
  evidence: [
    { labelKey: "bwv", label: "Body-worn video", existence: "referred_only" },
    { labelKey: "custody", label: "Custody record", existence: "missing" },
  ],
  chase: [
    { labelKey: "bwv", label: "Body-worn video", existence: "referred_only" },
    { labelKey: "custody", label: "Custody record", existence: "missing" },
  ],
  riskLabels: ["Do not say BWV shows the assault"],
  exportStamp: null,
});

const noPrev = compareRerunDiff(null, base);
assert.equal(noPrev.hasPrevious, false);
assert.equal(noPrev.headline, "No earlier version available yet");

const served = buildRerunDiffSnapshot({
  ...base,
  evidence: [
    { labelKey: "bwv", label: "Body-worn video", existence: "served" },
    { labelKey: "custody", label: "Custody record", existence: "missing" },
  ],
  chase: [
    { labelKey: "bwv", label: "Body-worn video", existence: "served" },
    { labelKey: "custody", label: "Custody record", existence: "missing" },
  ],
  exportStamp: {
    exportId: "exp-002",
    generatedAt: "2026-06-29T15:00:00.000Z",
    bundleVersionLabel: "bundle-v2",
    exportType: "h5_export_pack_v1",
  },
});

const withPrev = compareRerunDiff(base, served);
assert.equal(withPrev.hasPrevious, true);
assert.ok(withPrev.groups.some((g) => g.id === "new_served"));
assert.ok(withPrev.groups.some((g) => g.id === "still_missing"));
assert.ok(withPrev.groups.some((g) => g.id === "state_changed") || withPrev.groups.some((g) => g.id === "new_served"));
assert.ok(withPrev.exportImpact?.current?.exportId === "exp-002");

const exportPrev = buildRerunDiffSnapshot({
  ...base,
  exportStamp: {
    exportId: "exp-001",
    generatedAt: "2026-06-29T12:00:00.000Z",
    bundleVersionLabel: "bundle-v1",
    exportType: "h5_export_pack_v1",
  },
});
const exportDiff = compareRerunDiff(exportPrev, served);
assert.ok(exportDiff.groups.some((g) => g.id === "export_impact"));

console.log("rerun-diff.test.ts: ok");
