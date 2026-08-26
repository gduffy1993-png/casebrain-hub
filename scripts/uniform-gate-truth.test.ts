/**
 * The app was checking for a uniform, not for the fact.
 *
 * If the papers wore Charge: / R v / MG6/04 / O01 / No BWV, it got them right.
 * The same facts in a different uniform (name above Charge, arrested on suspicion,
 * numbered MG6 cell `3search recordoutstanding`, O1, "not mentioned", "not served")
 * were missed or inverted.
 *
 * Both directions: the failing uniform is now read, and the passing uniform still holds.
 *
 * Run: npx tsx scripts/uniform-gate-truth.test.ts
 */
import assert from "node:assert/strict";

import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  classifyMaterialStatus,
  deglueScheduleText,
  normaliseBundleMaterials,
  parseScheduleRef,
  splitOutstandingInventoryLine,
} from "../lib/criminal/bundle-material-normalizer";
import {
  buildCanonicalPipelineFromDocumentUnits,
  deriveEvidenceRowsFromDocumentUnits,
  isFragmentEvidenceLabel,
} from "../lib/criminal/build-from-document-units";
import {
  familySupport,
  isInterviewRecordingEstablished,
} from "../lib/criminal/chase-source-gate";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks += 1;
}

console.log("the failing uniform is now read");

check("numbered MG6 cell without a letter-code still states outstanding", () => {
  assert.equal(deglueScheduleText("3search recordoutstandingrequested"), "3 search record outstanding requested");
  assert.equal(classifyMaterialStatus("3search recordoutstandingrequested"), "outstanding");
  const rows = normaliseBundleMaterials(
    "MG6 DISCLOSURE SCHEDULE\n3search recordoutstandingrequested\n4reasonable excuseoutstandingneeded before final position",
  );
  assert.ok(
    rows.some((r) => r.status === "outstanding" && /search record/i.test(r.label)),
    `search record must be a row — got ${rows.map((r) => r.label).join(" | ")}`,
  );
  assert.ok(
    rows.some((r) => r.status === "outstanding" && /reasonable excuse/i.test(r.label)),
    `reasonable excuse must be a row — got ${rows.map((r) => r.label).join(" | ")}`,
  );
  assert.ok(
    rows.every((r) => !/^\d{1,2}\s/.test(r.label)),
    `row number is not the name of the material — got ${rows.map((r) => r.label).join(" | ")}`,
  );
  const numbered = normaliseBundleMaterials(
    "MG6 DISCLOSURE SCHEDULE\n5phone subscriber dataoutstandingnot attached\n5complete CAD/999 logoutstandingnot attached",
  );
  const subscriberRow = numbered.find((r) => /subscriber/i.test(r.label));
  assert.ok(subscriberRow && !/^\d/.test(subscriberRow.label), `got ${subscriberRow?.label}`);
  assert.ok(
    numbered.some((r) => /cad\s*\/\s*999/i.test(r.label) && /999/.test(r.label)),
    `999 in CAD/999 is the kind of log, not a row number — got ${numbered.map((r) => r.label).join(" | ")}`,
  );
  const subscriber = deglueScheduleText("5phone subscriber dataoutstandingnot attached");
  assert.match(subscriber, /subscriber data outstanding/i);
});

check("O1 is a schedule reference, the same as O01", () => {
  assert.equal(parseScheduleRef("O1 Full interview transcript Outstanding"), "O1");
  assert.equal(parseScheduleRef("O3 CCTV full export Outstanding"), "O3");
});

check("O05 welded to 999 audio is still O05 and 999 audio", () => {
  assert.equal(deglueScheduleText("O05999 audio Outstanding Listed but not attached"), "O05 999 audio Outstanding Listed but not attached");
  assert.equal(parseScheduleRef("O05999 audio Outstanding Listed but not attached"), "O05");
  assert.equal(parseScheduleRef("O05 999 audio Outstanding Listed but not attached"), "O05");
  const rows = normaliseBundleMaterials(
    "MG6 DISCLOSURE SCHEDULE\nO05999 audio Outstanding Listed but not attached",
  );
  const audio = rows.find((r) => /999 audio/i.test(r.label) || r.scheduleRef === "O05");
  assert.ok(audio, `O05 999 audio must be a row — got ${rows.map((r) => r.label).join(" | ")}`);
  assert.doesNotMatch(audio!.label, /O05999/);
  assert.match(audio!.label, /999 audio/i);
  assert.equal(parseScheduleRef("CAD/999 — Bundle health note Partial served bundle"), null);
});

