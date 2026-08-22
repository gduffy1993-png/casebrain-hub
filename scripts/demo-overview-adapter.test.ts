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
assert.equal(stats.activeChases, 0);
const readiness = buildDemoReadiness(
  { served: 2, missing: 1, incomplete: 1, referred: 0, notSafelyConfirmed: 0 },
  stats,
);
assert.equal(readiness.softLabel, true);
assert.ok(readiness.overallPct >= 0 && readiness.overallPct <= 95);

const chased = buildDemoAttentionItems([
  sample({ id: "4", label: "CCTV continuity", baseStatus: "Chased" }),
]);
assert.equal(buildDemoStatCounts(chased, { missing: 0, incomplete: 0 }).activeChases, 1);

const deadlineOnly = buildDemoAttentionItems([
  sample({
    id: "5",
    label: "MG11 first account",
    baseStatus: "Outstanding",
    deadlineLabel: "Hearing date passed",
    draftChaseWording: "",
  }),
])[0];
assert.match(deadlineOnly.recommendedAction, /^Chase MG11 first account/);
assert.notEqual(deadlineOnly.recommendedAction, "Hearing date passed");

const longReason = `${"This explanation keeps running because it contains a source-backed limitation ".repeat(4)}and should not cut mid-word.`;
const longItem = buildDemoAttentionItems([
  sample({
    id: "6",
    label: "Long reason",
    baseStatus: "Outstanding",
    whyItMatters: longReason,
  }),
])[0];
assert.ok(longItem.blurb.endsWith("…"));
assert.doesNotMatch(longItem.blurb, /\s$/);
assert.doesNotMatch(longItem.blurb, /[A-Za-z]{25,}…$/);

const numericPage = buildDemoAttentionItems([
  sample({
    id: "7",
    label: "Numeric page",
    baseStatus: "Outstanding",
    provenance: {
      sourceDocumentTitle: "MG6C Statement",
      sourceDocumentType: "mg6c",
      sourcePage: 42,
      compiledPage: null,
      pageIdentityKnown: true,
      evidenceState: "missing",
      defendant: null,
      countNumber: null,
      unresolvedConflictOrLimitation: null,
    } as DisclosureChaseItem["provenance"],
  }),
])[0];
assert.ok(numericPage.sources.includes("MG6C Statement p.42"));

console.log("demo-overview-adapter.test.ts: PASS");
