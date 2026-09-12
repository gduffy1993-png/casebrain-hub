/**
 * A case may not wear another case's identity.
 *
 * Run: npx tsx scripts/identity-boundary-truth.test.ts
 */
import assert from "node:assert/strict";

import {
  demoPackConflictsWithSourceAllegation,
  foreignMatterRefs,
} from "../lib/criminal/case-identity-boundary";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks += 1;
}

console.log("another case's clothes stay on that case");

check("Vale robbery is not the Marcus Vale fraud pack", () => {
  assert.equal(
    demoPackConflictsWithSourceAllegation(
      "Robbery, contrary to section 8 Theft Act 1968",
      "Fraud by false representation",
    ),
    true,
  );
});

check("the real Marcus Vale demo still matches its own fraud allegation", () => {
  assert.equal(
    demoPackConflictsWithSourceAllegation(
      "Fraud by false representation, Fraud Act 2006 s.2",
      "Fraud by false representation",
    ),
    false,
  );
  assert.equal(
    demoPackConflictsWithSourceAllegation(
      "Offence wording not safely extracted",
      "Fraud by false representation",
    ),
    false,
  );
});

check("a chase line citing another CB-TB is foreign; the home ref is not", () => {
  const papers = "Matter ref CB-TB-039\nR v Marcus Andrew Vale\nRobbery";
  assert.deepEqual(foreignMatterRefs(papers, "Please serve O1 from CB-TB-1925"), ["CB-TB-1925"]);
  assert.deepEqual(foreignMatterRefs(papers, "O1 Full interview transcript — CB-TB-039"), []);
});

check("a cover line name then Case ID then Charge is still the defendant", () => {
  const cover = [
    "Isaac Patel",
    "Case ID: 7e763777-94a0-4cfc-af01-e6595d1cdfc4",
    "Charge: Affray",
    "Court: Southford Magistrates' Court",
    "First Appearance: 25 August 2026",
    "Interview summary is on file. Full interview recording remains outstanding.",
  ].join("\n");
  assert.equal(extractBundleCaseMetadata(cover).defendantName, "Isaac Patel");
});

check("glued DefendantIsaacPatel and ALL CAPS R v are File identity, not a blank heading", () => {
  assert.equal(
    extractBundleCaseMetadata(
      "CHARGE SHEET\nDefendantIsaacPatel\nDOB: 12/04/2004\nCharge\nAffray\ncontrary to section 3 Public Order Act 1986\nParticulars: On 22 August 2026 the defendant is alleged to have used unlawful violence.",
    ).defendantName,
    "Isaac Patel",
  );
  assert.equal(
    extractBundleCaseMetadata(
      "CASE PAPERS\nR V ISAAC PATEL\nCharge: Affray contrary to section 3 Public Order Act 1986\nThe papers are served for the listed hearing.",
    ).defendantName,
    "Isaac Patel",
  );
});

check("instruction prose is not the client, and an old allocation date is not the current listing", () => {
  const kitchen = extractBundleCaseMetadata(`
OLD CASE COVER - SUPERSEDED
Old magistrates allocation sheet shows next hearing 01 January 2024 and an old assault-only description.
Do not treat this as the live date or complete charge position.
DefendantRiley NorthSingle client unless document says otherwise
CourtNorthshire Crown CourtCrown Court listed venue
Next hearing17 June 2026 at 14:00PTPH - live current listing
Charge wording should be treated as primary until superseded
CASE PROGRESSION EMAIL
Sent 08 June 2026: Matter adjourned to 17 June 2026 at 14:00 for PTPH at Northshire Crown Court.
  `);
  assert.equal(kitchen.defendantName, "Riley North");
  assert.doesNotMatch(kitchen.defendantName ?? "", /unless|document|otherwise/i);
  assert.match(kitchen.nextHearingRaw ?? "", /17 June 2026/i);
  assert.doesNotMatch(kitchen.nextHearingRaw ?? "", /January 2024|01 Jan/i);
  assert.match(kitchen.court ?? "", /Northshire Crown Court/i);
  assert.doesNotMatch(kitchen.court ?? "", /Court Court|Crown Court Crown/i);
});

check("a sole old next-hearing date still extracts when nothing later supersedes it", () => {
  const onlyOld = extractBundleCaseMetadata(
    "Defendant: Jane Cole\nCourt: Northgate Magistrates' Court\nNext hearing: 01 January 2024\nCharge: Theft",
  );
  assert.equal(onlyOld.defendantName, "Jane Cole");
  assert.match(onlyOld.nextHearingRaw ?? "", /01 January 2024/i);
  assert.match(onlyOld.offenceDisplay ?? onlyOld.offenceWording ?? "", /theft/i);
});

check("two equal-weight current next-hearing dates stay blank rather than picking the first", () => {
  const clash = extractBundleCaseMetadata(
    "Defendant: Jane Cole\nNext hearing: 12 March 2026 at 10:00\nNext hearing: 19 June 2026 at 14:00\nCharge: Theft",
  );
  assert.equal(
    clash.nextHearingRaw,
    null,
    `conflicting current listings must not confidently pick one — got ${clash.nextHearingRaw}`,
  );
});

check("Court glue does not emit Court Court or a police-station prefix", () => {
  const greene = extractBundleCaseMetadata(
    `AccusedLeo Greene DOB 07/07/1990Stagetrial listed in 7 days
Police stationNorthgate Police StationCourtNorthshire Magistrates Court
StatusremandNext hearing18/08/2026`,
  );
  assert.equal(greene.court, "Northshire Magistrates Court");
  assert.doesNotMatch(greene.court ?? "", /^Court\s|Court Court|days|Police station/i);
});

check("Charge: Affray on a cover line is the charge, including the live Patel extract", () => {
  const patel = extractBundleCaseMetadata(
    [
      "Isaac Patel",
      "Case ID: 7e763777-94a8-4958-a190-a35ef6ddb259",
      "Charge: Affray",
      "Court: Southford Magistrates' Court",
      "First Appearance: 25 August 2026",
    ].join("\n"),
  );
  assert.equal(patel.defendantName, "Isaac Patel");
  assert.match(patel.offenceDisplay ?? patel.offenceWording ?? "", /affray/i);
  assert.match(patel.court ?? "", /Southford Magistrates/i);
});

check("quiet arrest-only papers still have no listing", () => {
  const carter = extractBundleCaseMetadata(
    "CASE: R v Liam Carter\nDATE OF ARREST: 03/02/2025\nThe male was arrested on suspicion of burglary.",
  );
  assert.equal(carter.nextHearingRaw, null);
  assert.match(carter.offenceDisplay ?? carter.offenceWording ?? "", /burglary/i);
});

check("tab furniture is not a defendant; a real surname Chase still is", () => {
  const chrome = extractBundleCaseMetadata(
    "Client Summary\nCPS Chase\nFile & Preparation\nNo documents uploaded.",
  );
  assert.equal(chrome.defendantName, null);
  assert.equal(
    extractBundleCaseMetadata("Defendant: Jordan Chase\nCharge: Theft\nNext hearing: 15 July 2026").defendantName,
    "Jordan Chase",
  );
});

console.log(`identity-boundary-truth: ${checks} checks passed`);