check("a name above Charge: is the defendant", () => {
  const reed = extractBundleCaseMetadata("Taylor Reed\nCharge: Harassment\nFull phone download outstanding.");
  assert.equal(reed.defendantName, "Taylor Reed");
  const hale = extractBundleCaseMetadata(
    "Jordan Hale\nCharge: Assault on emergency worker\nBWV referred on schedule but not served — outstanding.",
  );
  assert.equal(hale.defendantName, "Jordan Hale");
});

check("arrested on suspicion of burglary is the charge", () => {
  const meta = extractBundleCaseMetadata(
    "CASE: R v Liam Carter\nThe male was arrested on suspicion of burglary.\nReleased under investigation.",
  );
  assert.match(meta.offenceDisplay ?? meta.offenceWording ?? "", /burglary/i);
});

check("a date of arrest is not a listing", () => {
  const arrestOnly = extractBundleCaseMetadata(
    "CASE: R v Liam Carter\nDATE OF ARREST: 03/02/2025\nTIME OF ARREST: 20:15 hours\nThe male was arrested on suspicion of burglary.",
  );
  assert.equal(arrestOnly.nextHearingRaw, null, `arrest date must not become a listing — got ${arrestOnly.nextHearingRaw}`);
  assert.equal(arrestOnly.nextHearingIso, null);

  const listed = extractBundleCaseMetadata(
    "CASE: R v Liam Carter\nDATE OF ARREST: 03/02/2025\nNext hearing: 15 July 2026 at 10:00\nThe male was arrested on suspicion of burglary.",
  );
  assert.match(listed.nextHearingRaw ?? "", /15 July 2026/i);
  assert.doesNotMatch(listed.nextHearingRaw ?? "", /03\/02\/2025/);
});

check("not served is not served", () => {
  const rows = deriveEvidenceRowsFromDocumentUnits([
    {
      id: "live-03",
      title: "LIVE-03-bwv-cctv.pdf",
      uploadOrder: 0,
      pages: [
        {
          pageNumber: 1,
          text: "Custody extract served (PACE clock summary). BWV referred on schedule but not served — outstanding.",
        },
      ],
    },
  ]);
  assert.ok(
    rows.some((r) => /custody extract/i.test(r.label) && r.existence === "served"),
    `custody extract must stay served — ${JSON.stringify(rows)}`,
  );
  assert.ok(
    !rows.some((r) => /bwv/i.test(r.label) && r.existence === "served"),
    `BWV not served must not be recorded as served — ${JSON.stringify(rows)}`,
  );
  assert.equal(isFragmentEvidenceLabel("BWV referred on schedule but not"), true);
});

