/**
 * Court Today must use the File/PDF-backed Overview/Chase shortlist,
 * not offence-family playbook furniture.
 * Run: npx tsx scripts/court-today-file-shortlist.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
} from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const EXTRACTS = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts",
);

const PATTERSON = fs.readFileSync(path.join(EXTRACTS, "RP-10-PATTERSON.full.txt"), "utf8");
const DAVIES = fs.readFileSync(path.join(EXTRACTS, "RP-15-DAVIES.full.txt"), "utf8");
const TRAP = fs.readFileSync(path.join(EXTRACTS, "RP-09-TRAP-0030.full.txt"), "utf8");
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
  "EX-MUR-009 — CCTV stills and timing note Master footage outstanding EX-MUR-009 to EX-MUR-011",
  "EX-MUR-012 — CAD and 999 summaries Original audio/log outstanding",
  "Full 999 audio Not yet served.",
  "Full CAD incident log Not yet served.",
  "EX-MUR-021 — Interview summary Full recording/transcript outstanding",
  "EX-MUR-022 — Custody record summary Full record/CCTV outstanding",
  "Phone summaries are partial. Full phone download and final cell-site report are outstanding.",
].join("\n");

const FAMILY_FURNITURE =
  /\bpossession\b|\bphone(?:-|\s+)?(?:attribution|ownership|extraction)\b|\bcctv\b|\bpre-interview\b/i;
const FRAGMENT =
  /review remains outstanding or incomplete|this point collapses if|strategy point collapses if/i;

function courtFromFile(
  bundleText: string,
  extras: {
    caseId: string;
    caseTitle: string;
    clientLabel: string;
    allegation: string;
    snapshotMissing?: { label: string; status: string }[];
    fileShortlist?: string[];
  },
) {
  const snapshotMissing = extras.snapshotMissing ?? [];
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
    snapshotMissing,
    proceduralOutstanding: [],
    bundleText,
  });
  const chaseItems = buildChaseItemsForHearing({
    bundleText,
    snapshotMissing,
    battleboard: null,
    fileBackedShortlist: extras.fileShortlist ?? chase.primaryItems.map((item) => item.label),
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
  return { chase, chaseItems, war };
}

function courtHay(war: ReturnType<typeof courtFromFile>["war"], chaseItems: string[]): string {
  return [
    war.safePositionToday,
    ...war.sayThis,
    ...war.doNotOverstate,
    ...war.askCourtToRecord,
    ...war.nextHearingMoves,
    ...chaseItems,
    war.draftWording.disclosureTimetable,
  ].join("\n");
}

// 1. Patterson Court uses O1/O2/O3 named gaps, not CAD/999.
{
  const fileShortlist = [
    "O1 Full CCTV window from flat block",
    "O2 Knife search log",
    "O3 Scenes-of-crime blood swab report",
  ];
  const { chaseItems, war } = courtFromFile(PATTERSON, {
    caseId: "patterson-court-shortlist",
    caseTitle: "R v James Patterson",
    clientLabel: "James Patterson",
    allegation: "Wounding with intent",
    snapshotMissing: fileShortlist.map((label) => ({ label, status: "MISSING" })),
    fileShortlist,
  });
  const familySnapshotChase = buildChaseItemsForHearing({
    bundleText: PATTERSON,
    snapshotMissing: [
      { label: "999 audio / emergency-call material", status: "MISSING" },
      { label: "Custody Record / Custody CCTV", status: "MISSING" },
    ],
    battleboard: null,
  });
  const hay = courtHay(war, chaseItems);
  assert.ok(/CCTV/i.test(hay), "Patterson Court uses CCTV shortlist item");
  assert.ok(/knife/i.test(hay), "Patterson Court uses knife shortlist item");
  assert.ok(/blood/i.test(hay), "Patterson Court uses blood shortlist item");
  assert.ok(/CCTV/i.test(chaseItems.join("\n")));
  assert.ok(/knife/i.test(chaseItems.join("\n")));
  assert.ok(/blood/i.test(chaseItems.join("\n")));
  assert.doesNotMatch(chaseItems[0] ?? "", /999|CAD/i);
  assert.doesNotMatch(war.safePositionToday, /999 audio|emergency-call material/i);
  assert.doesNotMatch(hay, /999 audio \/ emergency-call material/i);
  assert.doesNotMatch(hay, /Custody Record \/ Custody CCTV/i);
  assert.ok(
    /999|CAD|Custody/i.test(familySnapshotChase.join("\n")),
    "legacy snapshot path still has family 999/custody so the Court shortlist bypass is the fix",
  );
}

// 2. Davies Court does not chase served custody; uses bank/CCTV continuity shortlist.
{
  const { chaseItems, war } = courtFromFile(DAVIES, {
    caseId: "davies-court-shortlist",
    caseTitle: "R v Layla Davies",
    clientLabel: "Layla Davies",
    allegation: "Concealing criminal property",
    snapshotMissing: [
      { label: "MG6/04 bank source statements", status: "MISSING" },
      { label: "MG6/05 CCTV continuity log", status: "MISSING" },
    ],
    fileShortlist: ["MG6/04 bank source statements", "MG6/05 CCTV continuity log"],
  });
  const labels = chaseItems.join("\n");
  const hay = courtHay(war, chaseItems);
  assert.ok(/bank/i.test(labels), "Davies chase still names bank statements");
  assert.ok(/CCTV continuity/i.test(labels), "Davies chase still names CCTV continuity");
  assert.ok(/bank/i.test(hay), "Davies Court uses bank shortlist");
  assert.ok(/CCTV continuity/i.test(hay), "Davies Court uses CCTV continuity shortlist");
  assert.doesNotMatch(chaseItems.join("\n"), /Custody Record \/ Custody CCTV/i);
  assert.doesNotMatch(war.safePositionToday, /Custody Record \/ Custody CCTV/i);
  assert.doesNotMatch(hay, /Custody\/PACE safeguards cannot/i);
}

// 3. Trap Court does not invent complainant MG11 / injury-causation.
{
  const { chase, chaseItems, war } = courtFromFile(TRAP, {
    caseId: "trap-court-shortlist",
    caseTitle: "R v Leo Greene",
    clientLabel: "Leo Greene",
    allegation: "Assault by beating",
  });
  const labels = chase.primaryItems.map((item) => item.label).join("\n");
  const hay = courtHay(war, chaseItems);
  assert.ok(/interview/i.test(labels), "Trap chase keeps interview");
  assert.ok(/continuity/i.test(labels), "Trap chase keeps continuity");
  assert.ok(/interview/i.test(hay), "Trap Court uses interview shortlist");
  assert.ok(/continuity/i.test(hay), "Trap Court uses continuity shortlist");
  assert.doesNotMatch(hay, /Full MG11 set, complainant schedule/i);
  assert.doesNotMatch(hay, /Sequence, injury and causation remain provisional/i);
  assert.doesNotMatch(hay, /injury causation/i);
  assert.doesNotMatch(chaseItems.join("\n"), /complainant MG11/i);
}

// 4. Brookes fresh/intimidating-witness does not become possession/phone playbook.
{
  const { chaseItems, war } = courtFromFile(BROOKES, {
    caseId: "brookes-court-shortlist",
    caseTitle: "R v Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: "Intimidating a witness",
  });
  const hay = courtHay(war, chaseItems);
  assert.doesNotMatch(hay, /Possession and phone-attribution issues remain conditional/i);
  assert.doesNotMatch(hay, /\bpre-interview\b/i);
  assert.doesNotMatch(war.safePositionToday, /\bpossession\b/i);
  assert.doesNotMatch(war.sayThis.join("\n"), /\bpossession\b/i);
  assert.ok(
    /whatsapp|voice note|subscriber|attribution|export/i.test(hay),
    "Brookes Court still uses File-backed digital gaps",
  );
}

// 5. Existing good cases stay good: Vale Bell 0039, Hale, Grant, Dunn.
{
  const valeMeta = extractBundleCaseMetadata(VALE_BELL);
  const vale = courtFromFile(VALE_BELL, {
    caseId: "vale-bell-court-shortlist",
    caseTitle: "Drug driving - Vale Bell",
    clientLabel: "Vale Bell",
    allegation: valeMeta.offenceWording ?? "Drug driving",
  });
  const valeHay = courtHay(vale.war, vale.chaseItems);
  assert.doesNotMatch(valeHay, FAMILY_FURNITURE);
  assert.match(vale.war.safePositionToday, /driver identity and toxicology procedure/i);
  assert.match(vale.war.safePositionToday, /provisional/i);
  assert.ok(
    vale.chase.primaryItems.some((item) => /driver identity and toxicology/i.test(item.label)),
    "Vale Bell labelled outstanding remains a chase card",
  );
}

{
  const hale = courtFromFile(HALE, {
    caseId: "hale-court-shortlist",
    caseTitle: "R v Leon Hale",
    clientLabel: "Leon Hale",
    allegation: "Murder, contrary to common law",
  });
  const haleLabels = hale.chase.primaryItems.map((item) => item.label).join("\n");
  const haleHay = courtHay(hale.war, hale.chaseItems);
  assert.ok(
    /CCTV|phone|CAD|999|interview|BWV/i.test(haleLabels),
    "Hale still surfaces source-backed gaps",
  );
  assert.ok(
    /CCTV|phone|CAD|999|interview|BWV/i.test(haleHay),
    "Hale Court still uses File-backed shortlist",
  );
}

{
  const grant = courtFromFile(GRANT, {
    caseId: "grant-court-shortlist",
    caseTitle: "R v Vincent Grant",
    clientLabel: "Vincent Grant",
    allegation: "Possession of a controlled drug of Class A with intent to supply",
  });
  assert.ok(grant.chase.primaryItems.length > 0, "Grant still has chase items");
  assert.doesNotMatch(
    grant.chase.primaryItems.map((item) => item.label).join("\n"),
    FRAGMENT,
  );
  assert.ok(grant.chaseItems.length > 0, "Grant Court still has File-backed chase items");
}

{
  const dunnMeta = extractBundleCaseMetadata(DUNN);
  assert.match(dunnMeta.defendantName ?? "", /Dunn/i);
  assert.match(`${dunnMeta.offenceWording ?? ""} ${dunnMeta.offenceDisplay ?? ""}`, /burgle|conspiracy/i);
  const dunn = courtFromFile(DUNN, {
    caseId: "dunn-court-shortlist",
    caseTitle: "R v Ellis Dunn",
    clientLabel: "Ellis Dunn",
    allegation: dunnMeta.offenceWording ?? "Conspiracy to burgle",
    snapshotMissing: [
      { label: "O01 full interview transcript", status: "MISSING" },
      { label: "O02 CAD log full print", status: "MISSING" },
      { label: "O03 independent witness statement", status: "MISSING" },
      { label: "O04 forensic continuity statement", status: "MISSING" },
      { label: "O05 999 audio", status: "MISSING" },
    ],
    fileShortlist: [
      "O01 full interview transcript",
      "O02 CAD log full print",
      "O03 independent witness statement",
      "O04 forensic continuity statement",
      "O05 999 audio",
    ],
  });
  const dunnLabels = dunn.chase.primaryItems.map((item) => item.label).join("\n");
  assert.doesNotMatch(dunnLabels, FRAGMENT);
  assert.doesNotMatch(dunnLabels, /phone-attribution|pre-interview|possession and phone/i);
  assert.ok(dunn.chaseItems.length > 0, "Dunn Court still has File-backed chase items");
}

{
  const quiet = courtFromFile("Cover sheet only. No MG6 outstanding schedule.", {
    caseId: "empty-shortlist-quiet",
    caseTitle: "R v Quiet",
    clientLabel: "Quiet",
    allegation: "Assault by beating",
  });
  assert.equal(quiet.chaseItems.length, 0, "empty File shortlist stays empty on Court");
  assert.match(quiet.war.safePositionToday, /provisional/i);
  assert.doesNotMatch(quiet.war.safePositionToday, /999|possession|injury and causation|Custody Record/i);
  assert.equal(quiet.war.askCourtToRecord.length, 0);
}

console.log("court-today-file-shortlist.test.ts: PASS");
