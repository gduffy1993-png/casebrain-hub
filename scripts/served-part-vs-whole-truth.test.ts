/**
 * A part of a thing is not the thing, and a row that says it is absent is not proof it is present.
 *
 * Hale's papers state, by exhibit reference, that the CCTV master footage, the original CAD and 999
 * audio and the full custody record are outstanding. The same references appear again further down as
 * served summaries. Three of the four stated gaps never reached the chase board because the summary
 * was taken to answer the request for the whole — and in one case because a row labelled "Full 999
 * audioNot yet" was recorded as served, its own wording contradicting its state.
 *
 * Both directions are asserted here: the request for the whole survives a served part, and a served
 * whole still closes a request for the whole. Otherwise the fix would simply stop the app ever
 * agreeing that anything is on file.
 */
import assert from "node:assert/strict";

import { shouldSuppressChaseAsAlreadyOnFile } from "../lib/criminal/evidence-state-reconcile";
import { isFragmentEvidenceLabel } from "../lib/criminal/build-from-document-units";

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

console.log("a served part does not answer a request for the whole");

check("served CCTV stills do not close the master footage gap", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("CCTV stills and timing note Master footage", [
    { label: "CCTV Stills Estate Entrance", state: "served" },
  ]);
  assert.equal(r.suppress, false);
});

check("a served CAD summary does not close the original audio gap", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("CAD and 999 summaries Original audio/log", [
    { label: "CAD Summary", state: "served" },
  ]);
  assert.equal(r.suppress, false);
});

check("a served custody summary does not close the full record gap", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("Custody record summary Full record", [
    { label: "Custody Record Summary", state: "served" },
  ]);
  assert.equal(r.suppress, false);
});

check("a row whose own wording denies service proves nothing", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("Original 999 audio", [
    { label: "Full 999 audioNot yet", state: "served" },
  ]);
  assert.equal(r.suppress, false);
});

console.log("the opposite direction: real service still closes a request");

check("a served full record closes a request for the full record", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("Full custody record", [
    { label: "Full custody record", state: "served" },
  ]);
  assert.equal(r.suppress, true);
});

check("a served master export closes a request for the master", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("Master CCTV export", [
    { label: "Master CCTV export", state: "served" },
  ]);
  assert.equal(r.suppress, true);
});

check("a summary request is still answered by a served summary", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("CAD summary", [
    { label: "CAD Summary", state: "served" },
  ]);
  assert.equal(r.suppress, true);
});

console.log("bundle furniture and welded status are not evidence rows");

for (const fake of [
  "CCTV SECTION",
  "Reference areaBundle detailCaution CCTV Stills",
  "Full 999 audioNot yet",
  "estate and arguing with MarcusCCTV stills were",
  "SECTION — SUMMARY Custody record summary is",
  "witness/CCTV sequence Second male attributionNot excluded",
]) {
  check(`rejected: ${fake}`, () => assert.equal(isFragmentEvidenceLabel(fake), true));
}

console.log("real material is still accepted");

for (const real of [
  "CCTV Stills Estate Entrance",
  "Scene photograph index",
  "Full custody record",
  "MG11 Jordan Pike",
  "Missing person report",
  "iPhone download",
  "Original CAD incident log",
]) {
  check(`accepted: ${real}`, () => assert.equal(isFragmentEvidenceLabel(real), false));
}

console.log(`served-part-vs-whole-truth: PASS (${checks} checks)`);
