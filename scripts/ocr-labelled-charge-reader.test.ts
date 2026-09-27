/**
 * OCR / labelled smoke-pack charge reader.
 * File Offence type / Case title / exact allegation must fill Overview charge.
 * Proof-pressure and narrative names must not.
 * Run: npx tsx scripts/ocr-labelled-charge-reader.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
  resolvePilotChargeDisplay,
} from "../components/criminal/workflow/workflowPilotDisplay";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { workflowHeaderOverrides } from "../lib/criminal/pilot-workflow";
import { isProofPressureAllegationLabel } from "../lib/criminal/case-identity-boundary";
import {
  extractSmokePackFrontSheet,
  labelledSmokePackCharge,
} from "../lib/criminal/smoke-pack-front-sheet";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const EXTRACTS = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts",
);

const OCR_BECK = fs.readFileSync(path.join(EXTRACTS, "RP-08-OCR-0013.full.txt"), "utf8");
const BROOKES = fs.readFileSync(path.join(EXTRACTS, "RP-17-FRESH-BROOKES.full.txt"), "utf8");
const VALE_BELL = fs.readFileSync(path.join(EXTRACTS, "CB-CHARGE-2026-0039.full.txt"), "utf8");
const GRANT = fs.readFileSync(path.join(EXTRACTS, "RP-02-GRANT.full.txt"), "utf8");
const DUNN = fs.readFileSync(path.join(EXTRACTS, "RP-13-DUNN.full.txt"), "utf8");
const LEVERAGE = fs.readFileSync(path.join(EXTRACTS, "RP-06-LEVERAGE.full.txt"), "utf8");

const HALE = [
  "R v Leon Hale",
  "Charge: Murder, contrary to common law",
  "Court: Northchester Crown Court",
  "Next hearing: 22 May 2026 10:00 — First Appearance",
  "EX-MUR-007 — Police officer statement BWV — not served",
  "Full 999 audio Not yet served.",
].join("\n");

const PACK_CHARGE = /possession\s*\/\s*knowledge\s*\/\s*phone-attribution|phone-attribution pressure|\bpwits\b/i;
const FRAGMENT_CARD =
  /reasonable excuse|not included with the email|officer note says|treated as a settled/i;
const ABH = /abh,?\s*s\.?\s*47|actual bodily harm|occasioning/i;

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

function chaseHay(bundleText: string, extras: { caseId: string; caseTitle: string; clientLabel: string; allegation: string }) {
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
  return {
    chase,
    board: chase.primaryItems.map((item) => item.label).join("\n"),
  };
}

function smokeHeader(lines: string[]) {
  return ["COVER / CASE HEADER", "Court/stage: Northlake Magistrates Court / police station pre-charge", ...lines].join(
    "\n",
  );
}

// 1. OCR Beck labelled Offence type: ABH s.47 fills Overview charge.
{
  const { meta, header, display } = overviewCharge(OCR_BECK, "ABH s.47 - Emery Beck", "Emery Beck");
  const sheet = extractSmokePackFrontSheet(OCR_BECK);
  assert.equal(sheet.detected, true);
  assert.match(sheet.offenceFamily ?? "", /ABH\s*s\.?\s*47/i);
  assert.match(labelledSmokePackCharge(sheet) ?? "", ABH);
  assert.match(meta.defendantName ?? "", /Emery Beck/i);
  assert.match(`${meta.offenceWording ?? ""} ${meta.offenceDisplay ?? ""}`, ABH);
  assert.match(display, ABH);
  assert.notEqual(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
  assert.ok(header);
  assert.match(header!.allegation, ABH);
  assert.doesNotMatch(display, PACK_CHARGE);
}

// 2. Case title: ABH s.47 - Emery Beck can fill charge when no stronger charge field exists.
{
  const titleOnly = smokeHeader([
    "Case title: ABH s.47 - Emery Beck",
    "Defendant name: Emery Beck",
  ]);
  const { meta, display } = overviewCharge(titleOnly, "ABH s.47 - Emery Beck", "Emery Beck");
  assert.equal(extractSmokePackFrontSheet(titleOnly).exactChargeWording, null);
  assert.equal(extractSmokePackFrontSheet(titleOnly).offenceFamily, null);
  assert.match(meta.offenceWording ?? "", /ABH,?\s*s\.?\s*47/i);
  assert.match(display, /ABH,?\s*s\.?\s*47/i);
  assert.notEqual(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

// Stronger Offence type wins over a conflicting case title.
{
  const stronger = smokeHeader([
    "Case title: Theft from shop - Emery Beck",
    "Defendant name: Emery Beck",
    "Offence type: ABH s.47",
  ]);
  const { display } = overviewCharge(stronger, "Theft from shop - Emery Beck", "Emery Beck");
  assert.match(display, /ABH,?\s*s\.?\s*47/i);
  assert.doesNotMatch(display, /theft from shop/i);
}

// 3. Evidence / proof-pressure labels cannot replace a clear charge.
{
  const pressure = smokeHeader([
    "Case title: ABH s.47 - Emery Beck",
    "Defendant name: Emery Beck",
    "Offence type: ABH s.47",
    "Exact allegation wording: On 15/03/2026 Emery Beck is alleged to have assaulted Miles Dacre thereby occasioning actual bodily harm.",
    "Proof pressure: phone attribution / subscriber return",
    "Outstanding material: full chat export; continuity/provenance",
  ]);
  const { display } = overviewCharge(pressure, "Possession / knowledge / phone-attribution", "Emery Beck");
  assert.match(display, ABH);
  assert.doesNotMatch(display, PACK_CHARGE);
  assert.ok(!isProofPressureAllegationLabel(display));
}

// 4. Random narrative names / phrases cannot become charge.
{
  const narrative = smokeHeader([
    "Defendant name: Emery Beck",
    "Witness: Miles Dacre",
    "PC Rowan Vale attended Meadow Close.",
    "The complainant says the build is similar.",
  ]);
  const { display } = overviewCharge(narrative, "Emery Beck", "Emery Beck");
  assert.equal(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
  assert.doesNotMatch(display, /Miles Dacre|Rowan Vale/i);
}

// 5. No-charge files stay Charge not safely identified.
{
  const noCharge = [
    "MG5 CASE SUMMARY",
    "Defendant: Alex Quinn",
    "Phone seized at the address. Subscriber return outstanding.",
    "WhatsApp screenshot printouts are served. Full phone download is not served.",
    "No charge sheet is included in this bundle.",
  ].join("\n");
  const { display } = overviewCharge(noCharge, "Alex Quinn", "Alex Quinn");
  assert.equal(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

{
  const smokeNoCharge = smokeHeader([
    "Case title: Quiet evaluation pack",
    "Defendant name: Quiet Vale",
    "Proof pressure: identification leverage",
    "Outstanding material: full CCTV master",
  ]);
  const { display } = overviewCharge(smokeNoCharge, "Quiet evaluation pack", "Quiet Vale");
  assert.equal(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

// 6. Stay-good: Brookes, Vale Bell 0039, Hale/Grant/Dunn, Leverage, fragment gate.
{
  const brookes = overviewCharge(BROOKES, "R v Taylor Brookes", "Taylor Brookes");
  assert.match(brookes.display, /intimidating a witness/i);
  assert.doesNotMatch(brookes.display, PACK_CHARGE);
}

{
  const vale = overviewCharge(VALE_BELL, "Drug driving - Vale Bell", "Vale Bell");
  assert.match(`${vale.meta.offenceWording ?? ""} ${vale.display}`, /drug driving|controlled drug|driving/i);
  assert.doesNotMatch(vale.display, PACK_CHARGE);
  const valeChase = chaseHay(VALE_BELL, {
    caseId: "vale-stay",
    caseTitle: "Drug driving - Vale Bell",
    clientLabel: "Vale Bell",
    allegation: vale.meta.offenceWording ?? "Drug driving",
  });
  assert.match(valeChase.board, /driver identity and toxicology/i);
}

{
  const hale = overviewCharge(HALE, "R v Leon Hale", "Leon Hale");
  assert.match(hale.display, /murder/i);
  const grant = overviewCharge(GRANT, "R v Vincent Grant", "Vincent Grant");
  assert.match(`${grant.meta.offenceWording ?? ""} ${grant.display}`, /possession|intent to supply|controlled drug/i);
  assert.doesNotMatch(grant.display, /possession \/ knowledge \/ phone-attribution/i);
  const dunn = overviewCharge(DUNN, "R v Ellis Dunn", "Ellis Dunn");
  assert.match(`${dunn.meta.offenceWording ?? ""} ${dunn.display}`, /burgle|conspiracy/i);
}

{
  const leverage = overviewCharge(LEVERAGE, "Theft from shop - Alden Vale", "Alden Vale");
  assert.match(`${leverage.meta.offenceWording ?? ""} ${leverage.display}`, /theft|appropriated retail goods/i);
  const leverageChase = chaseHay(LEVERAGE, {
    caseId: "leverage-stay",
    caseTitle: "Theft from shop - Alden Vale",
    clientLabel: "Alden Vale",
    allegation: leverage.meta.offenceWording ?? "Theft from shop",
  });
  assert.match(leverageChase.board, /CCTV master/i);
  assert.match(leverageChase.board, /continuity/i);
  assert.match(leverageChase.board, /ID procedure/i);
}

{
  const ahmed = `MG5 CASE SUMMARY
Material still neededsearch record; reasonable excuse; full interview transcript
MG6 DISCLOSURE SCHEDULE
3search recordoutstandingrequested
4reasonable excuseoutstandingneeded before final position
5complete CAD/999 logoutstandingnot attached
The attachment referred to in the prior message was not included with the email.`;
  const patel = `MG5 - CASE SUMMARY
Where the full recording or transcript is not served, the account must not be treated as a settled
MG6 DISCLOSURE SCHEDULE
MG6/05 full CCTV master outstanding requested / not attached`;
  const gauntlet = `MG6C DISCLOSURE SCHEDULE
MG6C/001Exterior CCTV export log not servedCentral to sequence, doorway angle and continuity.
Officer note says final continuity statement to follow.`;
  assert.doesNotMatch(chaseHay(ahmed, {
    caseId: "ahmed-frag",
    caseTitle: "R v Holly Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
  }).board, FRAGMENT_CARD);
  assert.doesNotMatch(chaseHay(patel, {
    caseId: "patel-frag",
    caseTitle: "R v Isaac Patel",
    clientLabel: "Isaac Patel",
    allegation: "Affray",
  }).board, FRAGMENT_CARD);
  assert.doesNotMatch(chaseHay(gauntlet, {
    caseId: "gauntlet-frag",
    caseTitle: "R v Riley North",
    clientLabel: "Riley North",
    allegation: "Wounding with intent",
  }).board, FRAGMENT_CARD);
}

console.log("ocr-labelled-charge-reader.test.ts: PASS");
