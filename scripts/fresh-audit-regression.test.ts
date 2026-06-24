import { describe, expect, it } from "vitest";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { resolveWorkflowProfileFromSignals } from "../lib/criminal/pilot-workflow";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const taylorBundle = [
  "=== SECTION: CHARGE ===",
  "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
  "=== SECTION: MG5 ===",
  "Complainant says repeated messages caused alarm and distress; attribution disputed.",
  "=== SECTION: MG6 ===",
  "MG6C/001 — Phone extraction — summary only, source download outstanding.",
  "MG6C/002 — Complainant MG11 — served.",
].join("\n");

const jordanBundle = [
  "=== SECTION: CHARGE ===",
  "Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018",
  "=== SECTION: MG5 ===",
  "Officer account and custody reference are summarised.",
  "=== SECTION: MG6 ===",
  "BWV reference | 7 |",
  "MG6C/010 — BWV — referred to but not attached.",
  "I activated BWV at the scene. The defendant grabbed my vest before I took hold of his arm. Full clip not on this",
  "referred to on the schedule but not attached. Custody record is extract only.",
  "MG6C/011 — Custody record — extract only.",
  "Custody record extract — detention authorised. Safeguards checklist referenced; full record outstanding.",
].join("\n");

function warRoomForMatter(briefPlan: ReturnType<typeof buildCriminalBriefPlan>): HearingWarRoomBrief {
  return {
    caseId: "fresh",
    caseTitle: "CB-FRESH-001 Taylor Brookes",
    clientLabel: "Taylor Brookes",
    allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "Thin bundle",
    positionStatus: "Not recorded",
    readiness: "Conditional",
    safePositionToday: briefPlan.todayAngle,
    sayThis: briefPlan.requiredOutputItems.today,
    doNotOverstate: briefPlan.forbiddenTopics,
    askCourtToRecord: ["Ask the court to record that message/source material remains outstanding."],
    instructionsNeeded: ["Take instructions on message attribution and relationship context."],
    nextHearingMoves: ["Chase full message export and phone source material."],
    evidenceAnchors: ["MG6C/001 — Phone extraction — summary only"],
    collapseRisks: [],
    draftWording: {
      disclosureTimetable: "The defence asks for a timetable for message/source material.",
      adjournment: "Position remains provisional pending served material.",
      clientExplanation: "The message evidence and attribution still need checking.",
    },
  };
}

describe("CB-FRESH audit regressions", () => {
  it("does not route harassment/digital Taylor matter into PWITS workflow pack", () => {
    const profile = resolveWorkflowProfileFromSignals({
      caseTitle: "CB-FRESH-001 Taylor Brookes",
      allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
      routeTitle: "Possession / knowledge / phone-attribution pressure",
      bundleText: taylorBundle,
    });
    expect(profile).toBe("generic");

    const briefPlan = buildCriminalBriefPlan({
      allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
      bundleText: taylorBundle,
    });
    const chase = buildDisclosureChaseBrief({
      caseId: "fresh-taylor",
      caseTitle: "CB-FRESH-001 Taylor Brookes",
      clientLabel: "Taylor Brookes",
      allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: null,
      bundleHealth: "Thin bundle",
      positionStatus: "Not recorded",
      battleboard: null,
      snapshotMissing: [{ label: "Phone extraction source download", status: "outstanding" }],
      bundleText: taylorBundle,
      briefPlan,
    });
    const matter = buildMatterBrief({
      warRoom: warRoomForMatter(briefPlan),
      chase,
      briefPlan,
      primaryRouteTitle: "Possession / knowledge / phone-attribution pressure",
    });
    const text = JSON.stringify({ chase, matter });
    expect(text).toMatch(/message|phone extraction|attribution/i);
    expect(text).not.toMatch(/drug continuity|drug\/cash|intent to supply|search BWV/i);
    expect(matter.plainText).not.toMatch(/Primary route on file: Possession/i);
  });

  it("collapses Jordan referred-only BWV/custody fragments into canonical chase items", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "fresh-jordan",
      caseTitle: "CB-FRESH-002 Jordan Hale",
      clientLabel: "Jordan Hale",
      allegation: "Assault an emergency worker",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: null,
      bundleHealth: "Thin bundle",
      positionStatus: "Not recorded",
      battleboard: null,
      snapshotMissing: [{ label: "Body Worn Video (BWV)", status: "outstanding" }],
      proceduralOutstanding: [
        "The defence asks the court to record that full custody and interview records remain outstanding.",
        "The defence asks the court to record that full custody and interview records remain outstanding.",
      ],
      bundleText: jordanBundle,
    });
    const labels = chase.items.map((item) => item.label).join("\n");
    const draftText = chase.items.map((item) => item.draftChaseWording).join("\n");
    const courtLines = chase.items.map((item) => item.courtLine);
    expect(labels).toMatch(/Body-worn video \(BWV\)/i);
    expect(labels).toMatch(/Full custody record \/ PACE material/i);
    expect(labels.match(/Full custody record \/ PACE material/gi)?.length).toBe(1);
    expect(labels).not.toMatch(/BWV reference \| 7 \|/i);
    expect(labels).not.toMatch(/I activated BWV/i);
    expect(draftText).not.toMatch(/Please provide\s+the defence asks the court/i);
    expect(new Set(courtLines).size).toBe(courtLines.length);
  });
});