check("interview recording not mentioned does not establish a recording chase", () => {
  const papers =
    "Jordan Hale\nCharge: Assault on emergency worker\nCustody extract served (PACE clock summary).\nBWV referred on schedule but not served — outstanding.\nInterview recording not mentioned.";
  assert.equal(isInterviewRecordingEstablished(papers), false);
  assert.equal(familySupport("interview", papers), "negated");
  assert.equal(classifyMaterialStatus("Interview recording not mentioned."), null);
  const ledger = normaliseBundleMaterials(papers);
  const bwvRow = ledger.find((r) => /bwv/i.test(r.label));
  assert.ok(bwvRow, `BWV must still be a Papers row — got ${ledger.map((r) => r.label).join(" | ")}`);
  assert.match(
    bwvRow!.label,
    /not served/i,
    `but not served is the description, not a status column — got ${bwvRow!.label}`,
  );
  assert.doesNotMatch(bwvRow!.label, /\bbut\s*$/i);
  const mapping = normaliseBundleMaterials(
    "Taylor Reed\nCharge: Harassment\nFull phone download / subscriber mapping outstanding.",
  );
  const phone = mapping.find((r) => /phone download/i.test(r.label));
  assert.ok(phone, `opposite: mapping cell must remain a row — got ${mapping.map((r) => r.label).join(" | ")}`);
  assert.doesNotMatch(
    phone!.label,
    /\boutstanding\b/i,
    `opposite: a real status cell still leaves the name — got ${phone!.label}`,
  );
  const brief = buildDisclosureChaseBrief({
    caseId: "jordan-hale-bwv",
    caseTitle: "Jordan Hale",
    clientLabel: "Jordan Hale",
    allegation: "Assault on emergency worker",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: papers,
    canonicalEvidenceRows: [
      { label: "Assault on emergency worker Custody extract", state: "served" },
      { label: "BWV referred on schedule but not", state: "served" },
      { label: "BWV referred on schedule but", state: "missing" },
    ],
  });
  const board = brief.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/bwv/i.test(board), `BWV outstanding must reach the board — got: ${board}`);
  const bwv = brief.primaryItems.find((i) => /bwv/i.test(i.label));
  assert.equal(
    bwv?.baseStatus,
    "Outstanding",
    `BWV referred on schedule but outstanding is a chase gap — got ${bwv?.baseStatus}`,
  );
  assert.ok(
    !/interview recording/i.test(board),
    `interview recording not mentioned must not become a request — got: ${board}`,
  );
  assert.ok(
    !/full custody/i.test(board),
    `custody extract served must not become a full-record request — got: ${board}`,
  );
  const pipeline = buildCanonicalPipelineFromDocumentUnits([
    {
      id: "live-03",
      title: "LIVE-03-bwv-cctv.pdf",
      uploadOrder: 0,
      pages: [{ pageNumber: 1, text: papers }],
    },
  ]);
  assert.equal(
    pipeline.findings.some((f) => f.kind === "recording_vs_transcript"),
    false,
    `interview recording not mentioned must not become a served recording finding — ${pipeline.findings.map((f) => f.summary).join(" | ")}`,
  );
  assert.ok(
    !pipeline.evidenceRows.some((r) => /interview recording/i.test(r.label) && r.existence === "served"),
    `not mentioned must not be recorded as served — ${JSON.stringify(pipeline.evidenceRows)}`,
  );
});

check("search record outstanding reaches the chase list without a letter-code", () => {
  const brief = buildDisclosureChaseBrief({
    caseId: "ahmed-search-record",
    caseTitle: "Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
Item Description Status Note
1 MG5 case summary served included
2 Charge sheet served included
3search recordoutstandingrequested
4reasonable excuseoutstandingneeded before final position
5complete CAD/999 logoutstandingnot attached`,
  });
  const board = brief.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/search record/i.test(board), `search record must be on the board — got: ${board}`);
  assert.ok(/reasonable excuse/i.test(board), `reasonable excuse must be on the board — got: ${board}`);
  const cad = brief.primaryItems.find((i) => /cad\s*\/\s*999/i.test(i.label));
  assert.ok(cad, `complete CAD/999 log must be on the board — got: ${board}`);
  assert.equal(cad!.baseStatus, "Outstanding", `welded CAD outstanding must stay outstanding — got ${cad!.baseStatus}`);
  assert.ok(
    !brief.primaryItems.some((i) => /^\d{1,2}\s/.test(i.label) && !/999/.test(i.label)),
    `a numbered MG6 cell must not wear its row number as the name — got: ${board}`,
  );
});

check("welded phone subscriber data outstanding still reaches the board", () => {
  const brief = buildDisclosureChaseBrief({
    caseId: "ahmed-subscriber",
    caseTitle: "Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
3search recordoutstandingrequested
4reasonable excuseoutstandingneeded before final position
5phone subscriber dataoutstandingnot attached`,
  });
  const board = brief.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/subscriber/i.test(board), `phone subscriber data must be on the board — got: ${board}`);
  const subscriber = brief.primaryItems.find((i) => /subscriber/i.test(i.label));
  assert.ok(subscriber && !/^\d{1,2}\s/.test(subscriber.label), `row 5 is not the name of the material — got ${subscriber?.label}`);
});

