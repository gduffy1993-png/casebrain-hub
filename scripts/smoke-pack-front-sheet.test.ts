/**
 * Labelled smoke-pack / front-sheet extraction — CB-CHARGE-2026-0039.
 * Run: npx tsx scripts/smoke-pack-front-sheet.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildDemoKeyDefenceIssues } from "../components/criminal/demo-shell/demoOverviewAdapter";
import { fileBackedMatterTitle } from "../components/criminal/workflow/workflowPilotDisplay";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { resolveDemoProfileFromContext } from "../lib/criminal/pilot-workflow";
import {
  extractSmokePackFrontSheet,
  smokePackOutstandingChaseDrafts,
} from "../lib/criminal/smoke-pack-front-sheet";

const VALE_BELL_PACK = `
CB-CHARGE-2026-0039 - Charge Coverage Smoke Pack
Page 1 of 5 - Drug driving
FICTIONAL EVALUATION PDF - GOLD ANSWER SEPARATE
COVER / CASE HEADER
FICTIONAL CASEBRAIN CHARGE COVERAGE SMOKE PACK. Not a real case. No real people, police
material, addresses or phone numbers.
Case reference: CB-CHARGE-2026-0039
Case title: Drug driving - Vale Bell
Defendant: Vale Bell
DOB: 12/11/1993
Police station: Meadowgate Police Station
Court/stage: Riverton Crown Court / trial tomorrow
Bail/RUI/remand: bail
Purpose: smoke-test safe handling of different offence families.

CHARGE / ALLEGATION
Offence family: Drug driving
Exact charge wording: On 16/07/2026 at Eastmere Bus Station, Vale Bell is alleged to have driven
a motor vehicle with a specified controlled drug above the prescribed limit.
Proof pressure: driver identity and toxicology procedure

MG5 SUMMARY
Crown version: The Crown relies on the allegation as charged: On 16/07/2026 at Eastmere Bus
Station, Vale Bell is alleged to have driven a motor vehicle with a specified controlled drug
above the prescribed limit.
PC Rowan Vale and Marcus Hale are named only as narrative/witness names.

MG6 / DISCLOSURE POSITION
Outstanding material: source material for driver identity and toxicology procedure; full
continuity/provenance; any offence-specific expert or statutory material needed for solicitor
review
CaseBrain should not invent offence elements. Solicitor review remains required.

INTERVIEW / STRATEGY / EXHIBITS
Interview/client account: Account conflicts with one witness statement and requires solicitor
review.
This should not be overstated because: Drug driving may require offence-specific solicitor
review.
`;

function chaseBrief(bundleText: string) {
  return buildDisclosureChaseBrief({
    caseId: "smoke-pack-0039",
    caseTitle: "Drug driving - Vale Bell",
    clientLabel: "Vale Bell",
    allegation: "Drug driving",
    stage: "trial tomorrow",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "Review papers",
    positionStatus: "Position not safely recorded yet",
    battleboard: null,
    snapshotMissing: [],
    proceduralOutstanding: [],
    bundleText,
  });
}

const sheet = extractSmokePackFrontSheet(VALE_BELL_PACK);
const meta = extractBundleCaseMetadata(VALE_BELL_PACK);
assert.equal(sheet.detected, true);
assert.equal(sheet.provisional, true);
assert.equal(sheet.solicitorReviewRequired, true);

// 1. Defendant label sets client/title to Vale Bell.
assert.equal(sheet.defendantName, "Vale Bell");
assert.equal(meta.defendantName, "Vale Bell");
assert.equal(fileBackedMatterTitle(sheet.caseTitle, sheet.defendantName), "Vale Bell");

// 2. Exact charge wording sets drug-driving charge.
assert.match(sheet.exactChargeWording ?? "", /controlled drug above the prescribed limit/i);
assert.match(meta.offenceWording ?? "", /controlled drug|drug driving/i);
assert.match(meta.offenceDisplay ?? meta.offenceWording ?? "", /drug/i);

// 3. Court/stage sets Riverton Crown Court / trial tomorrow.
assert.equal(meta.court, "Riverton Crown Court");
assert.match(meta.stage ?? "", /trial tomorrow/i);
assert.equal(`${meta.court} / ${meta.stage}`, "Riverton Crown Court / trial tomorrow");

// 4. Outstanding material creates source-backed review/chase items.
const drafts = smokePackOutstandingChaseDrafts(VALE_BELL_PACK);
assert.ok(drafts.length >= 2, "labelled outstanding material splits into review items");
assert.ok(drafts.some((item) => /driver identity and toxicology procedure/i.test(item.label)));
assert.ok(drafts.every((item) => /Outstanding material:/i.test(item.evidenceAnchor)));
const brief = chaseBrief(VALE_BELL_PACK);
const chaseHay = brief.primaryItems
  .map((item) => `${item.label} ${item.evidenceAnchor ?? ""} ${item.mergedFrom.join(" ")}`)
  .join("\n");
assert.match(chaseHay, /driver identity and toxicology/i);
assert.match(chaseHay, /continuity/i);
assert.ok(
  brief.primaryItems.some((item) => item.evidenceAnchor || item.provenance),
  "outstanding chase items stay source-backed",
);

// 5. Proof pressure creates a key defence issue.
const issues = buildDemoKeyDefenceIssues(VALE_BELL_PACK, brief.primaryItems);
assert.ok(
  issues.some((issue) => /driver identity and toxicology procedure/i.test(`${issue.issue} ${issue.sourceLine}`)),
  "proof pressure becomes a key defence issue",
);
assert.ok(
  issues.some((issue) => /Proof pressure/i.test(issue.sourceLine)),
  "proof pressure issue is source-backed",
);

// 6. Narrative/witness names do not override defendant.
const witnessOverride = `${VALE_BELL_PACK}\nWitness: Marcus Hale\nOfficer: PC Rowan Vale\nR v Leon Marsh\n`;
assert.equal(extractSmokePackFrontSheet(witnessOverride).defendantName, "Vale Bell");
assert.equal(extractBundleCaseMetadata(witnessOverride).defendantName, "Vale Bell");

// 7. Unknown/fictional/evaluation wording keeps solicitor review / provisional state.
assert.match(VALE_BELL_PACK, /fictional|evaluation|unknown|solicitor review/i);
assert.equal(sheet.provisional, true);
assert.equal(sheet.solicitorReviewRequired, true);
assert.equal(
  resolveDemoProfileFromContext({
    caseTitle: "Drug driving - Vale Bell",
    clientLabel: "Vale Bell",
    allegation: sheet.exactChargeWording,
    bundleText: VALE_BELL_PACK,
  }),
  null,
  "do not revive demo-name matching for Vale Bell",
);

const liveExtractPath = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts/CB-CHARGE-2026-0039.full.txt",
);
if (fs.existsSync(liveExtractPath)) {
  const live = fs.readFileSync(liveExtractPath, "utf8");
  const liveMeta = extractBundleCaseMetadata(live);
  assert.equal(liveMeta.defendantName, "Vale Bell");
  assert.match(liveMeta.offenceWording ?? "", /controlled drug|drug driving/i);
  assert.equal(liveMeta.court, "Riverton Crown Court");
  assert.match(liveMeta.stage ?? "", /trial tomorrow/i);
}

console.log("smoke-pack-front-sheet.test.ts: PASS");
