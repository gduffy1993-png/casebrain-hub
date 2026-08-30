#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  classifyPaperDateRoles,
  displaySolicitorStage,
  isPlaceholderHearingIso,
  parseHearingIsoFromListingText,
  resolveSolicitorHearingDateIso,
} from "../lib/criminal/solicitor-hearing-display";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
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

const taylorFile = readFileSync(resolve("docs/cb-fresh-adversarial/sources/CB-FRESH-001_Taylor_Brookes.txt"), "utf8");
assert.equal(
  resolveSolicitorHearingDateIso({
    bundleNextHearingIso: "2026-01-01",
    bundleHay: taylorFile,
  }),
  "2026-07-15",
);
assert.equal(extractBundleCaseMetadata(taylorFile).nextHearingIso?.slice(0, 10), "2026-07-15");

assert.equal(
  resolveSolicitorHearingDateIso({
    bundleHay:
      "Particulars: On 1 April 2024 at Northshire stole goods.\nPTPH listed — 14 May 2024.",
  }),
  "2024-05-14",
  "later labelled listing is the hearing; earlier particulars are when it happened",
);

assert.equal(
  resolveSolicitorHearingDateIso({
    bundleNextHearingIso: "2024-04-01",
    bundleHay: "On 1 April 2024 at the shop stole goods. Interview 20 April 2024. No listing.",
  }),
  null,
  "offence date is not a hearing just because it is in the last 10 years",
);

assert.equal(
  resolveSolicitorHearingDateIso({
    bundleHay: "On 22 July 2026 at court the PTPH took place.\nPTPH listed — 12 March 2026.",
  }),
  null,
  "a listing before the offence date is not plausible",
);

const tenYearHay =
  "Accused: PAT LEE (DOB 04/02/1988)\nOn 3 June 2016 at High Street stole goods.\nPTPH listed — 19 September 2026.";
const tenYearRoles = classifyPaperDateRoles(tenYearHay);
assert.equal(tenYearRoles.latestOffenceIso, "2016-06-03");
assert.ok(tenYearRoles.dobs.has("1988-02-04"));
assert.equal(tenYearRoles.listingIso, "2026-09-19");
assert.equal(
  resolveSolicitorHearingDateIso({ bundleHay: tenYearHay, bundleNextHearingIso: "1988-02-04" }),
  "2026-09-19",
  "old offence stays the offence; later labelled listing is the hearing",
);
assert.equal(
  extractBundleCaseMetadata(tenYearHay).nextHearingIso,
  "2026-09-19",
  "extractor must store the listing, not the DOB or the 2016 offence",
);

const packAHeader = resolveCaseHeaderMetadata({
  snapshot: null,
  bundleText: packAFile,
  bundleMetadata: extractBundleCaseMetadata(packAFile),
});
assert.doesNotMatch(packAHeader.nextHearing, /1991|17 Sep/, "header must not print the DOB");
assert.match(packAHeader.nextHearing, /no hearing date safely extracted|not confirmed/i);

console.log("solicitor-hearing-display.test.ts: PASS");
