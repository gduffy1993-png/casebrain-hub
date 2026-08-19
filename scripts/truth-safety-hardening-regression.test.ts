import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  familySupport,
  gateChaseLine,
  gateMaterialLine,
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
    case_id: "CB-HARDENING-TEST",
    generated_at: "2026-08-19T00:00:00.000Z",
    overall_status: "needs_review",
    solicitor_safe_summary: route.hearing_line,
    primary_route: route,
    routes: [route],
    global_collapse_risks: route.collapse_risks,
    urgent_next_moves: route.next_moves,
  };
}

const patelSource = [
  "Isaac Patel",
  "Charge: Affray",
  "Court: Southford Magistrates' Court",
  "First Appearance: 25 August 2026",
  "MG5: CCTV stills are referred to. The full CCTV master footage/export log is outstanding.",
  "Interview summary is on file. Full interview recording/transcript is not served and remains outstanding.",
].join("\n");

describe("truth/safety hardening invariants", () => {
  it("does not let unsupported expected material become asserted missing/outstanding chases", () => {
    expect(familySupport("cctv", patelSource)).toBe("mentioned");
    expect(familySupport("interview", patelSource)).toBe("mentioned");
    expect(familySupport("phone", patelSource)).toBe("absent");
    expect(familySupport("medical", patelSource)).toBe("absent");
    expect(familySupport("bwv", patelSource)).toBe("absent");

    expect(gateChaseLine("Please provide the full phone download.", patelSource)).toMatchObject({
      action: "drop",
      family: "phone",
    });
    expect(gateMaterialLine("Medical/injury report outstanding", patelSource)).toMatchObject({
      action: "drop",
      family: "medical",
    });

    const brief = buildDisclosureChaseBrief({
      caseId: "CB-PATEL-HARDENING",
      caseTitle: "Isaac Patel",
      clientLabel: "Isaac Patel",
      allegation: "Affray",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: battleboard({
        evidence_anchors: ["full phone download / source export", "medical report", "BWV"],
      }),
      proceduralOutstanding: [
        "Full CCTV master footage/export log outstanding",
        "Full interview recording/transcript outstanding",
        "Full phone download outstanding",
        "Medical/injury material outstanding",
        "BWV outstanding",
        "999 audio outstanding",
        "Retraction/further statement outstanding",
      ],
      bundleText: patelSource,
    });

    const visible = [
      brief.disclosureSummary,
      ...brief.items.flatMap((item) => [
        item.label,
        item.whyItMatters,
        item.evidenceAnchor ?? "",
        item.draftChaseWording,
        item.courtLine,
        ...(item.mergedFrom ?? []),
      ]),
    ].join("\n");

    expect(visible).toMatch(/CCTV/i);
    expect(visible).toMatch(/interview recording|transcript/i);
    expect(visible).not.toMatch(/\bphone download|source export|medical|injury|BWV|body[-\s]?worn|999|retraction|further statement\b/i);
  });

  it("keeps conditional case-wide wording limited to source-supported evidence families", () => {
    const prose =
      "Identification and participation remain conditional on full CCTV, phone extraction, medical report, BWV, CAD/999 timing and interview material.";

    const gated = gateProseAgainstSource(prose, patelSource);

    expect(gated).toMatch(/served CCTV/i);
    expect(gated).toMatch(/interview material/i);
    expect(gated).not.toMatch(/phone|medical|BWV|body[-\s]?worn|CAD|999/i);
  });

  it("uses provisional hearing deadlines when no reliable hearing date is established", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "CB-NO-HEARING-DATE",
      caseTitle: "No hearing date test",
      clientLabel: "Client",
      allegation: "Robbery",
      stage: "First Appearance",
      hearingStatus: "Not safely identified",
      hearingDateIso: null,
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["CCTV full window / master footage outstanding"],
      bundleText: "MG5 refers to CCTV stills. Full CCTV master footage is outstanding.",
    });

    expect(brief.items.length).toBeGreaterThan(0);
    expect(brief.items.every((item) => item.deadlineLabel === "Before next hearing")).toBe(true);
    expect(brief.items.every((item) => /Hearing date not safely extracted/i.test(item.hearingDeadlineNote))).toBe(true);
  });

  it("keeps the selected-case pilot route out of the old empty-hearings shell", () => {
    const courtTodayClientSource = fs.readFileSync(
      "components/criminal/court-today/CourtTodayClient.tsx",
      "utf8",
    );
    const splitSource = fs.readFileSync(
      "components/criminal/court-today/CourtTodayPilotSplit.tsx",
      "utf8",
    );

    expect(courtTodayClientSource).toMatch(/rows\.length === 0 && !\(pilotMode && requestedCaseId\)/);
    expect(courtTodayClientSource).toMatch(/allCaseListFallbackOnly/);
    expect(splitSource).toMatch(/Selected matter/);
    expect(splitSource).toMatch(/stats\.chaseLabel \?\? "Active chase items"/);
  });

  it("forbids the historical solicitor-visible leakage classes in shared source files", () => {
    const sourceFiles = [
      "components/criminal/court-today/CourtTodayClient.tsx",
      "components/criminal/court-today/CourtTodayPilotSplit.tsx",
      "components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts",
      "components/criminal/disclosure-chase/DisclosureChase.tsx",
      "components/criminal/workflow/PilotSummaryView.tsx",
      "lib/criminal/pilot-workflow.ts",
      "lib/criminal/solicitor-visible-sanitization.ts",
    ];
    const banned = [
      /Full phone download outstanding/i,
      /co-defendant\/unknown male/i,
      /remains outstanding\.\s*remains outstanding/i,
      /\b\d+\s*k\s*chars\b/i,
      /\bchars text\b/i,
      /\bviolence assault\b/i,
      /PTPH note: ask the court/i,
      /Check this source before fixing the hearing position/i,
    ];

    for (const file of sourceFiles) {
      const source = fs.readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(source, `${file} must not contain ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