check("an elapsed listing is not a missed disclosure deadline", () => {
  const papers = `MG6 DISCLOSURE SCHEDULE
full interview transcript outstanding
MEDICAL / FORENSIC NOTE
A short note records an injury. The final report is not included in this bundle.
The note should not be treated as a complete expert report.`;
  const elapsed = buildDisclosureChaseBrief({
    caseId: "ahmed-elapsed-listing",
    caseTitle: "Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
    stage: null,
    hearingStatus: "Listed",
    hearingDateIso: "2026-07-20",
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: papers,
  });
  const transcript = elapsed.primaryItems.find((i) => /interview transcript/i.test(i.label));
  const medical = elapsed.primaryItems.find((i) => /final medical/i.test(i.label));
  assert.ok(transcript, `transcript gap must still surface — got ${elapsed.primaryItems.map((i) => i.label).join(" || ")}`);
  assert.ok(medical, `final report not included must still surface — got ${elapsed.primaryItems.map((i) => i.label).join(" || ")}`);
  assert.equal(
    transcript?.baseStatus,
    "Outstanding",
    `elapsed listing must not mark the transcript Overdue — got ${transcript?.baseStatus}`,
  );
  assert.equal(
    medical?.baseStatus,
    "Outstanding",
    `final report not included is outstanding, not a review chip — got ${medical?.baseStatus}`,
  );
  const referred = buildDisclosureChaseBrief({
    caseId: "referred-elapsed-listing",
    caseTitle: "Referred",
    clientLabel: "Client",
    allegation: "Assault",
    stage: null,
    hearingStatus: "Listed",
    hearingDateIso: "2026-07-20",
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: "BWV referred only on MG6 — export not served.",
  });
  const bwv = referred.primaryItems.find((i) => /bwv/i.test(i.label));
  assert.ok(
    !bwv || bwv.baseStatus === "Not safely confirmed",
    `opposite: referred-only must not become Outstanding from an elapsed listing — got ${bwv?.baseStatus}`,
  );
});

check("a schedule code on a location note is not a gap", () => {
  assert.equal(classifyMaterialStatus("CCTV/3CCTV export logshort note"), null);
  assert.equal(classifyMaterialStatus("AB/2Continuity labelunclear"), null);
  assert.equal(classifyMaterialStatus("EX/02 - continuity note to be checked against witness and MG6 schedule."), null);
  assert.equal(classifyMaterialStatus("CCTV/3 CCTV export log Outstanding"), "outstanding");
  const brief = buildDisclosureChaseBrief({
    caseId: "ahmed-location-notes",
    caseTitle: "Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
3search recordoutstandingrequested
EXHIBIT LIST
ExhibitDescriptionLocation in papers
EX/01Officer notebook extractincluded
CCTV/3CCTV export logshort note
AB/2Continuity labelunclear`,
  });
  const board = brief.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/search record/i.test(board), `search record must still reach the board — got: ${board}`);
  assert.ok(!/CCTV\/3/i.test(board), `CCTV/3 location note must not become a request — got: ${board}`);
  assert.ok(!/\bAB\/2\b/i.test(board), `AB/2 location note must not become a request — got: ${board}`);
});

check("full custody is chased only when the papers state that gap", () => {
  const extractOnly = buildDisclosureChaseBrief({
    caseId: "ahmed-custody-extract",
    caseTitle: "Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
3search recordoutstandingrequested
5complete CAD/999 logoutstandingnot attached
Custody record extract: arrival and risk assessment opened.
Interview summary is on file.`,
  });
  const extractBoard = extractOnly.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/search record/i.test(extractBoard), `search record must remain — got: ${extractBoard}`);
  assert.ok(!/full custody/i.test(extractBoard), `custody extract must not become a full-record request — got: ${extractBoard}`);

  const stated = buildDisclosureChaseBrief({
    caseId: "custody-full-outstanding",
    caseTitle: "Stated custody",
    clientLabel: "Client",
    allegation: "Assault",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: "MG6C: full custody record outstanding — not attached.",
  });
  const statedBoard = stated.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/custody/i.test(statedBoard), `stated full custody outstanding must reach the board — got: ${statedBoard}`);
});

