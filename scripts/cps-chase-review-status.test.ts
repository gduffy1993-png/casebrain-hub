/**
 * CPS Chase: review-only rows must not wear Overdue/Due soon chips.
 * Missing rows that already carry Overdue (not merely an elapsed listing) stay Overdue.
 */
import assert from "node:assert/strict";
import {
  clampChaseOperationalStatus,
  computeCounters,
  displayChaseOperationalStatus,
  effectiveStatus,
  isReviewOnlyChaseMaterial,
  type DisclosureChaseItem,
} from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildDemoAttentionItems,
  buildDemoStatCounts,
} from "../components/criminal/demo-shell/demoOverviewAdapter";

function sample(
  partial: Partial<DisclosureChaseItem> &
    Pick<DisclosureChaseItem, "id" | "label" | "baseStatus" | "source">,
): DisclosureChaseItem {
  return {
    familyId: "cad_999",
    whyItMatters: "Review the cited source before relying on this item.",
    urgency: "high",
    deadlineLabel: "Listing on papers elapsed — confirm next listing / chase outstanding disclosure",
    evidenceAnchor: null,
    linkedRoute: null,
    draftChaseWording: "Please confirm status of the material.",
    courtLine: "Position remains provisional.",
    mergedFrom: [],
    ...partial,
  };
}

const missingOverdue = sample({
  id: "missing-1",
  label: "Full phone download / source extraction",
  baseStatus: "Overdue",
  source: "Crown / disclosure officer",
  familyId: "other",
  whyItMatters: "Original download / source export is outstanding on the disclosure papers.",
  provenance: {
    sourceDocumentTitle: null,
    sourceDocumentType: null,
    sourcePage: null,
    compiledPage: null,
    pageIdentityKnown: false,
    evidenceState: "missing",
    defendant: null,
    countNumber: null,
    unresolvedConflictOrLimitation: null,
  } as DisclosureChaseItem["provenance"],
});

const nscWithHearingElapsed = sample({
  id: "nsc-1",
  label: "CAD / 999 audio / control-room material",
  baseStatus: "Overdue",
  source: "Crown / disclosure officer (confirm on file)",
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
    unresolvedConflictOrLimitation:
      "Source reference present; exact document title/type and page still need checking.",
  } as DisclosureChaseItem["provenance"],
});

const unclearReferred = sample({
  id: "ref-1",
  label: "Exhibit mapping / provenance",
  baseStatus: "Due soon",
  source: "Crown / disclosure officer (confirm on file)",
  familyId: "exhibit_provenance",
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

assert.equal(clampChaseOperationalStatus(missingOverdue), "Overdue");
assert.equal(isReviewOnlyChaseMaterial(nscWithHearingElapsed), true);
assert.equal(clampChaseOperationalStatus(nscWithHearingElapsed), "Not safely confirmed");
assert.equal(clampChaseOperationalStatus(unclearReferred), "Not safely confirmed");

const medicalNotIncluded = sample({
  id: "med-1",
  label: "Final medical/forensic report",
  familyId: "medical_expert",
  baseStatus: "Overdue",
  source: "Crown / disclosure officer (confirm on file)",
  evidenceAnchor: "Medical / forensic note: final report not included",
  whyItMatters: "A short note is not a final report — keep the requested material limited to the report the source actually identifies.",
  mergedFrom: ["Final medical/forensic report not included"],
  provenance: {
    sourceDocumentTitle: null,
    sourceDocumentType: null,
    sourcePage: null,
    compiledPage: null,
    pageIdentityKnown: false,
    evidenceState: "missing",
    defendant: null,
    countNumber: null,
    unresolvedConflictOrLimitation: null,
  } as DisclosureChaseItem["provenance"],
});
assert.equal(
  isReviewOnlyChaseMaterial(medicalNotIncluded),
  false,
  "a note that the final report is not included is a gap, not review-only boilerplate",
);
assert.equal(clampChaseOperationalStatus(medicalNotIncluded), "Overdue");
assert.equal(displayChaseOperationalStatus("Not safely confirmed"), "Needs confirmation");
assert.equal(displayChaseOperationalStatus("Overdue"), "Overdue");

const counters = computeCounters(
  [
    { ...missingOverdue, baseStatus: clampChaseOperationalStatus(missingOverdue) },
    { ...nscWithHearingElapsed, baseStatus: clampChaseOperationalStatus(nscWithHearingElapsed) },
    { ...unclearReferred, baseStatus: clampChaseOperationalStatus(unclearReferred) },
  ],
  {},
);
assert.equal(counters.overdue, 1, "only genuine missing overdue counts");
assert.equal(counters.dueSoon, 0, "review-only due-soon must not count");
assert.ok(counters.notStarted >= 2, "review-only rows land in not-started/open bucket");

assert.equal(effectiveStatus(nscWithHearingElapsed, {}), "Not safely confirmed");
assert.equal(effectiveStatus(missingOverdue, {}), "Overdue");

const overviewItems = buildDemoAttentionItems([
  { ...missingOverdue, baseStatus: clampChaseOperationalStatus(missingOverdue) },
  { ...nscWithHearingElapsed, baseStatus: clampChaseOperationalStatus(nscWithHearingElapsed) },
]);
const stats = buildDemoStatCounts(overviewItems, { missing: 1, incomplete: 0 });
assert.ok(stats.missing >= 1, "overview keeps true missing");
assert.ok(
  overviewItems.some((i) => i.status === "UNCLEAR" || i.status === "INCOMPLETE"),
  "overview keeps review-only as open review, not overdue flatten",
);
assert.ok(
  !overviewItems.every((i) => i.status === "MISSING"),
  "review-only must not all become MISSING",
);

console.log("cps-chase-review-status.test.ts: PASS");
