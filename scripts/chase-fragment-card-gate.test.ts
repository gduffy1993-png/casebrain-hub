/**
 * Clause / narrative fragments must not become Overview or Chase cards.
 * Named schedule gaps still must.
 * Run: npx tsx scripts/chase-fragment-card-gate.test.ts
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
import {
  isClauseOrFragmentChaseLabel,
  lineIsUnsourcedNarrativeChase,
} from "../lib/criminal/bundle-material-normalizer";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { workflowHeaderOverrides } from "../lib/criminal/pilot-workflow";
import {
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
  resolvePilotChargeDisplay,
} from "../components/criminal/workflow/workflowPilotDisplay";
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

/** Live PDF glue: still-needed list and numbered MG6 cells on one line. */
const AHMED = `MG5 CASE SUMMARY
Material still neededsearch record; reasonable excuse; full interview transcript
MG6 DISCLOSURE SCHEDULE
Item Description Status Note
3search recordoutstandingrequested
4reasonable excuseoutstandingneeded before final position
5complete CAD/999 logoutstandingnot attached
5phone subscriber dataoutstandingnot attached
DISCLOSURE CORRESPONDENCE
The attachment referred to in the prior message was not included with the email.
The final report is not included in this bundle.`;

const PATEL_FRAGMENT =
  "Where the full recording or transcript is not served, the account must not be treated as a settled";
const PATEL = `MG5 - CASE SUMMARY
Interview position is summarised only. ${PATEL_FRAGMENT}
MG6 DISCLOSURE SCHEDULE
MG6/04 signed final MG11 outstanding requested / not attached
MG6/05 full CCTV master outstanding requested / not attached
MG6/07 full interview transcript outstanding
Full interview recording / transcript: not served in this bundle.
EX/01 — item referred to in MG5 (listed).`;

const GAUNTLET = `MG6C DISCLOSURE SCHEDULE
MG6C/001Exterior CCTV export log not servedCentral to sequence, doorway angle and continuity.
MG6C/007 CAD/999 audio outstanding
MG6C/004 Final consultant medical report outstanding
Property bag references LP/4 and LP/14 appear inconsistently. Officer note says final continuity statement to follow.`;

const FRAGMENT_CARD =
  /reasonable excuse|not included with the email|officer note says|treated as a settled|where the (?:full )?(?:recording|transcript)|review remains outstanding or incomplete|this point collapses if|strategy point collapses if/i;

const PACK_CHARGE = /possession\s*\/\s*knowledge\s*\/\s*phone-attribution|phone-attribution pressure|\bpwits\b/i;

function chaseFromFile(
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
  const overview = buildDemoAttentionItems(chase.primaryItems);
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
  return { chase, overview, chaseItems, war };
}

function labelsOf(chase: ReturnType<typeof buildDisclosureChaseBrief>): string[] {
  return chase.primaryItems.map((item) => item.label);
}

function boardOf(chase: ReturnType<typeof buildDisclosureChaseBrief>): string {
  return labelsOf(chase).join(" || ");
}

{
  assert.equal(isClauseOrFragmentChaseLabel("reasonable excuse"), true);
  assert.equal(isClauseOrFragmentChaseLabel("reasonable excuse outstanding"), true);
  assert.equal(isClauseOrFragmentChaseLabel("4 reasonable excuse outstanding needed before final position"), true);
  assert.equal(isClauseOrFragmentChaseLabel("not included with the email."), true);
  assert.equal(
    isClauseOrFragmentChaseLabel("The attachment referred to in the prior message was not included with the email."),
    true,
  );
  assert.equal(
    isClauseOrFragmentChaseLabel(
      "Where the full recording or transcript is not served, the account must not be treated as a settled",
    ),
    true,
  );
  assert.equal(isClauseOrFragmentChaseLabel("Officer note says final continuity statement to follow."), true);
  assert.equal(isClauseOrFragmentChaseLabel("search record outstanding"), false);
  assert.equal(isClauseOrFragmentChaseLabel("full interview transcript outstanding"), false);
  assert.equal(isClauseOrFragmentChaseLabel("MG6C/001 Exterior CCTV export log not served"), false);
  assert.equal(isClauseOrFragmentChaseLabel("Original WhatsApp export — not served."), false);
  assert.equal(lineIsUnsourcedNarrativeChase("search record outstanding"), false);
}

// 1. Ahmed fragment phrases are suppressed; named gaps remain.
{
  const { chase, overview } = chaseFromFile(AHMED, {
    caseId: "ahmed-fragment-gate",
    caseTitle: "R v Holly Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
  });
  const board = boardOf(chase);
  const overviewHay = overview.map((item) => item.title).join("\n");
  assert.doesNotMatch(board, /reasonable excuse/i);
  assert.doesNotMatch(board, /not included with the email/i);
  assert.doesNotMatch(overviewHay, /reasonable excuse/i);
  assert.doesNotMatch(overviewHay, /not included with the email/i);
  assert.ok(/search record/i.test(board), `Ahmed named search record must remain — got: ${board}`);
  assert.ok(/interview transcript/i.test(board), `Ahmed named interview transcript must remain — got: ${board}`);
  assert.equal(overview.length, chase.primaryItems.length, "Ahmed Overview and Chase share the same shortlist");
}

