import { describe, expect, it } from "vitest";
import { lintPartnerScore } from "../lib/criminal/partner-score-lint";
import type { DisclosureChaseBrief, DisclosureChaseItem } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterBrief } from "../components/criminal/workflow/buildMatterBrief";

function chaseItem(label: string): DisclosureChaseItem {
  return {
    id: "item-1",
    familyId: "cctv_master",
    label,
    whyItMatters: "CCTV continuity and full export are needed to reconcile the witness account with the clip served so far.",
    source: "Crown / disclosure officer",
    baseStatus: "Outstanding",
    urgency: "medium",
    deadlineLabel: "Before next hearing",
    evidenceAnchor: "CCTV schedule",
    linkedRoute: null,
    draftChaseWording: "Please provide the full CCTV export, continuity, viewing logs and clock-sync material.",
    courtLine: "The defence asks the court to record that full CCTV export remains outstanding.",
    mergedFrom: [label],
  };
}

function goodWar(): HearingWarRoomBrief {
  return {
    caseId: "case-1",
    caseTitle: "case-1",
    clientLabel: "Client",
    allegation: "Robbery",
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "Provisional",
    positionStatus: "Not recorded",
    readiness: "Conditional",
    safePositionToday: "The defence position remains provisional and the court is asked to record outstanding CCTV continuity.",
    sayThis: ["The defence asks the court to record that CCTV and identification remain unresolved."],
    doNotOverstate: ["Do not state CCTV proves identification until full footage is served."],
    askCourtToRecord: ["The defence asks the court to record that full CCTV export remains outstanding."],
    instructionsNeeded: ["Confirm instructions on identification after CCTV service."],
    nextHearingMoves: ["Chase full CCTV export and continuity."],
    evidenceAnchors: ["CCTV schedule"],
    collapseRisks: ["Identification remains provisional pending CCTV continuity."],
    draftWording: {
      disclosureTimetable: "The defence asks for disclosure by [date].",
      adjournment: "Position remains provisional pending CCTV.",
      clientExplanation: "The CCTV and identification evidence still need checking.",
    },
  };
}

function goodChase(): DisclosureChaseBrief {
  const item = chaseItem("CCTV full window / master footage");
  return {
    caseId: "case-1",
    caseTitle: "case-1",
    clientLabel: "Client",
    allegation: "Robbery",
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "Provisional",
    positionStatus: "Not recorded",
    disclosureSummary: "1 priority chase item - robbery id",
    safeCourtLine: "Position remains provisional - ask the court to record outstanding CCTV material.",
    items: [item],
    primaryItems: [item],
    additionalItems: [],
    linkedRoutes: [],
    counters: { total: 1, overdue: 0, dueSoon: 0, chased: 0, received: 0, notStarted: 1 },
    hearingDeadlineNote: null,
  };
}

function goodMatter(): MatterBrief {
  return {
    sections: [
      { id: "theory", title: "Provisional case theory", paragraph: "Identification remains provisional pending full CCTV export and continuity." },
      { id: "risks", title: "Risks", bullets: ["CCTV continuity may affect identification reliability."] },
      { id: "opportunities", title: "Defence opportunities", bullets: ["Ask the court to record outstanding CCTV and ID material."] },
      { id: "chase", title: "Disclosure chase", bullets: ["CCTV full window / master footage - needed for identification."] },
      { id: "client", title: "Client-safe explanation", paragraph: "The CCTV and identification evidence still need checking before anything is final." },
    ],
    courtDayNote: "Court-day line is on Today.",
    plainText: "Identification remains provisional pending full CCTV export and continuity.",
  };
}

describe("partner score lint", () => {
  it("passes solicitor-ready, source-backed output", () => {
    const result = lintPartnerScore({
      profile: "robbery_id",
      missingMaterial: ["CCTV full window / master footage"],
      contradictionLabels: ["MG11 vs CCTV"],
      bundleText: "CCTV schedule served partial. MG11 account differs from CCTV note.",
      war: goodWar(),
      chase: goodChase(),
      matter: goodMatter(),
    });

    expect(result.grade).toBe("pass");
    expect(result.violations).toEqual([]);
  });

  it("clusters generic, incomplete output", () => {
    const war = goodWar();
    war.safePositionToday = "";
    war.sayThis = ["Review the file and maybe chase source material."];
    war.askCourtToRecord = [];
    const chase = goodChase();
    chase.items = [];
    chase.primaryItems = [];
    const matter: MatterBrief = {
      sections: [{ id: "theory", title: "Theory", paragraph: "Provisional pending disclosure." }],
      courtDayNote: "",
      plainText: "Provisional pending disclosure.",
    };

    const result = lintPartnerScore({
      profile: "digital_attribution",
      missingMaterial: ["Phone extraction and metadata"],
      contradictionLabels: [],
      bundleText: "Phone extraction referred only.",
      war,
      chase,
      matter,
    });

    expect(result.grade).not.toBe("pass");
    expect(result.violations.map((v) => v.kind)).toContain("required_tab_field");
    expect(result.violations.map((v) => v.kind)).toContain("source_backing");
  });
});
