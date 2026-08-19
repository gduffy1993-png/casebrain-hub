import { describe, expect, it } from "vitest";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  familySupport,
  gateChaseLine,
  gateProseAgainstSource,
} from "../lib/criminal/chase-source-gate";
import type { BattleboardOutput } from "../lib/criminal/strategy-battleboard";

function battleboard(lines: Partial<BattleboardOutput["primary_route"]>): BattleboardOutput {
  const route = {
    id: "primary",
    route_type: "identity" as const,
    title: "Provisional source-led route",
    status: "conditional" as const,
    why_it_helps: [],
    what_hurts_us: [],
    evidence_anchors: [],
    collapse_risks: [],
    next_moves: [],
    hearing_line: "The defence position remains provisional pending served source material.",
    safety_note: "Provisional — solicitor review required.",
    ...lines,
  };
  return {
    case_id: "CB-MASTER3000-INVARIANT",
    generated_at: "2026-08-19T00:00:00.000Z",
    overall_status: "needs_review",
    solicitor_safe_summary: route.hearing_line,
    primary_route: route,
    routes: [route],
    global_collapse_risks: route.collapse_risks,
    urgent_next_moves: route.next_moves,
  };
}

function visibleChaseText(brief: ReturnType<typeof buildDisclosureChaseBrief>): string {
  return [
    brief.disclosureSummary,
    brief.safeCourtLine,
    ...brief.items.flatMap((item) => [
      item.label,
      item.familyId,
      item.baseStatus,
      item.whyItMatters,
      item.evidenceAnchor ?? "",
      item.deadlineLabel,
      item.hearingDeadlineNote ?? "",
      item.draftChaseWording,
      item.courtLine,
      ...(item.mergedFrom ?? []),
    ]),
  ].join("\n");
}

const noCctvBundle = [
  "Charge: Assault by beating.",
  "MG5: The prosecution relies on a witness account.",
  "MG6: The extract contains witness material only.",
].join("\n");

const referredOnlyCctvBundle = [
  "Charge: Robbery.",
  "MG5: A witness states they viewed CCTV stills.",
  "MG6: Schedule refers to CCTV stills only. The master recording is not attached in this extract.",
].join("\n");

const outstandingCctvBundle = [
  "Charge: Affray.",
  "MG5: CCTV stills are referred to.",
  "MG6: Full CCTV master footage/export log is outstanding.",
].join("\n");

const servedCctvBundle = [
  "Charge: Robbery.",
  "CCTV exhibit AV/1 served: full master recording and export log present.",
  "Continuity statement served with exhibit AV/1.",
].join("\n");

const firstAppearanceBundle = [
  "Charge: Affray.",
  "Court: Southford Magistrates' Court.",
  "First Appearance: 25 August 2026.",
  "MG5: CCTV stills are referred to. Full CCTV master footage/export log is outstanding.",
  "Interview summary is on file. Full interview recording/transcript is not served and remains outstanding.",
].join("\n");

describe("master3000 high-value invariant fixtures", () => {
  it("keeps existence/service states distinct for CCTV opposite scenarios", () => {
    expect(familySupport("cctv", noCctvBundle)).toBe("absent");
    expect(familySupport("cctv", referredOnlyCctvBundle)).toBe("mentioned");
    expect(familySupport("cctv", outstandingCctvBundle)).toBe("mentioned");
    expect(familySupport("cctv", servedCctvBundle)).toBe("mentioned");

    expect(gateChaseLine("Please provide the full CCTV master.", noCctvBundle)).toMatchObject({
      action: "drop",
      family: "cctv",
    });
    expect(gateChaseLine("Please provide the full CCTV master.", outstandingCctvBundle)).toMatchObject({
      action: "keep",
    });
  });

  it("does not promote unsupported practitioner expectations into active chases", () => {
    const visible = [
      gateChaseLine("Please provide BWV.", firstAppearanceBundle),
      gateChaseLine("Please provide medical records.", firstAppearanceBundle),
      gateChaseLine("Please provide 999 audio.", firstAppearanceBundle),
      gateChaseLine("Please provide retraction/further statement.", firstAppearanceBundle),
      gateChaseLine("Please provide full phone download.", firstAppearanceBundle),
    ];

    expect(visible.every((entry) => entry.action === "drop")).toBe(true);
  });

  it("prevents wrong-family provenance from attaching to CCTV chase items", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "CB-MASTER3000-FAMILY-FIREWALL",
      caseTitle: "Family firewall",
      clientLabel: "Client",
      allegation: "Affray",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: battleboard({
        evidence_anchors: ["full phone download / source export", "CCTV stills referred to"],
      }),
      proceduralOutstanding: ["CCTV full window / master footage outstanding"],
      bundleText: outstandingCctvBundle,
    });

    const cctv = brief.items.find((item) => item.familyId === "cctv_master");
    expect(cctv).toBeTruthy();
    expect(visibleChaseText(brief)).toMatch(/CCTV/i);
    expect(cctv?.evidenceAnchor ?? "").not.toMatch(/phone|download|source export/i);
  });

  it("does not render First Appearance as a current PTPH workflow", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "CB-MASTER3000-STAGE",
      caseTitle: "Stage routing",
      clientLabel: "Client",
      allegation: "Affray",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["Full interview recording/transcript outstanding"],
      bundleText: firstAppearanceBundle,
    });

    expect(visibleChaseText(brief)).toMatch(/interview recording|transcript/i);
    expect(visibleChaseText(brief)).not.toMatch(/\bPTPH\b|case management note/i);
  });

  it("keeps no-hearing-date chase deadlines provisional on every item", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "CB-MASTER3000-DEADLINE",
      caseTitle: "Deadline",
      clientLabel: "Client",
      allegation: "Robbery",
      stage: "First Appearance",
      hearingStatus: "Not safely identified",
      hearingDateIso: null,
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["CCTV full window / master footage outstanding", "Full interview recording/transcript outstanding"],
      bundleText: `${outstandingCctvBundle}\nFull interview recording/transcript is not served and remains outstanding.`,
    });

    expect(brief.items.length).toBeGreaterThanOrEqual(2);
    expect(brief.items.every((item) => item.deadlineLabel === "Before next hearing")).toBe(true);
    expect(brief.items.every((item) => /Hearing date not safely extracted/i.test(item.hearingDeadlineNote ?? ""))).toBe(true);
  });

  it("dedupes alias chases without merging distinct family requests", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "CB-MASTER3000-DEDUPE",
      caseTitle: "Dedupe",
      clientLabel: "Client",
      allegation: "Robbery",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-09-01T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: [
        "CCTV master outstanding",
        "Full CCTV master footage outstanding",
        "CCTV full window outstanding",
        "CCTV continuity statement outstanding",
      ],
      bundleText: [
        "MG6: Full CCTV master footage/export log is outstanding.",
        "MG6: CCTV continuity statement is outstanding.",
      ].join("\n"),
    });

    const cctvMasterItems = brief.items.filter((item) => item.familyId === "cctv_master");
    const continuityItems = brief.items.filter((item) => /continuity/i.test(item.label));
    expect(cctvMasterItems).toHaveLength(1);
    expect(continuityItems.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps court/client prose inside source-supported families", () => {
    const prose =
      "Identification remains conditional on CCTV, BWV, medical evidence, 999 audio, phone extraction and interview material.";
    const gated = gateProseAgainstSource(prose, firstAppearanceBundle);
    expect(gated).toMatch(/CCTV/i);
    expect(gated).toMatch(/interview/i);
    expect(gated).not.toMatch(/BWV|medical|999|phone/i);
  });
});