check("not included is a gap, not a referred-only review chip", () => {
  assert.equal(
    classifyMaterialStatus("The final report is not included in this bundle."),
    "outstanding",
  );
  assert.equal(
    classifyMaterialStatus("O01 full interview transcript Outstanding Listed but not attached"),
    "outstanding",
  );
  assert.equal(
    classifyMaterialStatus("MG6C/FUL — full lab report — referred on MG6 — export not served."),
    "referred_only",
  );
  const brief = buildDisclosureChaseBrief({
    caseId: "ahmed-stated-gaps",
    caseTitle: "Ahmed",
    clientLabel: "Holly Ahmed",
    allegation: "Possession of a bladed article",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG5 CASE SUMMARY
Material still neededsearch record; reasonable excuse; full interview transcript
INTERVIEW SUMMARY
The summary is not a full transcript. TranscriptNot in this section.
MEDICAL / FORENSIC NOTE
A short note records an injury.
The final report is not included in this bundle.`,
  });
  const board = brief.primaryItems.map((i) => `${i.label} [${i.baseStatus}]`).join(" || ");
  const transcript = brief.primaryItems.find((i) => /interview transcript/i.test(i.label));
  assert.ok(transcript, `stated transcript gap must reach the board — got: ${board}`);
  assert.equal(transcript!.baseStatus, "Outstanding", `transcript still needed must stay outstanding — got ${board}`);
  const medical = brief.primaryItems.find((i) => /^Final medical\/forensic report$/i.test(i.label));
  assert.ok(medical, `final report not included must reach the board — got: ${board}`);
  assert.equal(medical!.baseStatus, "Outstanding", `final report not included must stay outstanding — got ${board}`);
});

check("custody interview narrative is not an MG6 inventory", () => {
  const rows = normaliseBundleMaterials(`
R v Liam Carter
The male was arrested on suspicion of burglary.
Carter was placed in Interview Room 2 at 22:10 hours. He was offered water and a break.
The interview commenced at 22:24 hours with the duty solicitor present.
The interview concluded at 22:41 hours.
He declined to provide a written statement.
on CCTV approaching the address shortly before the offence.
`);
  assert.equal(
    rows.length,
    0,
    `police-station narrative must not become schedule rows — got ${rows.map((r) => r.label).join(" | ")}`,
  );
  const schedule = normaliseBundleMaterials(`
MG6 DISCLOSURE SCHEDULE
MG6/04 bank source statements Outstanding Not in papers supplied
Full phone download outstanding
`);
  assert.ok(
    schedule.some((r) => /bank source statements/i.test(r.label) && r.status === "outstanding"),
    `a real MG6 outstanding cell must still be inventory — got ${schedule.map((r) => r.label).join(" | ")}`,
  );
  assert.ok(
    schedule.some((r) => /phone download/i.test(r.label) && r.status === "outstanding"),
    `a short outstanding item line must still be inventory — got ${schedule.map((r) => r.label).join(" | ")}`,
  );
});

console.log("the opposite direction: the passing uniform still holds");

check("Charge: and R v still work", () => {
  const reed = extractBundleCaseMetadata("Taylor Reed\nCharge: Harassment\nScreenshots of WhatsApp messages served.");
  assert.match(reed.offenceDisplay ?? reed.offenceWording ?? "", /harassment/i);
  const carter = extractBundleCaseMetadata("CASE: R v Liam Carter\nDATE OF ARREST: 03/02/2025\nThe male was arrested on suspicion of burglary.");
  assert.equal(carter.defendantName, "Liam Carter");
});

check("O01 still parses, and On a date is not a reference", () => {
  assert.equal(parseScheduleRef("O01 full interview transcript Outstanding"), "O01");
  assert.equal(
    parseScheduleRef("On 29/05/2026 at Albion Road, Ellis Dunn is alleged to have committed the above"),
    null,
  );
});

check("interview recording outstanding is still a recording gap", () => {
  assert.equal(
    isInterviewRecordingEstablished("Interview summary on file. Interview recording outstanding."),
    true,
  );
  assert.equal(familySupport("interview", "Interview recording outstanding."), "mentioned");
  const pipeline = buildCanonicalPipelineFromDocumentUnits([
    {
      id: "recording-outstanding",
      title: "MG11.pdf",
      uploadOrder: 0,
      pages: [
        {
          pageNumber: 1,
          text: "Interview recording outstanding. Interview transcript incomplete.",
        },
      ],
    },
  ]);
  const rt = pipeline.findings.find((f) => f.kind === "recording_vs_transcript");
  assert.ok(rt, "stated recording outstanding must still produce a recording finding");
  assert.doesNotMatch(rt!.summary, /Recording state served/i);
});

check("served screenshots are served, not a draft gap", () => {
  assert.equal(classifyMaterialStatus("Screenshots of WhatsApp messages served."), "served");
  assert.equal(classifyMaterialStatus("only screenshots"), "draft");
  const rows = normaliseBundleMaterials(
    "Taylor Reed\nCharge: Harassment\nScreenshots of WhatsApp messages served.\nFull phone download / subscriber mapping outstanding.\nNo BWV. No CCTV.",
  );
  const shots = rows.find((r) => /screenshot/i.test(r.label));
  assert.equal(shots?.status, "served", `screenshots served must stay served — got ${rows.map((r) => `${r.status}:${r.label}`).join(" | ")}`);
  assert.ok(
    rows.some((r) => /phone download|subscriber/i.test(r.label) && r.status === "outstanding"),
    "the download gap must still be outstanding",
  );
  assert.ok(
    !rows.some((r) => /no bwv|no cctv/i.test(r.label)),
    "No BWV. No CCTV. must not become a row",
  );
  const reedBrief = buildDisclosureChaseBrief({
    caseId: "reed-mapping-cell",
    caseTitle: "Taylor Reed",
    clientLabel: "Taylor Reed",
    allegation: "Harassment",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText:
      "Taylor Reed\nCharge: Harassment\nScreenshots of WhatsApp messages served.\nFull phone download / subscriber mapping outstanding.\nNo BWV. No CCTV.",
  });
  const reedBoard = reedBrief.primaryItems.map((i) => i.label);
  const reedPhone = reedBrief.primaryItems.filter((i) =>
    /phone download|subscriber/i.test(i.label),
  );
  assert.equal(
    reedPhone.length,
    1,
    `one download / mapping cell is one card — got: ${reedBoard.join(" || ")}`,
  );
  assert.match(reedPhone[0]!.label, /subscriber mapping/i);
  assert.ok(
    !reedBrief.primaryItems.some((i) => /^Subscriber \/ account data$/i.test(i.label)),
    `mapping must not become a second subscriber-data card — got: ${reedBoard.join(" || ")}`,
  );
  const brookesBrief = buildDisclosureChaseBrief({
    caseId: "brookes-download-and-report",
    caseTitle: "Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: "Harassment",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText:
      "Full phone download outstanding. Source export not served. Subscriber report not served.",
  });
  const brookesBoard = brookesBrief.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(
    brookesBrief.primaryItems.some((i) => /Full phone download/i.test(i.label)),
    `opposite: named download still surfaces — got: ${brookesBoard}`,
  );
  assert.ok(
    brookesBrief.primaryItems.some((i) => /subscriber/i.test(i.label)),
    `opposite: a separate subscriber report still surfaces — got: ${brookesBoard}`,
  );
});

check("a schedule talking about itself is not a chase card", () => {
  assert.equal(
    classifyMaterialStatus(
      "The schedule has been reviewed. Further material remains outstanding and will be sent when received from police.",
    ),
    null,
  );
  assert.equal(classifyMaterialStatus("outstanding are not served."), null);
  const davies = buildDisclosureChaseBrief({
    caseId: "davies-furniture",
    caseTitle: "Davies",
    clientLabel: "Layla Davies",
    allegation: "Concealing criminal property",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
MG6/04 bank source statements outstanding
The schedule has been reviewed. Further material remains outstanding and will be sent when received from police.`,
  });
  const daviesBoard = davies.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/MG6\/04|bank source statements/i.test(daviesBoard), `named MG6/04 must remain — got: ${daviesBoard}`);
  assert.ok(
    !/schedule has been reviewed/i.test(daviesBoard),
    `schedule-review boilerplate must not become a request — got: ${daviesBoard}`,
  );

  const greene = buildDisclosureChaseBrief({
    caseId: "greene-note",
    caseTitle: "Greene",
    clientLabel: "Leo Greene",
    allegation: "Assault by beating",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6(A) SERVED AND OUTSTANDING
Outstanding/not provided: interview record, continuity / provenance note if relied upon. Note: items described as
outstanding are not served.`,
  });
  const greeneBoard = greene.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(/interview record/i.test(greeneBoard), `the named interview record must remain — got: ${greeneBoard}`);
  assert.ok(!/are not served/i.test(greeneBoard), `the how-to-read-the-schedule note is not a card — got: ${greeneBoard}`);
  assert.ok(!/\/not provided/i.test(greeneBoard), `outstanding\/not provided is the cell, not the name — got: ${greeneBoard}`);

  const priya = buildDisclosureChaseBrief({
    caseId: "priya-item-prefix",
    caseTitle: "Priya",
    clientLabel: "Priya Vale",
    allegation: "ABH",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
Outstanding item: Full 999 audio - not served or served as summary only; chase before final position.`,
  });
  const priyaBoard = priya.primaryItems.map((i) => i.label).join(" || ");
  const priya999 = priya.primaryItems.find((i) => /999/i.test(i.label));
  assert.ok(priya999, `Full 999 audio must remain — got: ${priyaBoard}`);
  assert.doesNotMatch(priya999!.label, /^item:/i);

  const glance = buildDisclosureChaseBrief({
    caseId: "priya-glance-list",
    caseTitle: "Priya",
    clientLabel: "Priya Vale",
    allegation: "ABH",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 DISCLOSURE SCHEDULE
Outstanding item: final medical report; prior injury records; CCTV continuity; complainant first account; interview transcript.
Outstanding item: Full 999 audio - not served or served as summary only; chase before final position.
Outstanding material: full source material, final reports, underlying recordings and continuity documents listed in the chase note.`,
  });
  const glanceBoard = glance.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(
    glance.primaryItems.some((i) => /final medical report/i.test(i.label)),
    `named medical report must stand alone — got: ${glanceBoard}`,
  );
  assert.ok(
    glance.primaryItems.some((i) => /prior injury records/i.test(i.label)),
    `named prior injury records must stand alone — got: ${glanceBoard}`,
  );
  assert.ok(
    !glance.primaryItems.some(
      (i) => /final medical report/i.test(i.label) && /prior injury records/i.test(i.label),
    ),
    `a glance list is several requests, not one soup — got: ${glanceBoard}`,
  );
  const glance999 = glance.primaryItems.find((i) => /999/i.test(i.label));
  assert.ok(glance999, `Full 999 audio must remain one cell — got: ${glanceBoard}`);
  assert.doesNotMatch(glance999!.label, /chase before/i);
  assert.ok(
    !/chase before final position/i.test(glanceBoard),
    `chase-before instruction is not a card — got: ${glanceBoard}`,
  );
  assert.ok(
    !/full source material/i.test(glanceBoard),
    `cover lump pointing at the chase note is not a request — got: ${glanceBoard}`,
  );
  assert.equal(
    splitOutstandingInventoryLine(
      "Outstanding item: Full 999 audio - not served or served as summary only; chase before final position.",
    ).length,
    1,
  );

  const beckPack = buildDisclosureChaseBrief({
    caseId: "beck-slash-pack",
    caseTitle: "Beck",
    clientLabel: "Emery Beck",
    allegation: "ABH",
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText: `MG6 / DISCLOSURE POSITION
Outstanding material: full chat export / device extraction / sender attribution / metadata / uncropped screenshot;`,
  });
  const beckBoard = beckPack.primaryItems.map((i) => i.label).join(" || ");
  const chat = beckPack.primaryItems.filter((i) => /chat export|device extraction/i.test(i.label));
  assert.ok(chat.length >= 1, `slash pack must remain a request — got: ${beckBoard}`);
  assert.ok(
    chat.length === 1 || chat.every((i) => /chat export/i.test(i.label) && /device extraction/i.test(i.label)),
    `slash pack stays one cell, not split on / — got: ${beckBoard}`,
  );
  assert.ok(
    chat.every((i) => !/^(?:item|material)\s*:/i.test(i.label)),
    `outstanding-material prefix is the cell, not the name — got: ${beckBoard}`,
  );
});

check("No BWV. No CCTV. is not an inventory row, and a date line is not deglued into a schedule cell", () => {
  assert.equal(classifyMaterialStatus("No BWV. No CCTV."), null);
  assert.equal(
    deglueScheduleText("At 19:42 hours on 03/02/2025, officers were dispatched"),
    "At 19:42 hours on 03/02/2025, officers were dispatched",
  );
});

check("arrested on suspicion of involvement is not a charge", () => {
  const meta = extractBundleCaseMetadata(
    "CASE: R v Alex Neutral\nHe was arrested on suspicion of his involvement in the incident.",
  );
  assert.doesNotMatch(meta.offenceDisplay ?? meta.offenceWording ?? "", /involvement/i);
});

console.log(`uniform-gate-truth: ${checks} checks PASS`);