// 2. Patel Overview and Chase do not diverge because of a fragment card.
{
  const { chase, overview } = chaseFromFile(PATEL, {
    caseId: "patel-fragment-gate",
    caseTitle: "R v Isaac Patel",
    clientLabel: "Isaac Patel",
    allegation: "Affray",
    snapshotMissing: [{ label: PATEL_FRAGMENT, status: "MISSING" }],
  });
  const board = boardOf(chase);
  const overviewHay = overview.map((item) => item.title).join("\n");
  assert.doesNotMatch(board, FRAGMENT_CARD);
  assert.doesNotMatch(overviewHay, FRAGMENT_CARD);
  assert.equal(
    overview.length,
    chase.primaryItems.length,
    `Patel Overview ${overview.length} vs Chase ${chase.primaryItems.length} — ${board}`,
  );
  assert.ok(
    chase.primaryItems.some((item) => /CCTV/i.test(item.label)),
    `Patel named CCTV gap must remain — got: ${board}`,
  );
  assert.ok(
    chase.primaryItems.some((item) => /interview/i.test(item.label)),
    `Patel named interview gap must remain — got: ${board}`,
  );
}

// 3. Gauntlet officer-note sentence is not a standalone chase card.
{
  const { chase, overview } = chaseFromFile(GAUNTLET, {
    caseId: "gauntlet-fragment-gate",
    caseTitle: "R v Riley North",
    clientLabel: "Riley North",
    allegation: "Wounding with intent",
  });
  const board = boardOf(chase);
  const overviewHay = overview.map((item) => item.title).join("\n");
  assert.doesNotMatch(board, /officer note says/i);
  assert.doesNotMatch(overviewHay, /officer note says/i);
  assert.ok(
    chase.primaryItems.some((item) => /MG6C\/001|CCTV export/i.test(item.label)),
    `Gauntlet named CCTV export must remain — got: ${board}`,
  );
  assert.equal(overview.length, chase.primaryItems.length);
}

// 4. Real named missing material still appears (compact Ahmed schedule).
{
  const named = chaseFromFile(
    [
      "MG6 DISCLOSURE SCHEDULE",
      "3 search record outstanding requested",
      "4 reasonable excuse outstanding needed before final position",
      "5 complete CAD/999 log outstanding not attached",
      "The attachment referred to in the prior message was not included with the email.",
    ].join("\n"),
    {
      caseId: "named-missing-still-appears",
      caseTitle: "R v Holly Ahmed",
      clientLabel: "Holly Ahmed",
      allegation: "Possession of a bladed article",
    },
  );
  const board = boardOf(named.chase);
  assert.ok(/search record/i.test(board), `named search record missing — ${board}`);
  assert.ok(/CAD\s*\/\s*999/i.test(board), `named CAD/999 missing — ${board}`);
  assert.doesNotMatch(board, /reasonable excuse/i);
  assert.doesNotMatch(board, /not included with the email/i);
}

// 5. Existing good roots stay good: Brookes File-first charge, Court Today File shortlist,
//    Vale Bell front-sheet, Dunn/Hale/Grant.
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
    caseId: "brookes-fragment-stay-good",
    caseTitle: "R v Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: brookesMeta.offenceWording ?? "Intimidating a witness",
  });
  const brookesBoard = boardOf(brookes.chase);
  assert.doesNotMatch(brookesBoard, FRAGMENT_CARD);
  assert.ok(
    /whatsapp|voice note|subscriber|attribution|export|email/i.test(brookesBoard),
    `Brookes File digital gaps must remain — ${brookesBoard}`,
  );
  assert.ok(brookes.chaseItems.length > 0, "Brookes Court still has File-backed chase items");
}

{
  const valeMeta = extractBundleCaseMetadata(VALE_BELL);
  const vale = chaseFromFile(VALE_BELL, {
    caseId: "vale-bell-fragment-stay-good",
    caseTitle: "Drug driving - Vale Bell",
    clientLabel: "Vale Bell",
    allegation: valeMeta.offenceWording ?? "Drug driving",
  });
  const valeBoard = boardOf(vale.chase);
  assert.doesNotMatch(valeBoard, FRAGMENT_CARD);
  assert.ok(
    vale.chase.primaryItems.some((item) => /driver identity and toxicology/i.test(item.label)),
    `Vale Bell labelled outstanding remains a chase card — ${valeBoard}`,
  );
  assert.match(vale.war.safePositionToday, /driver identity and toxicology procedure/i);
}

{
  const hale = chaseFromFile(HALE, {
    caseId: "hale-fragment-stay-good",
    caseTitle: "R v Leon Hale",
    clientLabel: "Leon Hale",
    allegation: "Murder, contrary to common law",
  });
  const haleBoard = boardOf(hale.chase);
  assert.doesNotMatch(haleBoard, FRAGMENT_CARD);
  assert.ok(/CCTV|phone|CAD|999|interview|BWV/i.test(haleBoard), `Hale named gaps remain — ${haleBoard}`);
}

{
  const grant = chaseFromFile(GRANT, {
    caseId: "grant-fragment-stay-good",
    caseTitle: "R v Vincent Grant",
    clientLabel: "Vincent Grant",
    allegation: "Possession of a controlled drug of Class A with intent to supply",
  });
  assert.ok(grant.chase.primaryItems.length > 0, "Grant still has chase items");
  assert.doesNotMatch(boardOf(grant.chase), FRAGMENT_CARD);
}

{
  const dunnMeta = extractBundleCaseMetadata(DUNN);
  const dunn = chaseFromFile(DUNN, {
    caseId: "dunn-fragment-stay-good",
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
  const dunnBoard = boardOf(dunn.chase);
  assert.doesNotMatch(dunnBoard, FRAGMENT_CARD);
  assert.ok(dunn.chaseItems.length > 0, "Dunn Court still has File-backed chase items");
}

{
  const display = resolvePilotChargeDisplay("");
  assert.equal(display, PILOT_CHARGE_NOT_IDENTIFIED_LABEL);
}

console.log("chase-fragment-card-gate.test.ts: PASS");
