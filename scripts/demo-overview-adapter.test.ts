/**
 * Adapter smoke — presentation mapping only (no brains).
 */
import assert from "node:assert/strict";
import {
  buildDemoAttentionItems,
  buildDemoReadiness,
  buildDemoStatCounts,
} from "../components/criminal/demo-shell/demoOverviewAdapter";
import type { DisclosureChaseItem } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const sample = (partial: Partial<DisclosureChaseItem> & Pick<DisclosureChaseItem, "id" | "label" | "baseStatus">): DisclosureChaseItem => ({
  familyId: "cctv",
  whyItMatters: "Master window not on papers.",
  source: "MG6C",
  urgency: "high",
  deadlineLabel: "Chase master CCTV",
  evidenceAnchor: "MG6C p.12",
  linkedRoute: null,
  draftChaseWording: "Please serve the CCTV master / full window.",
  courtLine: "CCTV master not safely confirmed on the papers.",
  mergedFrom: [],
  ...partial,
});

const items = buildDemoAttentionItems([
  sample({ id: "1", label: "CCTV master / full window", baseStatus: "Outstanding" }),
  sample({
    id: "2",
    label: "Interview recording",
    baseStatus: "Due soon",
    familyId: "interview",
    urgency: "medium",
  }),
  sample({ id: "3", label: "Phone download", baseStatus: "Received", familyId: "phone" }),
]);

assert.equal(items.length, 2);
assert.equal(items[0].status, "MISSING");
assert.equal(items[1].status, "UNCLEAR");

const stats = buildDemoStatCounts(items, { missing: 1, incomplete: 1 });
assert.ok(stats.missing >= 1);
const readiness = buildDemoReadiness(
  { served: 2, missing: 1, incomplete: 1, referred: 0, notSafelyConfirmed: 0 },
  stats,
);
assert.equal(readiness.softLabel, true);
assert.ok(readiness.overallPct >= 0 && readiness.overallPct <= 95);

console.log("demo-overview-adapter.test.ts: PASS");
