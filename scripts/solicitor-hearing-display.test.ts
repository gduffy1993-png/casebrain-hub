#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  displaySolicitorStage,
  isPlaceholderHearingIso,
  parseHearingIsoFromListingText,
  resolveSolicitorHearingDateIso,
} from "../lib/criminal/solicitor-hearing-display";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const packA =
  "Accused: SAM REES (DOB 17/09/1991)\nShort title: Robbery + s.47\nPlease confirm outstanding items before next hearing.";
assert.equal(
  resolveSolicitorHearingDateIso({
    bundleNextHearingIso: "1991-09-17",
    bundleHay: packA,
  }),
  null,
  "DOB must not become a hearing",
);

const jordan =
  "Statement of Offence:\nAssault an emergency worker\nParticulars of Offence:\nOn 12 March 2026 at Central Park assaulted PC Daniels\nPTPH listed — 22 July 2026, 14:00, Central Park Magistrates' Court.";
assert.equal(
  resolveSolicitorHearingDateIso({
    bundleNextHearingIso: "2026-03-12",
    bundleHay: jordan,
  }),
  "2026-07-22",
  "offence date must lose to labelled PTPH",
);

assert.equal(
  resolveSolicitorHearingDateIso({
    bundleHay: "Next hearing: 12 September 2026 at 09:45\nDate of Birth: 03/12/1989",
  }),
  "2026-09-12",
);

assert.equal(
  resolveSolicitorHearingDateIso({
    bundleNextHearingIso: "2026-09-04",
  }),
  "2026-09-04",
  "bare stored ISO with no hay stays",
);

const packAFile = readFileSync(resolve("docs/fictional-cases-40/NS-CPS-2026-0401.txt"), "utf8");
assert.equal(extractBundleCaseMetadata(packAFile).nextHearingIso, null, "Pack A extractor must not store the DOB");

const jordanFile = readFileSync(resolve("docs/cb-fresh-adversarial/sources/CB-FRESH-002_Jordan_Hale.txt"), "utf8");
assert.equal(extractBundleCaseMetadata(jordanFile).nextHearingIso, "2026-07-22");

console.log("solicitor-hearing-display.test.ts: PASS");
