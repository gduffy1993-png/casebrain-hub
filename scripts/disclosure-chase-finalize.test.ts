import assert from "node:assert/strict";
import {
  humanizeChaseFragmentLabel,
  isRawChaseFragmentLabel,
  finalizeDisclosureChasePresentation,
} from "../lib/criminal/disclosure-chase-finalize";
import type { DisclosureChaseItem } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { lintWeirdness } from "../lib/criminal/weirdness-detector";

assert.equal(isRawChaseFragmentLabel("MG11 witness statement | 4-5 |"), true);
assert.equal(isRawChaseFragmentLabel("Body-worn video (BWV)"), false);

assert.equal(humanizeChaseFragmentLabel("Screenshot pack (served) | 5 |"), "Screenshot / message pack");
assert.equal(
  humanizeChaseFragmentLabel("MG6C/001 — Phone extraction — summary only, source download outstanding."),
  "Phone extraction source material",
);
assert.equal(humanizeChaseFragmentLabel("MG11 — COMPLAINANT STATEMENT (draft unsigned)"), "Complainant MG11 statement");

const sampleItem = (label: string, familyId: DisclosureChaseItem["familyId"] = "other"): DisclosureChaseItem => ({
  id: "test",
  familyId,
  label,
  whyItMatters: "Test",
  source: "CPS",
  baseStatus: "Outstanding",
  urgency: "medium",
  deadlineLabel: "Before hearing",
  evidenceAnchor: label,
  linkedRoute: null,
  draftChaseWording: `Please provide ${label}`,
  courtLine: `The defence asks the court to record that ${label} appears outstanding.`,
  mergedFrom: [label, label, label],
});

const finalized = finalizeDisclosureChasePresentation([
  sampleItem("Screenshot pack (served) | 5 |", "mg6_unused"),
  sampleItem("Screenshot pack (served) | 5 |", "mg6_unused"),
  sampleItem("MG6C/003 — Subscriber data — outstanding.", "mg6_unused"),
]);

assert.ok(finalized.length <= 2, "duplicate screenshot rows should collapse");
assert.ok(
  finalized.every((item) => !isRawChaseFragmentLabel(item.label)),
  "final labels should not be raw fragments",
);
assert.ok(
  finalized.every((item) => !/;\s*Screenshot pack \(served\)/i.test(item.courtLine)),
  "court lines should not repeat semicolon soup",
);

const weirdness = lintWeirdness({
  caseId: "finalize-smoke",
  profile: "needs_review",
  offenceFamily: "generic",
  allegation: "Harassment",
  outputText: finalized.map((i) => [i.label, i.draftChaseWording, i.courtLine].join("\n")).join("\n"),
  chaseLabels: finalized.map((i) => i.label),
  chaseDrafts: finalized.map((i) => i.draftChaseWording),
});

assert.equal(
  weirdness.some((f) => f.kind === "raw_fragment_label"),
  false,
  "raw_fragment_label should clear after finalize",
);

const overflowBucket = finalizeDisclosureChasePresentation([
  {
    ...sampleItem("MG6C/003 — Subscriber data — outstanding.", "other"),
    mergedFrom: [
      "MG6C/003 — Subscriber data — outstanding.",
      "Screenshot pack (served) | 5 |",
      "Phone extraction source material",
      "Complainant MG11 statement",
      "message exports",
    ],
    label: "Additional source-material issues (11 on file)",
  },
]);

assert.ok(overflowBucket.length >= 1);
const overflowItem = overflowBucket.find((i) =>
  /outstanding source material/i.test(i.label),
);
assert.ok(overflowItem, "expected human overflow card label");
assert.doesNotMatch(overflowItem!.label, /additional source-material issues \(\d+ on file\)/i);
assert.match(overflowItem!.draftChaseWording!, /Please provide the outstanding source material identified on the disclosure schedule/i);

console.log("disclosure-chase-finalize.test.ts: all assertions passed");
