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

const stats = buildDemoStatCounts(items, { missing: 9, incomplete: 9 });
assert.equal(stats.missing, 1, "Overview missing chip follows attention MISSING count");
assert.equal(stats.incomplete, 1, "Overview incomplete chip follows attention UNCLEAR/INCOMPLETE");
assert.equal(stats.activeChases, 0);
assert.equal(stats.openReviewItems, 2);
const readiness = buildDemoReadiness(
  { served: 2, missing: 1, incomplete: 1, referred: 0, notSafelyConfirmed: 0 },
  stats,
);
assert.equal(readiness.softLabel, true);
assert.ok(readiness.overallPct >= 0 && readiness.overallPct <= 95);
assert.ok(readiness.toBeChasedPct > 0);

const chased = buildDemoAttentionItems([
  sample({ id: "4", label: "CCTV continuity", baseStatus: "Chased" }),
]);
assert.equal(buildDemoStatCounts(chased, { missing: 0, incomplete: 0 }).activeChases, 1);
assert.equal(buildDemoStatCounts(chased, { missing: 0, incomplete: 0 }).openReviewItems, 1);

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

const cctvContinuity = buildDemoAttentionItems([
  sample({
    id: "8",
    label: "CCTV Continuity / provenance",
    baseStatus: "Not safely confirmed",
    whyItMatters: "Review the cited source before relying on this item; record whether the material is served, incomplete, unclear or still awaited.",
    draftChaseWording: "Please provide CCTV Continuity / provenance or confirm in writing why it is not available.",
  }),
])[0];
assert.equal(cctvContinuity.title, "CCTV continuity / provenance");
assert.doesNotMatch(cctvContinuity.blurb, /Review the cited source before relying/i);
assert.match(cctvContinuity.recommendedAction, /CCTV continuity/);
assert.doesNotMatch(cctvContinuity.recommendedAction, /CCTV Continuity/);
assert.doesNotMatch(cctvContinuity.recommendedAction, /provide the CCTV continuity \/ provenance/i);
assert.match(cctvContinuity.recommendedAction, /continuity record, provenance material/i);

const phoneUnresolved = buildDemoAttentionItems([
  sample({
    id: "9",
    label: "Full phone download outstanding",
    baseStatus: "Outstanding",
    familyId: "phone",
    whyItMatters: "Phone download / source extraction status unresolved on papers.",
    source: "Crown / disclosure officer (confirm on file)",
    draftChaseWording: "",
  }),
])[0];
assert.equal(phoneUnresolved.status, "UNCLEAR");
assert.equal(phoneUnresolved.title, "Phone extraction/download status");
assert.doesNotMatch(phoneUnresolved.recommendedAction, /outstanding/i);
assert.match(phoneUnresolved.recommendedAction, /Confirm whether any phone extraction/i);

const phoneDupes = buildDemoAttentionItems([
  sample({
    id: "p1",
    label: "Phone extraction/download status / source extraction",
    baseStatus: "Outstanding",
    familyId: "phone",
    whyItMatters: "Original download / source export is outstanding on the disclosure papers.",
    source: "Crown / disclosure officer (confirm on file)",
  }),
  sample({
    id: "p2",
    label: "full phone download / source export",
    baseStatus: "Outstanding",
    familyId: "phone",
    urgency: "high",
    whyItMatters: "Full phone download / source export outstanding.",
    source: "Crown / disclosure officer",
  }),
]);
assert.equal(phoneDupes.length, 1, "phone extract + full download collapse on Overview attention");
assert.equal(phoneDupes[0].title, "Phone extraction/download status");

const clutterMuted = buildDemoAttentionItems([
  sample({
    id: "c1",
    label: "CCTV full window / master footage",
    baseStatus: "Outstanding",
    familyId: "cctv_master",
    whyItMatters: "Full CCTV master remains outstanding.",
  }),
  sample({
    id: "c2",
    label: "Exhibit mapping / provenance",
    baseStatus: "Not safely confirmed",
    familyId: "exhibit_provenance",
    whyItMatters:
      "Review the cited source before relying on this item; record whether the material is served, incomplete, unclear or still awaited.",
  }),
  sample({
    id: "c3",
    label: "MG6 / unused schedule clarification",
    baseStatus: "Not safely confirmed",
    familyId: "mg6_unused",
    whyItMatters:
      "Review the cited source before relying on this item; record whether the material is served, incomplete, unclear or still awaited.",
  }),
  sample({
    id: "c4",
    label: "digital disclosure schedule item",
    baseStatus: "Not safely confirmed",
    familyId: "mg6_unused",
    whyItMatters: "Source status needs confirming before this item is relied on.",
  }),
]);
assert.equal(clutterMuted.length, 1, "generic exhibit/MG6/schedule clutter muted when CCTV gap exists");
assert.equal(clutterMuted[0].title, "CCTV full window / master footage");

const clutterOnly = buildDemoAttentionItems([
  sample({
    id: "g1",
    label: "MG6 / unused schedule clarification",
    baseStatus: "Not safely confirmed",
    familyId: "mg6_unused",
  }),
  sample({
    id: "g2",
    label: "Exhibit mapping / provenance",
    baseStatus: "Not safely confirmed",
    familyId: "exhibit_provenance",
  }),
]);
assert.equal(clutterOnly.length, 0, "thin papers: no fake last-resort exhibit/MG6 row");

const brookesChipAlign = buildDemoAttentionItems([
  sample({
    id: "b1",
    label: "Phone extraction/download status",
    baseStatus: "Outstanding",
    familyId: "phone",
    whyItMatters: "Original download / source export is outstanding on the disclosure papers.",
    source: "Crown / disclosure officer (confirm on file)",
  }),
]);
const brookesStats = buildDemoStatCounts(brookesChipAlign, { missing: 2, incomplete: 1, notSafelyConfirmed: 1 });
assert.equal(brookesStats.openReviewItems, 1);
assert.equal(brookesStats.missing + brookesStats.incomplete, 1, "chips cannot exceed attention length after mute");

console.log("demo-overview-adapter.test.ts: PASS");
