#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  displaySolicitorStage,
  isPlaceholderHearingIso,
  parseHearingIsoFromListingText,
  resolveSolicitorHearingDateIso,
} from "../lib/criminal/solicitor-hearing-display";

assert.equal(isPlaceholderHearingIso("2026-01-01"), true);
assert.equal(isPlaceholderHearingIso("2026-01-01T00:00:00.000Z"), true);
assert.equal(isPlaceholderHearingIso("2026-07-15"), false);

assert.equal(
  parseHearingIsoFromListingText("PTPH listed — 15 July 2026, 10:00 at Northgate Magistrates' Court."),
  "2026-07-15",
);

assert.equal(
  resolveSolicitorHearingDateIso({
    bundleNextHearingIso: null,
    snapshotHearingNextAt: "2026-01-01",
    bundleHay: "PTPH listed — 15 July 2026, 10:00",
  }),
  "2026-07-15",
);

assert.equal(
  resolveSolicitorHearingDateIso({
    snapshotHearingNextAt: "2026-01-01",
    bundleHay: "",
  }),
  null,
);

assert.equal(displaySolicitorStage("pre ptph pre ptph"), "pre ptph");
assert.equal(displaySolicitorStage("pre_ptph pre_ptph"), "pre ptph");
assert.equal(displaySolicitorStage("pre ptph | pre ptph"), "pre ptph");
assert.equal(displaySolicitorStage("Stage: pre_ptph pre_ptph"), "pre ptph");

console.log("solicitor-hearing-display.test.ts: PASS");
