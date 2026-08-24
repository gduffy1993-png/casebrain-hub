/**
 * Solicitor shortlist freeze — brief owns primary; Overview is pure projection.
 */
import assert from "node:assert/strict";
import {
  assembleSolicitorShortlist,
  clampChaseOperationalStatus,
  collapseSolicitorPhoneDownloadDoubles,
  type DisclosureChaseItem,
} from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildDemoAttentionItems,
  buildDemoStatCounts,
} from "../components/criminal/demo-shell/demoOverviewAdapter";

function sample(
  partial: Partial<DisclosureChaseItem> &
    Pick<DisclosureChaseItem, "id" | "label" | "baseStatus">,
): DisclosureChaseItem {
  return {
    familyId: "other",
    whyItMatters: "Original download / source export is outstanding on the disclosure papers.",
    source: "Crown / disclosure officer",
    urgency: "high",
    deadlineLabel: "Before next listing",
    evidenceAnchor: null,
    linkedRoute: null,
    draftChaseWording: "Please provide the material.",
    courtLine: "Position remains provisional.",
    mergedFrom: [],
    ...partial,
  };
}

// Phone extract + full download collapse at brief time
const collapsed = collapseSolicitorPhoneDownloadDoubles([
  sample({
    id: "p1",
    label: "Phone extraction source material",
    baseStatus: "Outstanding",
  }),
  sample({
    id: "p2",
    label: "Full phone download / source extraction",
    baseStatus: "Outstanding",
  }),
  sample({
    id: "s1",
    label: "Subscriber / account data",
    baseStatus: "Outstanding",
    whyItMatters: "Subscriber report outstanding on papers.",
  }),
]);
assert.equal(
  collapsed.filter((i) => /phone|download|extraction/i.test(i.label) && !/subscriber/i.test(i.label))
    .length,
  1,
  "phone extract + full download collapse to one",
);
assert.equal(
  collapsed.filter((i) => /Subscriber/i.test(i.label)).length,
  1,
  "subscriber stays distinct",
);

// SIDE clutter + served out of shortlist; fake thin row gone
const short = assembleSolicitorShortlist([
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
  }),
  sample({
    id: "c3",
    label: "MG6 / unused schedule clarification",
    baseStatus: "Not safely confirmed",
    familyId: "mg6_unused",
  }),
  sample({
    id: "served",
    label: "Interview transcript",
    baseStatus: "Received",
    familyId: "interview",
  }),
]);
assert.deepEqual(
  short.primaryItems.map((i) => i.label),
  ["CCTV full window / master footage"],
);
assert.equal(short.additionalItems.length, 0, "no Other resurrection");
assert.equal(short.items.length, short.primaryItems.length);

const thin = assembleSolicitorShortlist([
  sample({
    id: "g1",
    label: "Exhibit mapping / provenance",
    baseStatus: "Not safely confirmed",
    familyId: "exhibit_provenance",
  }),
]);
assert.equal(thin.primaryItems.length, 0, "thin papers stay quiet — no fake row");

// Dunn-like review must not become Overdue/Missing
const dunnCad = sample({
  id: "d1",
  label: "CAD / dispatch log material",
  baseStatus: "Overdue",
  familyId: "cad_999",
  source: "Police control room",
  whyItMatters:
    "Review the cited source before relying on this item; record whether the material is served, incomplete, unclear or still awaited.",
  provenance: {
    sourceDocumentTitle: null,
    sourceDocumentType: null,
    sourcePage: null,
    compiledPage: null,
    pageIdentityKnown: false,
    evidenceState: "not_safely_confirmed",
    defendant: null,
    countNumber: null,
    unresolvedConflictOrLimitation: null,
  } as DisclosureChaseItem["provenance"],
});
assert.equal(clampChaseOperationalStatus(dunnCad), "Not safely confirmed");

const dunnCustody = sample({
  id: "d2",
  label: "Full custody record / PACE material",
  baseStatus: "Outstanding",
  familyId: "custody_pace",
  whyItMatters:
    "Custody/PACE material is referred to in limited form — chase the full record before assessing safeguards or interview fairness.",
  provenance: {
    sourceDocumentTitle: null,
    sourceDocumentType: null,
    sourcePage: null,
    compiledPage: null,
    pageIdentityKnown: false,
    evidenceState: "referred_only",
    defendant: null,
    countNumber: null,
    unresolvedConflictOrLimitation: null,
  } as DisclosureChaseItem["provenance"],
});
assert.equal(clampChaseOperationalStatus(dunnCustody), "Not safely confirmed");

// TOC / strategy anchors stripped
const anchored = assembleSolicitorShortlist([
  sample({
    id: "a1",
    label: "Full custody record / PACE material",
    baseStatus: "Not safely confirmed",
    familyId: "custody_pace",
    whyItMatters: "Custody/PACE material is referred to in limited form.",
    evidenceAnchor: "5Custody / interview / CAD material7",
    provenance: {
      sourceDocumentTitle: null,
      sourceDocumentType: null,
      sourcePage: null,
      compiledPage: null,
      pageIdentityKnown: false,
      evidenceState: "referred_only",
      defendant: null,
      countNumber: null,
      unresolvedConflictOrLimitation: null,
    } as DisclosureChaseItem["provenance"],
  }),
]);
assert.equal(anchored.primaryItems[0]?.evidenceAnchor, null, "TOC chrome not an evidence anchor");

// Overview pure projection: chips == primary length / status
const frozen = assembleSolicitorShortlist([
  sample({
    id: "b1",
    label: "Full phone download / source extraction",
    baseStatus: "Outstanding",
    whyItMatters: "Original download / source export is outstanding on the disclosure papers.",
  }),
  sample({
    id: "b2",
    label: "Phone extraction source material",
    baseStatus: "Outstanding",
    whyItMatters: "Extraction summary only — full download outstanding.",
  }),
]).primaryItems;
const attention = buildDemoAttentionItems(frozen);
const stats = buildDemoStatCounts(attention, { missing: 99, incomplete: 99 });
assert.equal(attention.length, frozen.length, "Overview maps primary 1:1");
assert.equal(stats.openReviewItems, frozen.length);
assert.equal(stats.openReviewItems, 1, "phone double collapsed before Overview");
assert.ok(stats.missing + stats.incomplete === 1);

console.log("solicitor-shortlist-freeze.test.ts: PASS");
