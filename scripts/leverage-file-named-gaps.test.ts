/**
 * File-named outstanding gaps on labelled packs (Leverage) must reach Overview/Chase.
 * Quiet files stay quiet. Fragment cards stay suppressed.
 * Run: npx tsx scripts/leverage-file-named-gaps.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
} from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDemoAttentionItems } from "../components/criminal/demo-shell/demoOverviewAdapter";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { workflowHeaderOverrides } from "../lib/criminal/pilot-workflow";
import { resolvePilotChargeDisplay } from "../components/criminal/workflow/workflowPilotDisplay";
import { isProofPressureAllegationLabel } from "../lib/criminal/case-identity-boundary";
import {
  extractSmokePackFrontSheet,
  smokePackOutstandingChaseDrafts,
} from "../lib/criminal/smoke-pack-front-sheet";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const EXTRACTS = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts",
);

const LEVERAGE = fs.readFileSync(path.join(EXTRACTS, "RP-06-LEVERAGE.full.txt"), "utf8");
const BROOKES = fs.readFileSync(path.join(EXTRACTS, "RP-17-FRESH-BROOKES.full.txt"), "utf8");
const VALE_BELL = fs.readFileSync(path.join(EXTRACTS, "CB-CHARGE-2026-0039.full.txt"), "utf8");
const GRANT = fs.readFileSync(path.join(EXTRACTS, "RP-02-GRANT.full.txt"), "utf8");
const DUNN = fs.readFileSync(path.join(EXTRACTS, "RP-13-DUNN.full.txt"), "utf8");

const HALE = [
  "R v Leon Hale",
  "Charge: Murder, contrary to common law",
  "Court: Northchester Crown Court",
  "Next hearing: 22 May 2026 10:00 — First Appearance",
  "EX-MUR-007 — Police officer statement BWV — not served",
  "Full 999 audio Not yet served.",
].join("\n");

const AHMED = `MG5 CASE SUMMARY
Material still neededsearch record; reasonable excuse; full interview transcript
MG6 DISCLOSURE SCHEDULE
3search recordoutstandingrequested
4reasonable excuseoutstandingneeded before final position
5complete CAD/999 logoutstandingnot attached
The attachment referred to in the prior message was not included with the email.`;

const PATEL_FRAGMENT =
  "Where the full recording or transcript is not served, the account must not be treated as a settled";
const PATEL = `MG5 - CASE SUMMARY
Interview position is summarised only. ${PATEL_FRAGMENT}
MG6 DISCLOSURE SCHEDULE
MG6/05 full CCTV master outstanding requested / not attached
MG6/07 full interview transcript outstanding`;

const GAUNTLET = `MG6C DISCLOSURE SCHEDULE
MG6C/001Exterior CCTV export log not servedCentral to sequence, doorway angle and continuity.
Property bag references LP/4 and LP/14 appear inconsistently. Officer note says final continuity statement to follow.`;

const QUIET_SMOKE = `COVER / CASE HEADER
Case title: Quiet pack
Defendant: Quiet Vale
Court/stage: Northford Magistrates Court / first appearance
Exact charge wording: On 01/01/2026 Quiet Vale is alleged to have committed theft.
Served material: MG5 summary only.`;

const FRAGMENT_CARD =
  /reasonable excuse|not included with the email|officer note says|treated as a settled|this point collapses if|strategy point collapses if/i;
const PACK_CHARGE = /possession\s*\/\s*knowledge\s*\/\s*phone-attribution|phone-attribution pressure/i;
const PLAYBOOK =
  /999 audio \/ emergency-call material|complainant MG11|injury causation|Possession and phone-attribution/i;

function chaseFromFile(
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
  const overview = buildDemoAttentionItems(chase.primaryItems);
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
    battleboard: null,
    hasSavedPosition: false,
    chaseItems,
    bundleText,
  });
  return { chase, overview, chaseItems, war };
}

function boardOf(chase: ReturnType<typeof buildDisclosureChaseBrief>): string {
  return chase.primaryItems.map((item) => item.label).join(" || ");
}

// 1–3. Leverage File-named CCTV master, continuity, and ID notes appear with receipts.
{
  const sheet = extractSmokePackFrontSheet(LEVERAGE);
  assert.equal(sheet.detected, true);
  assert.match(sheet.outstandingMaterial ?? "", /full CCTV master/i);
  const drafts = smokePackOutstandingChaseDrafts(LEVERAGE);
  assert.ok(drafts.some((d) => /CCTV master/i.test(d.label)), `drafts: ${drafts.map((d) => d.label).join(" | ")}`);
  assert.ok(drafts.some((d) => /continuity/i.test(d.label)), `drafts: ${drafts.map((d) => d.label).join(" | ")}`);
  assert.ok(drafts.some((d) => /ID procedure notes/i.test(d.label)), `drafts: ${drafts.map((d) => d.label).join(" | ")}`);

  const { chase, overview, chaseItems } = chaseFromFile(LEVERAGE, {
    caseId: "leverage-file-named-gaps",
    caseTitle: "Theft from shop - Alden Vale",
    clientLabel: "Alden Vale",
    allegation: "Theft from shop",
  });
  const board = boardOf(chase);
  const overviewHay = overview.map((item) => item.title).join("\n");
  assert.ok(/CCTV master/i.test(board), `Leverage CCTV master missing — ${board}`);
  assert.ok(/continuity/i.test(board), `Leverage continuity missing — ${board}`);
  assert.ok(/ID procedure notes/i.test(board), `Leverage ID notes missing — ${board}`);
  assert.ok(/CCTV master/i.test(overviewHay), "Overview must show CCTV master");
  assert.ok(/continuity/i.test(overviewHay), "Overview must show continuity");
  assert.ok(/ID procedure notes/i.test(overviewHay), "Overview must show ID notes");
  assert.equal(overview.length, chase.primaryItems.length, "Overview and Chase share the shortlist");
  assert.ok(
    chase.primaryItems.every((item) => item.evidenceAnchor || item.source),
    "every Leverage card keeps a File receipt",
  );
  assert.doesNotMatch(board, FRAGMENT_CARD);
  assert.doesNotMatch(board, PLAYBOOK);
  assert.doesNotMatch(chaseItems.join("\n"), PLAYBOOK);
  assert.ok(chaseItems.some((item) => /CCTV master|continuity|ID procedure/i.test(item)));
}

// 4. Truly quiet files stay quiet.
{
  const quiet = chaseFromFile("Cover sheet only. No MG6 outstanding schedule.", {
    caseId: "quiet-cover",
    caseTitle: "R v Quiet",
    clientLabel: "Quiet",
    allegation: "Assault by beating",
  });
  assert.equal(quiet.chase.primaryItems.length, 0);
  assert.equal(quiet.overview.length, 0);

  const quietSmoke = chaseFromFile(QUIET_SMOKE, {
    caseId: "quiet-smoke",
    caseTitle: "Quiet pack",
    clientLabel: "Quiet Vale",
    allegation: "Theft",
  });
  assert.equal(quietSmoke.chase.primaryItems.length, 0, boardOf(quietSmoke.chase));
  assert.equal(extractSmokePackFrontSheet(QUIET_SMOKE).outstandingItems.length, 0);
}

// 5. Ahmed / Patel / Gauntlet fragment-card fixes still hold.
{
  const ahmed = chaseFromFile(AHMED, {
    caseId: "ahmed-fragment-stay",
    caseTitle: "R v Holly Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
  });
  assert.doesNotMatch(boardOf(ahmed.chase), /reasonable excuse|not included with the email/i);
  assert.ok(/search record/i.test(boardOf(ahmed.chase)));

  const patel = chaseFromFile(PATEL, {
    caseId: "patel-fragment-stay",
    caseTitle: "R v Isaac Patel",
    clientLabel: "Isaac Patel",
    allegation: "Affray",
  });
  assert.doesNotMatch(boardOf(patel.chase), FRAGMENT_CARD);
  assert.doesNotMatch(patel.overview.map((item) => item.title).join("\n"), FRAGMENT_CARD);
  assert.equal(patel.overview.length, patel.chase.primaryItems.length);
  assert.ok(/CCTV/i.test(boardOf(patel.chase)));

  const gauntlet = chaseFromFile(GAUNTLET, {
    caseId: "gauntlet-fragment-stay",
    caseTitle: "R v Riley North",
    clientLabel: "Riley North",
    allegation: "Wounding with intent",
  });
  assert.doesNotMatch(boardOf(gauntlet.chase), /officer note says/i);
  assert.ok(/MG6C\/001|CCTV export/i.test(boardOf(gauntlet.chase)));
}

// 6. Existing good roots: Brookes File-first charge, Vale Bell front-sheet, Dunn/Hale/Grant.
{
  const brookesMeta = extractBundleCaseMetadata(BROOKES);
  const brookesHeader = workflowHeaderOverrides("R v Taylor Brookes", {
    allegation: brookesMeta.offenceWording ?? brookesMeta.offenceDisplay,
    clientLabel: brookesMeta.defendantName ?? "Taylor Brookes",
    bundleText: BROOKES,
  });
  const brookesCharge = resolvePilotChargeDisplay(
    brookesMeta.offenceDisplay || brookesMeta.offenceWording || brookesHeader?.allegation || "",
  );
  assert.match(brookesCharge, /intimidating a witness/i);
  assert.doesNotMatch(brookesCharge, PACK_CHARGE);
  assert.ok(!isProofPressureAllegationLabel(brookesCharge));
  const brookes = chaseFromFile(BROOKES, {
    caseId: "brookes-stay-good",
    caseTitle: "R v Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: brookesMeta.offenceWording ?? "Intimidating a witness",
  });
  assert.ok(/whatsapp|voice note|subscriber|export|email/i.test(boardOf(brookes.chase)));
  assert.doesNotMatch(boardOf(brookes.chase), FRAGMENT_CARD);
}

{
  const valeMeta = extractBundleCaseMetadata(VALE_BELL);
  const vale = chaseFromFile(VALE_BELL, {
    caseId: "vale-bell-stay-good",
    caseTitle: "Drug driving - Vale Bell",
    clientLabel: "Vale Bell",
    allegation: valeMeta.offenceWording ?? "Drug driving",
  });
  assert.ok(
    vale.chase.primaryItems.some((item) => /driver identity and toxicology/i.test(item.label)),
    boardOf(vale.chase),
  );
  assert.doesNotMatch(boardOf(vale.chase), FRAGMENT_CARD);
}

{
  const hale = chaseFromFile(HALE, {
    caseId: "hale-stay-good",
    caseTitle: "R v Leon Hale",
    clientLabel: "Leon Hale",
    allegation: "Murder, contrary to common law",
  });
  assert.ok(/CCTV|999|BWV|interview/i.test(boardOf(hale.chase)), boardOf(hale.chase));
}

{
  const grant = chaseFromFile(GRANT, {
    caseId: "grant-stay-good",
    caseTitle: "R v Vincent Grant",
    clientLabel: "Vincent Grant",
    allegation: "Possession of a controlled drug of Class A with intent to supply",
  });
  assert.ok(grant.chase.primaryItems.length > 0);
  assert.doesNotMatch(boardOf(grant.chase), FRAGMENT_CARD);
}

{
  const dunnMeta = extractBundleCaseMetadata(DUNN);
  assert.match(dunnMeta.defendantName ?? "", /Dunn/i);
  const dunn = chaseFromFile(DUNN, {
    caseId: "dunn-stay-good",
    caseTitle: "R v Ellis Dunn",
    clientLabel: "Ellis Dunn",
    allegation: dunnMeta.offenceWording ?? "Conspiracy to burgle",
  });
  assert.doesNotMatch(boardOf(dunn.chase), FRAGMENT_CARD);
}

console.log("leverage-file-named-gaps.test.ts: PASS");
