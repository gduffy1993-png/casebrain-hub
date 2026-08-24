#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  dedupeSolicitorAttentionByTitle,
  demoteSolicitorClutter,
  draftMisalignedToLabel,
  isChaseMergedChromeLine,
  isGenericSolicitorClutterLabel,
  sanitizeChaseMergedFrom,
} from "../lib/criminal/solicitor-signal-mute";

assert.equal(isGenericSolicitorClutterLabel("Exhibit mapping / provenance"), true);
assert.equal(isGenericSolicitorClutterLabel("MG6 / unused schedule clarification"), true);
assert.equal(isGenericSolicitorClutterLabel("digital disclosure schedule item"), true);
assert.equal(isGenericSolicitorClutterLabel("Additional source-material issues (13 on file)"), true);
assert.equal(isGenericSolicitorClutterLabel("Phone extraction/download status"), false);
assert.equal(isGenericSolicitorClutterLabel("CCTV full window / master footage"), false);
assert.equal(isGenericSolicitorClutterLabel("Interview transcript"), false);

const demoted = demoteSolicitorClutter(
  [
    { label: "Interview transcript" },
    { label: "Exhibit mapping / provenance" },
    { label: "digital disclosure schedule item" },
  ],
  (i) => i.label,
);
assert.deepEqual(
  demoted.map((d) => d.label),
  ["Interview transcript"],
);

const lastResort = demoteSolicitorClutter(
  [{ label: "MG6 / unused schedule clarification" }, { label: "Exhibit mapping / provenance" }],
  (i) => i.label,
);
assert.equal(lastResort.length, 1);

const deduped = dedupeSolicitorAttentionByTitle([
  { title: "digital disclosure schedule item" },
  { title: "digital disclosure schedule item" },
  { title: "CAD / dispatch log material" },
]);
assert.equal(deduped.length, 2);

assert.equal(isChaseMergedChromeLine("Further papers on the file"), true);
assert.equal(isChaseMergedChromeLine("Additional source-material issues (13 on file)"), true);
assert.equal(isChaseMergedChromeLine("Call data is"), true);
assert.equal(isChaseMergedChromeLine("Complainant MG11 statement"), false);

const cleaned = sanitizeChaseMergedFrom([
  "Complainant MG11 / source material",
  "Further papers on the file",
  "Additional source-material issues (13 on file)",
  "Call data is",
  "full custody and interview records",
]);
assert.deepEqual(cleaned, [
  "Complainant MG11 / source material",
  "full custody and interview records",
]);

assert.equal(
  draftMisalignedToLabel(
    "Complainant MG11 / source material",
    "Please provide MG6 / unused schedule clarification or confirm in writing why it is not available.",
  ),
  true,
);
assert.equal(
  draftMisalignedToLabel(
    "MG6 / unused schedule clarification",
    "Please provide MG6 / unused schedule clarification or confirm in writing why it is not available.",
  ),
  false,
);

console.log("solicitor-signal-mute.test.ts: PASS");
