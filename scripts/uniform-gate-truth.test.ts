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
  lineIsScheduleFurniture,
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

  const brookesHearing = extractBundleCaseMetadata(
    `NB-26-0721 - R v Taylor Brookes
Court
Northbank Crown Court
Next hearing
PTPH - 06 July 2026 at 10:00
Current status
Bail with no-contact condition.
Prepare hearing line on outstanding disclosure; set a timetable.
The defence asks the court to record outstanding disclosure.`,
  );
  assert.match(
    brookesHearing.nextHearingRaw ?? "",
    /06 July 2026/i,
    `PTPH dash listing is the hearing — got ${brookesHearing.nextHearingRaw}`,
  );
  assert.doesNotMatch(brookesHearing.nextHearingRaw ?? "", /line:\s*the/i);

  const clarkeHearing = extractBundleCaseMetadata(
    `Defendant: Jordan Clarke
Next Hearing: PTPH – 04 Sep 2024
Alleged Offence: s18 OAPA 1861
Incident: 12 Aug 2024, ~23:48, outside Blue Lantern.`,
  );
  assert.match(clarkeHearing.nextHearingRaw ?? "", /04 Sep(?:tember)? 2024/i);
  assert.doesNotMatch(
    clarkeHearing.nextHearingRaw ?? "",
    /23:48/,
    `incident clock is not the listing time — got ${clarkeHearing.nextHearingRaw}`,
  );
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

  const clarke = normaliseBundleMaterials(`
# S18 Test Bundle
19. 17 MG6C Unused Material (incomplete)
## 04 Witness Statement – Complainant
- In taxi queue ~23:48; dark, partial lighting.
- Attacker in dark hooded top; face unclear.
## 11 CCTV Stills Description
Stills at key times show hooded male; faces unclear due to lighting.
## 17 MG6C Unused Material
MG6C/001 CCTV continuity log outstanding
`);
  assert.ok(
    !clarke.some((r) => /taxi queue|hooded (?:male|top)|faces? unclear/i.test(r.label)),
    `MG5/witness prose is not inventory — got ${clarke.map((r) => r.label).join(" | ")}`,
  );
  assert.ok(
    clarke.some((r) => /cctv continuity/i.test(r.label)),
    `a real MG6C cell must still be inventory — got ${clarke.map((r) => r.label).join(" | ")}`,
  );

  const hale = normaliseBundleMaterials(`
4. MG6 DISCLOSURE SCHEDULE - OUTSTANDING MATERIAL
Full CCTV master footage from estate cameras outstanding
EX-MUR-009 CCTV stills and timing note Master footage outstanding
10. CCTV SECTION - SERVED STILLS ONLY
The served CCTV material consists of still images only.
Leon was seen arguing with Marcus shortly before the fatal injury.
The court can be asked to record outstanding CCTV, CAD/999, BWV.
This may assist the defence because missing source pages create disclosure.
`);
  assert.ok(
    hale.some((r) => /EX-MUR-009|full CCTV master/i.test(r.label)),
    `Hale schedule cells stay — got ${hale.map((r) => r.label).join(" | ")}`,
  );
  assert.ok(
    !hale.some((r) => /seen arguing|court can be asked|this may assist/i.test(r.label)),
    `Hale MG5/strategy is not inventory — got ${hale.map((r) => r.label).join(" | ")}`,
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

check("caution, bare not-served, and MG5 fragments are not chase cells; MG6/04 still is", () => {
  assert.equal(lineIsScheduleFurniture("Caution: no answer should invent"), true);
  assert.equal(lineIsScheduleFurniture("Not served"), true);
  assert.equal(lineIsScheduleFurniture("Not commissioned /"), true);
  assert.equal(lineIsScheduleFurniture("pending), continuity gaps (CCTV/weapon)."), true);
  assert.equal(lineIsScheduleFurniture("MG6/04 bank source statements outstanding"), false);
  assert.equal(lineIsScheduleFurniture("Full CCTV master outstanding or not verified, where applicable."), true);
  const beck = normaliseBundleMaterials(
    "MG6 DISCLOSURE SCHEDULE\nCaution: no answer should invent\nNot served\nFull CCTV master outstanding\n",
  );
  assert.ok(
    !beck.some((r) => /caution|no answer should invent|^not served$/i.test(r.label)),
    `got ${beck.map((r) => r.label).join(" | ")}`,
  );
  assert.ok(
    beck.some((r) => /cctv master/i.test(r.label)),
    `named CCTV master stays a row — got ${beck.map((r) => r.label).join(" | ")}`,
  );
  const brookes = buildDisclosureChaseBrief({
    caseId: "brookes-furniture",
    caseTitle: "Brookes",
    clientLabel: "Taylor Brookes",
    allegation: null,
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: null,
    bundleText:
      "MG6 DISCLOSURE SCHEDULE\nOriginal WhatsApp export outstanding not served\nNot commissioned /\nNot served\nSubscriber data or phone attribution report outstanding",
  });
  const board = brookes.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(!brookes.primaryItems.some((i) => /^not served$/i.test(i.label)), board);
  assert.ok(!brookes.primaryItems.some((i) => /not commissioned/i.test(i.label)), board);
  assert.ok(brookes.primaryItems.some((i) => /whatsapp export/i.test(i.label)), board);
});

check("named CCTV master is one cell; stills-only does not invent the template", () => {
  const briefInput = (id: string, bundleText: string) => ({
    caseId: id,
    caseTitle: id,
    clientLabel: id,
    allegation: null as string | null,
    stage: null as string | null,
    hearingStatus: null as string | null,
    hearingDateIso: null as string | null,
    bundleHealth: "partial" as const,
    positionStatus: null as string | null,
    battleboard: null,
    bundleText,
  });
  const masterish = (label: string) =>
    /full window\s*\/\s*master footage|full CCTV master|cctv master|master footage/i.test(label);

  const patel = buildDisclosureChaseBrief(
    briefInput(
      "patel-cctv-double",
      "R v Isaac Patel\nCharge: Affray\nMG6 DISCLOSURE SCHEDULE\nMG6/05 full CCTV master outstanding requested / not attached\n",
    ),
  );
  const patelBoard = patel.primaryItems.map((i) => i.label).join(" || ");
  const patelMaster = patel.primaryItems.filter((i) => masterish(i.label));
  assert.equal(patelMaster.length, 1, `Patel master must be one cell — got: ${patelBoard}`);
  assert.ok(
    /MG6\/05|full CCTV master/i.test(patelMaster[0]!.label),
    `the schedule cell is the request — got ${patelMaster[0]!.label}`,
  );
  assert.ok(
    !(
      patel.primaryItems.some((i) => /^CCTV full window\s*\/\s*master footage$/i.test(i.label)) &&
      patel.primaryItems.some((i) => /MG6\/05/i.test(i.label))
    ),
    `generic template must not sit beside MG6/05 — got: ${patelBoard}`,
  );

  const hale = buildDisclosureChaseBrief(
    briefInput(
      "hale-cctv-double",
      `CB-MURDER-TEST-0001 - Leon Hale
Charge: Murder
10 CCTV stills and timing note Master footage outstanding EX-MUR-009
Full CCTV master footage from estate cameras outstanding`,
    ),
  );
  const haleBoard = hale.primaryItems.map((i) => i.label).join(" || ");
  const haleMaster = hale.primaryItems.filter((i) => masterish(i.label));
  assert.equal(haleMaster.length, 1, `Hale EX-MUR-009 and narrative master must be one cell — got: ${haleBoard}`);
  assert.ok(
    /EX-MUR-009|master footage/i.test(haleMaster[0]!.label),
    `keep the cited cell — got ${haleMaster[0]!.label}`,
  );

  const stills = buildDisclosureChaseBrief(
    briefInput(
      "dunn-stills-only",
      "MG6 DISCLOSURE SCHEDULE\nS05 CCTV stills Served Included in present papers\nNo full CCTV master. No master footage.\n",
    ),
  );
  const stillsBoard = stills.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(
    !stills.primaryItems.some((i) => i.familyId === "cctv_master" || masterish(i.label)),
    `stills-only must not invent master — got: ${stillsBoard}`,
  );

  const beck = buildDisclosureChaseBrief(
    briefInput(
      "beck-stills-applicable",
      `MG6 / DISCLOSURE POSITION
Served material: EX-U-WA-13 as a still/photo/extract.
Full image/CCTV/source file: not served - only still/photo/extract served.
Full CCTV master outstanding or not verified, where applicable.`,
    ),
  );
  const beckBoard = beck.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(
    !beck.primaryItems.some(
      (i) => i.familyId === "cctv_master" || /^CCTV full window\s*\/\s*master footage$/i.test(i.label),
    ),
    `where-applicable pack line is not a master cell — got: ${beckBoard}`,
  );

  const mg5 = buildDisclosureChaseBrief(
    briefInput(
      "patel-mg5-master",
      "Isaac Patel\nCharge: Affray\nMG5: CCTV stills are referred to. The full CCTV master footage/export log is outstanding.\n",
    ),
  );
  assert.ok(
    mg5.primaryItems.some((i) => masterish(i.label)),
    `MG5 naming master without a schedule code still surfaces — got: ${mg5.primaryItems.map((i) => i.label).join(" || ")}`,
  );
});

check("glance/CAD lumps and MG5 sentences are not schedule cells; named cells stay", () => {
  const briefInput = (id: string, bundleText: string, extra?: { clientLabel?: string }) => ({
    caseId: id,
    caseTitle: id,
    clientLabel: extra?.clientLabel ?? id,
    allegation: null as string | null,
    stage: null as string | null,
    hearingStatus: null as string | null,
    hearingDateIso: null as string | null,
    bundleHealth: "partial" as const,
    positionStatus: null as string | null,
    battleboard: null,
    bundleText,
  });

  assert.equal(lineIsScheduleFurniture("Required to test source"), true);
  assert.equal(lineIsScheduleFurniture("CAD log is outstanding."), true);
  assert.equal(lineIsScheduleFurniture("MG5 timing. Original 999 audio is not served, so the exact words cannot yet be checked."), true);
  assert.equal(lineIsScheduleFurniture("Phone data (pending), additional CCTV (pending), clothing forensics"), true);
  assert.equal(
    lineIsScheduleFurniture("involving Holly Ahmed. The final report is not included in this bundle. The note should not be"),
    true,
  );
  assert.equal(lineIsScheduleFurniture("EX-MUR-012 CAD and 999 summaries Original audio/log outstanding"), false);
  assert.equal(lineIsScheduleFurniture("O02 CAD log full print Outstanding Not yet served"), false);
  assert.equal(lineIsScheduleFurniture("complete CAD/999 log outstanding not attached"), false);

  const hale = buildDisclosureChaseBrief(
    briefInput(
      "hale-glance-cad",
      `CB-MURDER-TEST-0001 - Leon Hale
Charge: Murder
EX-MUR-009 CCTV stills and timing note Master footage outstanding
EX-MUR-012 CAD and 999 summaries Original audio/log outstanding
EX-MUR-007 Police officer statement BWV not served
EX-MUR-021 Interview summary Full recording/transcript outstanding
There are some no comment answers after limited disclosure. Full interview recording and transcript are outstanding. The
MG5 timing. Original 999 audio is not served, so the exact words, timing, background voices, and caller uncertainty cannot yet be checked.
Full 999 audio Not yet served. Required to test source
Full CAD incident log Not yet served. Required to test source
CAD Summary Served summary only Full incident log outstanding; timing differs slightly from MG5
CAD log is outstanding.`,
    ),
  );
  const haleBoard = hale.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(hale.primaryItems.some((i) => /EX-MUR-009|master footage/i.test(i.label)), haleBoard);
  assert.ok(hale.primaryItems.some((i) => /EX-MUR-012|CAD and 999 summaries/i.test(i.label)), haleBoard);
  assert.ok(hale.primaryItems.some((i) => /EX-MUR-007|BWV/i.test(i.label)), haleBoard);
  assert.ok(!hale.primaryItems.some((i) => /MG5 timing/i.test(i.label)), haleBoard);
  assert.ok(!hale.primaryItems.some((i) => /Required to test source/i.test(i.label)), haleBoard);
  assert.ok(!hale.primaryItems.some((i) => /^CAD log is outstanding/i.test(i.label)), haleBoard);
  const haleInterview = hale.primaryItems.filter(
    (i) => i.familyId === "interview" || /interview recording|interview transcript/i.test(i.label),
  );
  assert.equal(
    haleInterview.length,
    1,
    `Hale EX-MUR-021 is one interview cell — got: ${haleBoard}`,
  );
  assert.equal(haleInterview[0]!.sourceScheduleRef, "EX-MUR-021");
  assert.ok(
    !hale.primaryItems.some((i) => /no comment answers after limited disclosure/i.test(i.label)),
    haleBoard,
  );

  assert.equal(
    lineIsScheduleFurniture(
      "There are some no comment answers after limited disclosure. Full interview recording and transcript are outstanding. The",
    ),
    true,
  );
  assert.equal(lineIsScheduleFurniture("Full interview recording / transcript outstanding"), false);

  const vale = buildDisclosureChaseBrief(
    briefInput(
      "vale-chase-before",
      `MG6 DISCLOSURE SCHEDULE
Outstanding item: final medical report; prior injury records; CCTV continuity.
Outstanding item: Full 999 audio - not served or served as summary only; chase before final position.`,
      { clientLabel: "Priya Vale" },
    ),
  );
  const valeBoard = vale.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(vale.primaryItems.some((i) => /final medical report/i.test(i.label)), valeBoard);
  const vale999 = vale.primaryItems.filter((i) => /999/i.test(i.label));
  assert.equal(vale999.length, 1, `one 999 cell if File states it — got: ${valeBoard}`);
  assert.doesNotMatch(vale999[0]!.label, /chase before/i);
  assert.ok(!vale.primaryItems.some((i) => /^chase before/i.test(i.label)), valeBoard);

  const dunn = buildDisclosureChaseBrief(
    briefInput(
      "dunn-o02-o05",
      `MG6 DISCLOSURE SCHEDULE
O02 CAD log full print Outstanding Not yet served
O05 999 audio Outstanding Listed but not attached
O03 independent witness statement Outstanding
S04 CAD incident log extract Served`,
    ),
  );
  const dunnBoard = dunn.primaryItems.map((i) => `${i.sourceScheduleRef ?? "—"}:${i.label}`).join(" || ");
  const dunnO02 = dunn.primaryItems.find((i) => i.sourceScheduleRef === "O02");
  const dunnO05 = dunn.primaryItems.find((i) => i.sourceScheduleRef === "O05");
  assert.ok(dunnO02, `O02 CAD log full print must stand — got: ${dunnBoard}`);
  assert.ok(dunnO05, `O05 999 audio must stand — got: ${dunnBoard}`);
  assert.match(dunnO02!.label, /CAD log full print/i);
  assert.doesNotMatch(dunnO02!.label, /999 audio/i);
  assert.match(dunnO05!.label, /999 audio/i);
  assert.doesNotMatch(dunnO05!.label, /CAD log full print/i);
  assert.ok(
    !dunn.primaryItems.some((i) => /^CAD \/ dispatch \/ 999 material$/i.test(i.label)),
    `generic CAD template must not sit beside O02/O05 — got: ${dunnBoard}`,
  );

  const ahmed = buildDisclosureChaseBrief(
    briefInput(
      "ahmed-sentence",
      `MG6 DISCLOSURE SCHEDULE
3 search record outstanding requested
5 complete CAD/999 log outstanding not attached
5 phone subscriber data outstanding not attached
involving Holly Ahmed. The final report is not included in this bundle. The note should not be treated as a report.`,
      { clientLabel: "Holly Ahmed" },
    ),
  );
  const ahmedBoard = ahmed.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(ahmed.primaryItems.some((i) => /search record/i.test(i.label)), ahmedBoard);
  assert.ok(ahmed.primaryItems.some((i) => /cad\s*\/\s*999/i.test(i.label)), ahmedBoard);
  assert.ok(!ahmed.primaryItems.some((i) => /involving Holly Ahmed/i.test(i.label)), ahmedBoard);
  assert.ok(!ahmed.primaryItems.some((i) => /the note should not be/i.test(i.label)), ahmedBoard);

  const clarke = buildDisclosureChaseBrief(
    briefInput(
      "clarke-pending",
      `## 17 MG6C Unused Material Schedule (Incomplete)
- Phone data (pending), additional CCTV (pending), clothing forensics
(pending), PNB entries (partial), medical records (not obtained).
- (CCTV/weapon); phone data
MG6C/001 CCTV continuity log outstanding
Prosecution relies on witness ID, partial CCTV, partial DNA, medical.`,
    ),
  );
  const clarkeBoard = clarke.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(clarke.primaryItems.some((i) => /MG6C\/001|CCTV continuity log/i.test(i.label)), clarkeBoard);
  assert.ok(!clarke.primaryItems.some((i) => /Phone data \(pending\)/i.test(i.label)), clarkeBoard);
  assert.ok(!clarke.primaryItems.some((i) => /\(CCTV\/weapon\)/i.test(i.label)), clarkeBoard);
  assert.ok(
    !clarke.primaryItems.some((i) => /^Medical \/ expert source report$/i.test(i.label)),
    `medical template is not a schedule cell — got: ${clarkeBoard}`,
  );

  const patelInterview = buildDisclosureChaseBrief(
    briefInput(
      "patel-interview-cells",
      `Isaac Patel
Charge: Affray
MG6/07 full interview transcript outstanding requested / not attached
Full interview recording / transcript — not served — in this bundle.`,
      { clientLabel: "Isaac Patel" },
    ),
  );
  const patelInterviewBoard = patelInterview.primaryItems
    .map((i) => `${i.sourceScheduleRef ?? "—"}:${i.label}`)
    .join(" || ");
  assert.ok(
    patelInterview.primaryItems.some((i) => i.sourceScheduleRef === "MG6/07" || /MG6\/07/.test(i.label)),
    `Patel MG6/07 transcript cell stays — got: ${patelInterviewBoard}`,
  );
  assert.equal(lineIsScheduleFurniture("Full interview recording / transcript outstanding"), false);

  const valeContinuity = buildDisclosureChaseBrief(
    briefInput(
      "vale-two-continuity-cells",
      `MG6 DISCLOSURE SCHEDULE
Outstanding item: CCTV continuity
Outstanding item: CCTV continuity/export log
Outstanding item: final medical report`,
      { clientLabel: "Priya Vale" },
    ),
  );
  const valeContBoard = valeContinuity.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(
    valeContinuity.primaryItems.some((i) => /^CCTV Continuity$/i.test(i.label) || /^CCTV continuity$/i.test(i.label)),
    `Vale named CCTV continuity stays — got: ${valeContBoard}`,
  );
  assert.ok(
    valeContinuity.primaryItems.some((i) => /continuity\/export log/i.test(i.label)),
    `Vale named continuity/export log stays as its own cell — got: ${valeContBoard}`,
  );

  const daviesCourt = extractBundleCaseMetadata(
    "Defendant: Layla Davies\nCourtCrown Court at Sheffield Current listing 19 June 2026 at 10:00\nCharge: Concealing criminal property",
  );
  assert.equal(daviesCourt.court, "Crown Court at Sheffield");
  assert.doesNotMatch(daviesCourt.court ?? "", /Current/i);

  const greeneCourt = extractBundleCaseMetadata(
    `AccusedLeo Greene DOB 07/07/1990Stagetrial listed in 7 days
Police stationNorthgate Police StationCourtNorthshire Magistrates Court
StatusremandNext hearing18/08/2026`,
  );
  assert.equal(greeneCourt.court, "Northshire Magistrates Court");
  assert.doesNotMatch(greeneCourt.court ?? "", /days|Police station|^Court\s/i);

  assert.equal(lineIsScheduleFurniture("reserved"), true);
  assert.equal(
    lineIsScheduleFurniture("reserved — pending disclosure of the missing items listed in MG6 or the file note."),
    true,
  );
  assert.equal(
    lineIsScheduleFurniture(
      "sender referred to her witness statement in earlier proceedings and told her to 'stop talking'.",
    ),
    true,
  );
  assert.equal(
    lineIsScheduleFurniture(
      "schedule is outstanding. There is no final statement tying every movement and exhibit handover into a complete chain.",
    ),
    true,
  );
  assert.equal(
    lineIsScheduleFurniture(
      "Sent 08 June 2026: Matter adjourned to 17 June 2026 at 14:00 for PTPH at Northshire Crown Court.",
    ),
    true,
  );
  assert.equal(
    lineIsScheduleFurniture(
      "records possible pre-cordon movement by members of the public. Full continuity schedule is outstanding.",
    ),
    true,
  );
  assert.equal(lineIsScheduleFurniture("O02 CAD log full print Outstanding Not yet served"), false);
  assert.equal(lineIsScheduleFurniture("MG6C/001 CCTV continuity log outstanding"), false);

  const greene = buildDisclosureChaseBrief(
    briefInput(
      "greene-reserved",
      `AccusedLeo Greene
Charge: Assault by beating
Outstanding/not provided: interview record, continuity / provenance note if relied upon.
reserved — pending disclosure of the missing items listed in MG6 or the file note.`,
      { clientLabel: "Leo Greene" },
    ),
  );
  const greeneBoard = greene.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(!greene.primaryItems.some((i) => /^reserved\b/i.test(i.label)), greeneBoard);

  const brookes = buildDisclosureChaseBrief(
    briefInput(
      "brookes-sentence",
      `Taylor Brookes
Original WhatsApp export — not served.
sender referred to her witness statement in earlier proceedings and told her to 'stop talking'. She`,
      { clientLabel: "Taylor Brookes" },
    ),
  );
  const brookesBoard = brookes.primaryItems.map((i) => i.label).join(" || ");
  assert.ok(brookes.primaryItems.some((i) => /WhatsApp export|phone download/i.test(i.label)), brookesBoard);
  assert.ok(!brookes.primaryItems.some((i) => /sender referred to/i.test(i.label)), brookesBoard);
});

check("arrested on suspicion of involvement is not a charge", () => {
  const meta = extractBundleCaseMetadata(
    "CASE: R v Alex Neutral\nHe was arrested on suspicion of his involvement in the incident.",
  );
  assert.doesNotMatch(meta.offenceDisplay ?? meta.offenceWording ?? "", /involvement/i);
  const blankCharge = extractBundleCaseMetadata(
    "R v Taylor Brookes\nNext hearing\nPTPH - 06 July 2026 at 10:00\nOriginal WhatsApp export outstanding.",
  );
  assert.equal(
    blankCharge.offenceDisplay ?? blankCharge.offenceWording ?? null,
    null,
    `no Charge: on the File stays blank — got ${blankCharge.offenceDisplay ?? blankCharge.offenceWording}`,
  );
});

console.log(`uniform-gate-truth: ${checks} checks PASS`);
