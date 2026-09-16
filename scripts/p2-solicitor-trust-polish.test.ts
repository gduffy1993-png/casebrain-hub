/**
 * P2 solicitor trust polish: same-source card collapse, File-named Court chips,
 * Court Why child receipts, Davies charge glue.
 * Run: npx tsx scripts/p2-solicitor-trust-polish.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assembleSolicitorShortlist,
  buildDisclosureChaseBrief,
  type DisclosureChaseItem,
} from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildDemoAttentionItems } from "../components/criminal/demo-shell/demoOverviewAdapter";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
} from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { displayChaseCardLabel } from "../lib/criminal/demo-presentation-polish";
import {
  humanizeChaseFragmentLabel,
  isPreservedFileNamedChaseLabel,
} from "../lib/criminal/disclosure-chase-finalize";
import { formatOffenceDisplayFromBundle } from "../lib/criminal/extract-bundle-case-metadata";
import {
  collapseSamePracticalChaseCards,
  practicalChaseAsk,
} from "../lib/criminal/solicitor-same-source-dedupe";
import {
  pickCourtLineReceiptSources,
  receiptFromCourtLine,
} from "../lib/criminal/visible-output-receipt";
import { displayPilotStripCharge } from "../components/criminal/workflow/workflowPilotDisplay";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const EXTRACTS = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts",
);

const BROOKES = fs.readFileSync(path.join(EXTRACTS, "RP-17-FRESH-BROOKES.full.txt"), "utf8");
const PATEL = fs.readFileSync(path.join(EXTRACTS, "ISAAC-PATEL-TB-546.full.txt"), "utf8");
const OCR = fs.readFileSync(path.join(EXTRACTS, "RP-08-OCR-0013.full.txt"), "utf8");
const DUNN = fs.readFileSync(path.join(EXTRACTS, "RP-13-DUNN.full.txt"), "utf8");
const ARDEN = fs.readFileSync(path.join(EXTRACTS, "ARDEN-MONSTER-0001.full.txt"), "utf8");
const GRANT = fs.readFileSync(path.join(EXTRACTS, "RP-02-GRANT.full.txt"), "utf8");
const VALE_BELL = fs.readFileSync(path.join(EXTRACTS, "CB-CHARGE-2026-0039.full.txt"), "utf8");

const HALE = [
  "R v Leon Hale",
  "Charge: Murder, contrary to common law",
  "Court: Northchester Crown Court",
  "Next hearing: 22 May 2026 10:00 — First Appearance",
  "EX-MUR-007 — Police officer statement BWV — not served",
  "EX-MUR-009 — CCTV stills and timing note Master footage outstanding EX-MUR-009 to EX-MUR-011",
  "EX-MUR-012 — CAD and 999 summaries Original audio/log outstanding",
  "Final continuity note outstanding",
  "The export log and continuity statement are outstanding.",
  "Full footage, export logs, continuity statement, and camera timing notes remain outstanding.",
].join("\n");

const AHMED = `MG5 CASE SUMMARY
Material still neededsearch record; reasonable excuse; full interview transcript
MG6 DISCLOSURE SCHEDULE
5complete CAD/999 logoutstandingnot attached
DISCLOSURE CORRESPONDENCE
The attachment referred to in the prior message was not included with the email.`;

const GAUNTLET = `MG6C DISCLOSURE SCHEDULE
MG6C/001 Exterior CCTV export log not served Central to sequence, doorway angle and continuity.
MG6C/007 CAD/999 audio outstanding
MG6C/004 Final consultant medical report outstanding
Property bag references LP/4 and LP/14 appear inconsistently. Officer note says final continuity statement to follow.`;

const FRAGMENT =
  /reasonable excuse|not included with the email|officer note says|treated as a settled|this point collapses if/i;
const PACK_CHARGE = /possession\s*\/\s*knowledge\s*\/\s*phone-attribution|phone-attribution pressure/i;

function chaseItem(id: string, label: string, ref?: string): DisclosureChaseItem {
  return {
    id,
    familyId: "other",
    label,
    whyItMatters: "File-named outstanding material.",
    source: "File extract",
    baseStatus: "Outstanding",
    urgency: "medium",
    deadlineLabel: "Before listing",
    evidenceAnchor: label,
    linkedRoute: null,
    draftChaseWording: `Please provide ${label}`,
    courtLine: `The defence asks the court to record that ${label} remains outstanding.`,
    mergedFrom: [label],
    sourceScheduleRef: ref ?? null,
  };
}

function chaseFromFile(
  bundleText: string,
  extras: {
    caseId: string;
    caseTitle: string;
    clientLabel: string;
    allegation: string;
    snapshotMissing?: { label: string; status: string }[];
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

function countFamily(labels: string[], re: RegExp): number {
  return labels.filter((label) => re.test(label)).length;
}

{
  const collapsed = collapseSamePracticalChaseCards([
    chaseItem("sub-1", "Subscriber data"),
    chaseItem("sub-2", "Subscriber / account data"),
    chaseItem("wa-1", "Original WhatsApp export"),
    chaseItem("wa-2", "WhatsApp export"),
    chaseItem("u5", "U5 Email from witness attaching screenshots", "U5"),
    chaseItem("dl-generic", "Full phone download / source extraction"),
    chaseItem("dl-named", "MG6C / disclosure schedule12-13 Original download and voice note"),
    chaseItem("vn-1", "Voice note Described but not served"),
    chaseItem("vn-2", "Voice note original audio"),
  ]);
  const labels = collapsed.map((item) => item.label).join(" || ");
  const askOf = (ask: ReturnType<typeof practicalChaseAsk>) =>
    collapsed.filter((item) => practicalChaseAsk(item.label) === ask).length;
  assert.equal(askOf("subscriber"), 1, labels);
  assert.equal(askOf("whatsapp_export"), 1, labels);
  assert.equal(askOf("voice_note"), 1, labels);
  assert.equal(askOf("email_u5"), 1, labels);
  assert.equal(askOf("phone_download"), 1, labels);
  assert.ok(/U5/i.test(labels), "Brookes collapse keeps U5");
  assert.ok(/WhatsApp/i.test(labels), "Brookes collapse keeps WhatsApp");
  assert.ok(/subscriber/i.test(labels), "Brookes collapse keeps subscriber");
  assert.equal(countFamily(collapsed.map((i) => i.label), /^Full phone download/i), 0);
  assert.ok(/original download/i.test(labels), "Brookes collapse keeps File-named original download");
  assert.match(collapsed[0]?.label ?? "", /subscriber/i);
}

{
  const short = assembleSolicitorShortlist([
    chaseItem("ledger-material-u5", "U5 Email from witness attaching screenshots", "U5"),
    chaseItem("ledger-material-wa1", "Original WhatsApp export"),
    chaseItem("ledger-material-wa2", "WhatsApp export"),
    chaseItem("ledger-material-sub1", "Subscriber data or phone attribution report"),
    chaseItem("ledger-material-sub2", "Subscriber data"),
    chaseItem("ledger-material-vn1", "Voice note Described but not served"),
    chaseItem("ledger-material-vn2", "Voice note original audio"),
    chaseItem("ledger-material-dl", "Full phone download / source extraction"),
    chaseItem("ledger-material-mg6c", "MG6C / disclosure schedule12-13 Original download and voice note"),
  ]);
  const labels = short.primaryItems.map((item) => item.label);
  const hay = labels.join(" || ");
  assert.ok(/U5/i.test(hay), `shortlist keeps U5: ${hay}`);
  assert.ok(/WhatsApp/i.test(hay), `shortlist keeps WhatsApp: ${hay}`);
  assert.ok(/subscriber/i.test(hay), `shortlist keeps subscriber: ${hay}`);
  assert.ok(labels.filter((label) => practicalChaseAsk(label) === "subscriber").length <= 1, hay);
  assert.ok(labels.filter((label) => practicalChaseAsk(label) === "whatsapp_export").length <= 1, hay);
  assert.ok(labels.filter((label) => practicalChaseAsk(label) === "voice_note").length <= 1, hay);
  assert.equal(labels.filter((label) => /^Full phone download/i.test(label)).length, 0, hay);
}

{
  const collapsed = collapseSamePracticalChaseCards([
    chaseItem("int-generic", "Full Interview recording / transcript"),
    chaseItem("int-named", "MG6/07 full interview transcript", "MG6/07"),
    chaseItem("cctv", "MG6/05 full CCTV master", "MG6/05"),
  ]);
  const labels = collapsed.map((item) => item.label);
  assert.equal(countFamily(labels, /interview/i), 1);
  assert.ok(labels.some((label) => /MG6\/07/i.test(label)));
  assert.ok(labels.some((label) => /MG6\/05/i.test(label)));
}

{
  const collapsed = collapseSamePracticalChaseCards([
    chaseItem("ocr-1", "continuity/provenance not yet confirmed; full-resolution original"),
    chaseItem("ocr-2", "Full-resolution original"),
    chaseItem("ocr-3", "Continuity/provenance not yet confirmed"),
    chaseItem("ocr-4", "full chat export / device extraction / sender attribution / metadata / uncropped screenshot"),
  ]);
  const labels = collapsed.map((item) => item.label);
  assert.ok(labels.some((label) => /chat export|device extraction/i.test(label)));
  assert.equal(
    labels.filter((label) => practicalChaseAsk(label) === "ocr_visual_source").length,
    1,
  );
}

{
  const collapsed = collapseSamePracticalChaseCards([
    chaseItem("c1", "Final continuity note"),
    chaseItem("c2", "The export log and continuity statement are outstanding."),
    chaseItem("c3", "Full footage, export logs, continuity statement, and camera timing notes remain"),
    chaseItem("master", "CCTV stills and timing note Master footage", "EX-MUR-009"),
  ]);
  const labels = collapsed.map((item) => item.label);
  assert.ok(labels.some((label) => /Master footage/i.test(label)));
  assert.equal(labels.filter((label) => practicalChaseAsk(label) === "cctv_continuity").length, 1);
}

{
  assert.equal(isPreservedFileNamedChaseLabel("O02 CAD log full print"), true);
  assert.equal(isPreservedFileNamedChaseLabel("MG6C/007 CAD/999 audio"), true);
  assert.doesNotMatch(humanizeChaseFragmentLabel("O02 CAD log full print"), /CAD \/ dispatch log material/i);
  assert.match(humanizeChaseFragmentLabel("O02 CAD log full print"), /O02/);
  assert.match(humanizeChaseFragmentLabel("MG6C/007 CAD/999 audio"), /MG6C\/007/);
  assert.doesNotMatch(
    displayChaseCardLabel({ label: "O02 CAD log full print" }),
    /CAD \/ dispatch log material/i,
  );
  assert.doesNotMatch(
    displayChaseCardLabel({
      label: "MG6C / disclosure schedule12-13 Original download and voice note",
    }),
    /^Full phone download/i,
  );
  const arden =
    "Outstanding / incomplete: full bundle pages 88-94 and 201-206, full CCTV master, continuity";
  assert.notEqual(humanizeChaseFragmentLabel(arden), "Further papers on the file");
  assert.match(humanizeChaseFragmentLabel(arden), /CCTV master/i);
}

{
  const brookes = chaseFromFile(BROOKES, {
    caseId: "brookes-p2",
    caseTitle: "R v Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: "Intimidating a witness",
    snapshotMissing: [
      { label: "U5 Email from witness attaching screenshots", status: "MISSING" },
      { label: "Original WhatsApp export", status: "MISSING" },
      { label: "WhatsApp export", status: "MISSING" },
      { label: "Subscriber data or phone attribution report", status: "MISSING" },
      { label: "Subscriber data", status: "MISSING" },
      { label: "Voice note Described but not served", status: "MISSING" },
      { label: "Voice note original audio", status: "MISSING" },
      { label: "Full phone download / source extraction", status: "MISSING" },
      { label: "MG6C / disclosure schedule12-13 Original download and voice note", status: "MISSING" },
    ],
  });
  const labels = brookes.chase.primaryItems.map((item) => item.label);
  const hay = labels.join(" || ");
  assert.ok(/WhatsApp/i.test(hay), `Brookes keeps WhatsApp: ${hay}`);
  assert.ok(/subscriber/i.test(hay), `Brookes keeps subscriber: ${hay}`);
  assert.ok(
    labels.filter((label) => practicalChaseAsk(label) === "subscriber").length <= 1,
    `Brookes subscriber dupes: ${hay}`,
  );
  assert.ok(
    labels.filter((label) => practicalChaseAsk(label) === "whatsapp_export").length <= 1,
    `Brookes WhatsApp dupes: ${hay}`,
  );
  assert.ok(
    labels.filter((label) => practicalChaseAsk(label) === "voice_note").length <= 1,
    `Brookes voice-note dupes: ${hay}`,
  );
  assert.doesNotMatch(hay, PACK_CHARGE);
}

{
  const patel = chaseFromFile(PATEL, {
    caseId: "patel-p2",
    caseTitle: "R v Isaac Patel",
    clientLabel: "Isaac Patel",
    allegation: "Affray",
  });
  const labels = patel.chase.primaryItems.map((item) => item.label);
  const hay = labels.join(" || ");
  assert.ok(/interview/i.test(hay), "Patel keeps interview gap");
  assert.ok(countFamily(labels, /interview/i) <= 1, `Patel interview dupes: ${hay}`);
  assert.doesNotMatch(hay, FRAGMENT);
}

{
  const ocr = chaseFromFile(OCR, {
    caseId: "ocr-p2",
    caseTitle: "R v Emery Beck",
    clientLabel: "Emery Beck",
    allegation: "ABH",
  });
  const labels = ocr.chase.primaryItems.map((item) => item.label);
  const visual = labels.filter((label) => practicalChaseAsk(label) === "ocr_visual_source");
  assert.ok(visual.length <= 1, `OCR visual split: ${labels.join(" || ")}`);
}

{
  const hale = chaseFromFile(HALE, {
    caseId: "hale-p2",
    caseTitle: "R v Leon Hale",
    clientLabel: "Leon Hale",
    allegation: "Murder, contrary to common law",
    snapshotMissing: [
      { label: "CCTV stills and timing note Master footage", status: "MISSING" },
      { label: "Final continuity note", status: "MISSING" },
      { label: "The export log and continuity statement are outstanding.", status: "MISSING" },
      { label: "Full footage, export logs, continuity statement, and camera timing notes remain", status: "MISSING" },
    ],
  });
  const labels = hale.chase.primaryItems.map((item) => item.label);
  assert.ok(labels.some((label) => /Master footage|CCTV stills/i.test(label)));
  assert.ok(
    labels.filter((label) => practicalChaseAsk(label) === "cctv_continuity").length <= 1,
    `Hale continuity dupes: ${labels.join(" || ")}`,
  );
}

{
  const dunnItems = buildChaseItemsForHearing({
    bundleText: DUNN,
    snapshotMissing: [],
    battleboard: null,
    fileBackedShortlist: ["O02 CAD log full print", "O05 999 audio", "O01 full interview transcript"],
  });
  assert.equal(dunnItems[0], "O02 CAD log full print");
  assert.doesNotMatch(displayChaseCardLabel({ label: dunnItems[0]! }), /^CAD \/ dispatch log material$/i);
  const dunnWar = buildHearingWarRoomBrief({
    caseId: "dunn-p2-chip",
    caseTitle: "R v Ellis Dunn",
    clientLabel: "Ellis Dunn",
    allegation: "Conspiracy to burgle",
    stage: "trial tomorrow",
    hearingStatus: "Listed",
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    battleboard: null,
    hasSavedPosition: false,
    chaseItems: dunnItems,
    bundleText: DUNN,
  });
  assert.match(dunnWar.safePositionToday, /O02 CAD log full print/i);
  assert.doesNotMatch(dunnWar.safePositionToday, /CAD \/ dispatch log material/i);
}

{
  const gauntletItems = buildChaseItemsForHearing({
    bundleText: GAUNTLET,
    snapshotMissing: [],
    battleboard: null,
    fileBackedShortlist: [
      "MG6C/001 Exterior CCTV export log",
      "MG6C/007 CAD/999 audio",
      "MG6C/004 Final consultant medical report",
    ],
  });
  assert.equal(gauntletItems[1], "MG6C/007 CAD/999 audio");
  assert.doesNotMatch(
    displayChaseCardLabel({ label: gauntletItems[1]! }),
    /^999 audio \/ emergency-call material$/i,
  );
}

{
  const ardenItems = buildChaseItemsForHearing({
    bundleText: ARDEN,
    snapshotMissing: [],
    battleboard: null,
    fileBackedShortlist: [
      "Outstanding / incomplete: full bundle pages 88-94 and 201-206, full CCTV master, continuity",
    ],
  });
  assert.doesNotMatch(ardenItems[0] ?? "", /^Further papers on the file$/i);
  assert.doesNotMatch(
    displayChaseCardLabel({ label: ardenItems[0]! }),
    /^Further papers on the file$/i,
  );
}

{
  const arden = chaseFromFile(ARDEN, {
    caseId: "arden-p2",
    caseTitle: "R v Arden Vale",
    clientLabel: "Arden Vale",
    allegation: "Robbery",
  });
  const chip = arden.chaseItems[0] ?? arden.chase.primaryItems[0]?.label ?? "";
  if (chip) {
    assert.doesNotMatch(chip, /^Further papers on the file$/i);
  }
}

{
  const sources = [
    {
      label: "O02 CAD log full print",
      baseStatus: "Outstanding",
      sourceScheduleRef: "O02",
      evidenceAnchor: "O02 CAD log full print Outstanding Not yet served",
    },
    {
      label: "O05 999 audio",
      baseStatus: "Outstanding",
      sourceScheduleRef: "O05",
      evidenceAnchor: "O05 999 audio Outstanding",
    },
  ];
  const line =
    "The defence asks the court to record that O02 CAD log full print; O05 999 audio remain outstanding on the current papers.";
  const picked = pickCourtLineReceiptSources(line, sources);
  const receipt = receiptFromCourtLine(line, picked);
  assert.equal(receipt.sourceClass, "multi_source_backed");
  assert.notEqual(receipt.supportingText, null);
  assert.doesNotMatch(receipt.supportingText ?? "", /No supporting File\/PDF quote available/i);
  assert.ok((receipt.childReceipts?.length ?? 0) >= 2);
  assert.equal(receipt.unsupportedWarning, null);
}

{
  const glued = formatOffenceDisplayFromBundle(
    "Primary charge:Concealing criminal property, contrary to section 327 Proceeds of Crime Act 2002",
  );
  assert.doesNotMatch(glued, /^Primary charge:/i);
  assert.match(glued, /Concealing criminal property/i);
  const strip = displayPilotStripCharge("Primary charge:Concealing criminal property, contrary to section 327");
  assert.doesNotMatch(strip, /^Primary charge:/i);
}

{
  const ahmed = chaseFromFile(AHMED, {
    caseId: "ahmed-p2-stay",
    caseTitle: "R v Holly Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
  });
  assert.doesNotMatch(ahmed.chase.primaryItems.map((item) => item.label).join(" "), FRAGMENT);
  const grant = chaseFromFile(GRANT, {
    caseId: "grant-p2-stay",
    caseTitle: "R v Vincent Grant",
    clientLabel: "Vincent Grant",
    allegation: "Possession of a controlled drug of Class A with intent to supply",
  });
  assert.doesNotMatch(grant.chase.primaryItems.map((item) => item.label).join(" "), FRAGMENT);
  const vale = chaseFromFile(VALE_BELL, {
    caseId: "vale-p2-stay",
    caseTitle: "R v Vale Bell",
    clientLabel: "Vale Bell",
    allegation: "Drug driving",
  });
  assert.doesNotMatch(vale.chase.primaryItems.map((item) => item.label).join(" "), /possession furniture|PWITS/i);
}

console.log("p2-solicitor-trust-polish.test.ts passed");
