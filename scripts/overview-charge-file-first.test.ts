/**
 * Overview charge/offence must come from File/PDF charge first.
 * Proof-pressure families (phone attribution / PWITS pack title) must not replace the charge.
 * Run: npx tsx scripts/overview-charge-file-first.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
} from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDemoKeyDefenceIssues } from "../components/criminal/demo-shell/demoOverviewAdapter";
import {
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
  resolvePilotChargeDisplay,
} from "../components/criminal/workflow/workflowPilotDisplay";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { workflowHeaderOverrides } from "../lib/criminal/pilot-workflow";
import { isProofPressureAllegationLabel } from "../lib/criminal/case-identity-boundary";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const EXTRACTS = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts",
);

const BROOKES = fs.readFileSync(path.join(EXTRACTS, "RP-17-FRESH-BROOKES.full.txt"), "utf8");
const VALE_BELL = fs.readFileSync(path.join(EXTRACTS, "CB-CHARGE-2026-0039.full.txt"), "utf8");
const GRANT = fs.readFileSync(path.join(EXTRACTS, "RP-02-GRANT.full.txt"), "utf8");
const DUNN = fs.readFileSync(path.join(EXTRACTS, "RP-13-DUNN.full.txt"), "utf8");
const PATTERSON = fs.readFileSync(path.join(EXTRACTS, "RP-10-PATTERSON.full.txt"), "utf8");
const DAVIES = fs.readFileSync(path.join(EXTRACTS, "RP-15-DAVIES.full.txt"), "utf8");

const HALE = [
  "R v Leon Hale",
  "Charge: Murder, contrary to common law",
  "Court: Northchester Crown Court",
  "Next hearing: 22 May 2026 10:00 — First Appearance",
  "EX-MUR-007 — Police officer statement BWV — not served",
  "Full 999 audio Not yet served.",
].join("\n");

const PACK_CHARGE = /possession\s*\/\s*knowledge\s*\/\s*phone-attribution|phone-attribution pressure|\bpwits\b/i;

function overviewCharge(bundleText: string, caseTitle: string, clientLabel: string) {
  const meta = extractBundleCaseMetadata(bundleText);
  const header = workflowHeaderOverrides(caseTitle, {
    allegation: meta.offenceWording ?? meta.offenceDisplay,
    clientLabel: meta.defendantName ?? clientLabel,
    bundleText,
  });
  const display = resolvePilotChargeDisplay(
    meta.offenceDisplay || meta.offenceWording || header?.allegation || "",
  );
  return { meta, header, display };
}

function chaseAndCourt(
  bundleText: string,
  extras: { caseId: string; caseTitle: string; clientLabel: string; allegation: string },
) {
  const chase = buildDisclosureChaseBrief({
    caseId: extras.caseId,
    caseTitle: extras.caseTitle,
    clientLabel: extras.clientLabel,
    allegation: extras.allegation,
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
  const chaseItems = buildChaseItemsForHearing({
    bundleText,
    snapshotMissing: [],
    battleboard: null,
    fileBackedShortlist: chase.primaryItems.map((item) => item.label),
  });
  const war = buildHearingWarRoomBrief({
    caseId: extras.caseId,
    caseTitle: extras.caseTitle,
    clientLabel: extras.clientLabel,
    allegation: extras.allegation,
    stage: "trial tomorrow",
    hearingStatus: "Listed",
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    readiness: "Provisional",
    battleboard: null,
    hasSavedPosition: false,
    chaseItems,
    bundleText,
  });
  return { chase, chaseItems, war };
}

function courtHay(
  war: ReturnType<typeof chaseAndCourt>["war"],
  chaseItems: string[],
): string {
  return [
    war.safePositionToday,
    ...war.sayThis,
    ...war.doNotOverstate,
    ...war.askCourtToRecord,
    ...war.nextHearingMoves,
    ...chaseItems,
  ].join("\n");
}

// 1. Brookes fresh/intimidating-witness file does not render possession/knowledge/phone-attribution as Overview charge.
{
  const { meta, header, display } = overviewCharge(BROOKES, "R v Taylor Brookes", "Taylor Brookes");
  assert.match(meta.defendantName ?? "", /Taylor Brookes/i);
  assert.match(`${meta.offenceWording ?? ""} ${meta.offenceDisplay ?? ""}`, /intimidating a witness/i);
  assert.doesNotMatch(display, PACK_CHARGE);
  assert.match(display, /intimidating a witness/i);
  assert.ok(!isProofPressureAllegationLabel(display));
  assert.ok(header);
  assert.doesNotMatch(header!.allegation, PACK_CHARGE);
  assert.doesNotMatch(header!.displayTitle, PACK_CHARGE);
  const packOnly = workflowHeaderOverrides("Taylor Brookes", {
    clientLabel: "Taylor Brookes",
    bundleText: BROOKES,
  });
  assert.ok(packOnly);
  assert.doesNotMatch(packOnly!.allegation, PACK_CHARGE);
  assert.equal(resolvePilotChargeDisplay(packOnly!.allegation), PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

// 1b. Glued live PDF table (CountAllegationParticulars / 1Intimidating a witnessBetween).
{
  const glued = [
    "=== SECTION: CHARGE AND PARTICULARS ===",
    "CountAllegationParticulars",
    "1Intimidating a witnessBetween 08 May 2026 and 10 May 2026, at Northbank, Taylor Brookes is",
    "alleged to have contacted Ellie Varna by WhatsApp message and voice note",
    "2Malicious communicationsOn or about 09 May 2026, messages were allegedly sent from number ending",
  ].join("\n");
  const gluedOverview = overviewCharge(glued, "R v Taylor Brookes", "Taylor Brookes");
  assert.match(gluedOverview.display, /intimidating a witness/i);
  assert.doesNotMatch(gluedOverview.display, PACK_CHARGE);
}
{
  const { meta, display } = overviewCharge(BROOKES, "R v Taylor Brookes", "Taylor Brookes");
  const { chase, chaseItems, war } = chaseAndCourt(BROOKES, {
    caseId: "brookes-overview-charge",
    caseTitle: "R v Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: meta.offenceWording ?? "Intimidating a witness",
  });
  const chaseHay = chase.primaryItems.map((item) => item.label).join("\n");
  const issues = buildDemoKeyDefenceIssues(BROOKES, chase.primaryItems);
  const issueHay = issues.map((item) => item.issue).join("\n");
  assert.doesNotMatch(display, /phone-attribution|possession \/ knowledge/i);
  assert.ok(
    /whatsapp|voice note|subscriber|attribution|download|export|email/i.test(`${chaseHay}\n${issueHay}`),
    "phone/download/subscriber may remain as chase or key issue",
  );
  const hay = courtHay(war, chaseItems);
  assert.doesNotMatch(hay, /Possession and phone-attribution issues remain conditional/i);
  assert.doesNotMatch(hay, /\bpre-interview\b/i);
  assert.ok(/whatsapp|voice note|subscriber|email|export/i.test(hay), "Court Today still uses File digital shortlist");
}

// 3. If File has a clear Statement of Offence, Overview uses it over proof-pressure/evidence family.
{
  const statementBundle = [
    "R v Jordan Quinn",
    "Defendant: Jordan Quinn",
    "Statement of Offence: Intimidating a witness, contrary to section 51 of the Criminal Justice and Public Order Act 1994.",
    "Particulars of offence: messages sent from a handset. Phone download and subscriber return outstanding.",
    "MG5: the Crown relies on phone attribution. Full phone extraction is not served.",
  ].join("\n");
  const { meta, header, display } = overviewCharge(statementBundle, "R v Jordan Quinn", "Jordan Quinn");
  assert.match(`${meta.offenceWording ?? ""} ${display}`, /intimidating a witness/i);
  assert.doesNotMatch(display, PACK_CHARGE);
  assert.ok(header);
  assert.match(header!.allegation, /intimidating a witness/i);
  assert.doesNotMatch(header!.allegation, PACK_CHARGE);
}

// 4. If File has no charge, Overview stays “charge not safely identified” rather than inventing from evidence.
{
  const noCharge = [
    "MG5 CASE SUMMARY",
    "Defendant: Alex Quinn",
    "Phone seized at the address. Subscriber return outstanding.",
    "WhatsApp screenshot printouts are served. Full phone download is not served.",
    "No charge sheet is included in this bundle.",
  ].join("\n");
  const { meta, header, display } = overviewCharge(noCharge, "Alex Quinn", "Alex Quinn");
  assert.equal(meta.offenceWording, null);
  assert.equal(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
  assert.doesNotMatch(display, PACK_CHARGE);
  if (header) {
    assert.doesNotMatch(header.allegation, PACK_CHARGE);
    assert.equal(resolvePilotChargeDisplay(header.allegation), PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
  }
}

// 5. Regression good cases stay good: Vale Bell 0039, Hale, Grant, Dunn, Patterson/Davies.
{
  const vale = overviewCharge(VALE_BELL, "Drug driving - Vale Bell", "Vale Bell");
  assert.match(vale.meta.defendantName ?? "", /Vale Bell/i);
  assert.match(`${vale.meta.offenceWording ?? ""} ${vale.display}`, /drug driving|controlled drug|driving/i);
  assert.doesNotMatch(vale.display, PACK_CHARGE);

  const hale = overviewCharge(HALE, "R v Leon Hale", "Leon Hale");
  assert.match(hale.display, /murder/i);
  assert.doesNotMatch(hale.display, PACK_CHARGE);

  const grant = overviewCharge(GRANT, "R v Vincent Grant", "Vincent Grant");
  assert.match(grant.meta.defendantName ?? "", /Grant/i);
  assert.match(
    `${grant.meta.offenceWording ?? ""} ${grant.display}`,
    /possession|intent to supply|controlled drug|pwits/i,
  );
  assert.doesNotMatch(grant.display, /possession \/ knowledge \/ phone-attribution/i);

  const dunn = overviewCharge(DUNN, "R v Ellis Dunn", "Ellis Dunn");
  assert.match(dunn.meta.defendantName ?? "", /Dunn/i);
  assert.match(`${dunn.meta.offenceWording ?? ""} ${dunn.display}`, /burgle|conspiracy/i);
  assert.doesNotMatch(dunn.display, PACK_CHARGE);

  const patterson = overviewCharge(PATTERSON, "R v James Patterson", "James Patterson");
  assert.match(patterson.meta.defendantName ?? "", /Patterson/i);
  assert.doesNotMatch(patterson.display, PACK_CHARGE);
  assert.notEqual(patterson.display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);

  const davies = overviewCharge(DAVIES, "R v Layla Davies", "Layla Davies");
  assert.match(davies.meta.defendantName ?? "", /Davies/i);
  assert.doesNotMatch(davies.display, PACK_CHARGE);
  assert.notEqual(davies.display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

// 10-fresh: glued CountAllegationParticulars "Assault on emergency workerOn 22 May" must not stay blank.
{
  const jordan = [
    "=== SECTION: COVER SHEET ===",
    "DefendantJordan Hale",
    "This bundle concerns an alleged assault on an emergency worker and obstruction during a custody-suite incident.",
    "=== SECTION: CHARGE AND PARTICULARS ===",
    "CountAllegationParticulars",
    "1Assault on emergency workerOn 22 May 2026 at Eastmoor custody suite, Jordan Hale is alleged to have",
    "pushed PC Nathan Ives",
    "2Obstruct policeOn the same date and place, Jordan Hale is alleged to have obstructed officers",
  ].join("\n");
  const { meta, display } = overviewCharge(jordan, "CB-FRESH-002 Jordan Hale", "Jordan Hale");
  assert.match(meta.defendantName ?? "", /Jordan Hale/i);
  assert.match(`${meta.offenceWording ?? ""} ${display}`, /emergency worker/i);
  assert.notEqual(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

// 10-fresh: "offence/count. CB-TB-01 |" must not win over OffenceRobbery.
{
  const robbery = [
    "CB-TB-01 | TRAINING / TEST BUNDLE - NO REAL CASE R v Ryan Hale - robbery first appearance / IDPC only",
    "DefendantRyan Hale",
    "OffenceRobbery - alleged theft of phone and wallet with force used or threatened",
    "Contrary toSection 8 Theft Act 1968",
    "CaseBrain should dedupe this page and not count it as a second offence/count. CB-TB-01 | TRAINING",
  ].join("\n");
  const { meta, display } = overviewCharge(robbery, "CB_TEST_01 Robbery IDPC", "Ryan Hale");
  assert.match(meta.defendantName ?? "", /Ryan Hale/i);
  assert.match(`${meta.offenceWording ?? ""} ${display}`, /robbery/i);
  assert.doesNotMatch(display, /\/count/i);
  assert.doesNotMatch(display, /CB-TB-01/i);
  assert.notEqual(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

// Glued OffenceAssault occasioning… must keep ABH, not stop at “Assault”.
{
  const paige = [
    "DefendantPaige Marie Thornton",
    "OffenceAssault occasioning actual bodily harm, contrary to section 47 Offences against the Person Act 1861",
    "CourtNorthbridge Magistrates Court",
  ].join("\n");
  const { display } = overviewCharge(paige, "CB-TB-04 Paige Thornton", "Paige Thornton");
  assert.match(display, /actual bodily harm|ABH|s\.?\s*47/i);
  assert.doesNotMatch(display, /^Assault$/i);
}

console.log("overview-charge-file-first.test.ts: PASS");
