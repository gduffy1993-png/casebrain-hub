import { describe, expect, it } from "vitest";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { BattleboardOutput } from "../lib/criminal/strategy-battleboard";

function battleboard(lines: Partial<BattleboardOutput["primary_route"]>): BattleboardOutput {
  const route = {
    id: "primary",
    route_type: "timeline" as const,
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
    case_id: "CB-FRESH-TEST",
    generated_at: "2026-06-23T00:00:00.000Z",
    overall_status: "needs_review",
    solicitor_safe_summary: route.hearing_line,
    primary_route: route,
    routes: [route],
    global_collapse_risks: route.collapse_risks,
    urgent_next_moves: route.next_moves,
  };
}

const digitalBundle = [
  "=== SECTION: CHARGE ===",
  "Harassment by messages.",
  "=== SECTION: MG5 ===",
  "The prosecution relies on screenshots and a phone download summary.",
  "=== SECTION: MG6 ===",
  "MG6C/001 — Phone extraction — summary only, source download outstanding.",
  "MG6C/002 — Screenshot pack — served.",
].join("\n");

const custodyBundle = [
  "=== SECTION: CHARGE ===",
  "Assault emergency worker.",
  "=== SECTION: MG5 ===",
  "Officer account and custody reference are summarised.",
  "=== SECTION: MG6 ===",
  "BWV reference | 7 |",
  "MG6C/010 — BWV — referred to but not attached.",
  "I activated BWV at the scene. The defendant grabbed my vest before I took hold of his arm. Full clip not on this",
  "referred to on the schedule but not attached. Custody record is extract only.",
  "MG6C/011 — Custody record — extract only.",
  "Custody record extract — detention authorised. Safeguards checklist referenced; full record outstanding.",
  "MG6C/012 — MG11 officer statement — draft unsigned.",
].join("\n");

describe("source truth guardian", () => {
  it("blocks Taylor-style BWV/drugs bleed on a digital bundle without flattening safe output", () => {
    const brief = buildHearingWarRoomBrief({
      caseId: "CB-FRESH-001",
      caseTitle: "Taylor",
      clientLabel: "Taylor",
      allegation: "Harassment by messages",
      stage: "PTPH",
      hearingStatus: "Listed",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      readiness: "",
      battleboard: battleboard({
        hearing_line: "The defence position remains provisional pending served phone material.",
        collapse_risks: [
          "BWV confirms Crown sequence.",
          "Drug continuity may close the route.",
          "The defence cannot fix attribution until the phone extraction source is served.",
        ],
        evidence_anchors: ["BWV clip 2", "Phone extraction summary only"],
      }),
      hasSavedPosition: false,
      chaseItems: ["Phone extraction source download"],
      bundleText: digitalBundle,
    });

    const text = JSON.stringify(brief);
    expect(text).not.toMatch(/\bBWV confirms\b/i);
    expect(text).not.toMatch(/drug continuity/i);
    expect(text).toMatch(/phone material|phone extraction/i);
    expect(brief.sourceTruthGuardian?.flags.some((f) =>
      ["wrong_modality", "state_contradiction", "template_bleed"].includes(f),
    )).toBe(true);
  });

  it("handles Jordan-style custody/BWV state contradictions and relabels defence account", () => {
    const brief = buildHearingWarRoomBrief({
      caseId: "CB-FRESH-002",
      caseTitle: "Jordan",
      clientLabel: "Jordan",
      allegation: "Assault emergency worker",
      stage: "PTPH",
      hearingStatus: "Listed",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      readiness: "",
      battleboard: battleboard({
        hearing_line: "The defence position remains provisional pending served BWV and custody material.",
        collapse_risks: [
          "Safeguards were followed.",
          "Officer grabbed first.",
          "Witness confirms he pushed her.",
        ],
      }),
      hasSavedPosition: false,
      chaseItems: ["BWV full clip", "Custody record"],
      bundleText: custodyBundle,
    });

    const text = JSON.stringify(brief);
    const unsafeSurfaces = [
      brief.safePositionToday,
      ...brief.sayThis,
      ...brief.collapseRisks,
      ...brief.evidenceAnchors,
    ].join("\n");
    expect(unsafeSurfaces).not.toMatch(/Safeguards were followed/i);
    expect(unsafeSurfaces).not.toMatch(/Witness confirms he pushed her/i);
    expect(text).toMatch(/DEFENCE ACCOUNT:/);
    expect(brief.sourceTruthGuardian?.flags).toContain("state_contradiction");
    expect(brief.sourceTruthGuardian?.flags).toContain("defence_account_relabelled");
  });

  it("removes MG6C headers as chase items and keeps useful chase wording", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-001",
      caseTitle: "Taylor",
      clientLabel: "Taylor",
      allegation: "Harassment by messages",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-07-01T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["MG6C: Unused Material Schedule", "Phone extraction source download"],
      bundleText: digitalBundle,
    });

    expect(chase.items.every((item) => !/Unused Material Schedule/i.test(item.label))).toBe(true);
    expect(JSON.stringify(chase.items.map((item) => item.mergedFrom))).toMatch(/Unused Material Schedule/i);
    expect(JSON.stringify(chase)).toMatch(/Phone extraction/i);
    expect(chase.items.some((item) => item.familyId === "mg6_unused")).toBe(true);
  });

  it("collapses Jordan-style referred-only BWV/custody fragments into clean chase items", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-002",
      caseTitle: "Jordan",
      clientLabel: "Jordan",
      allegation: "Assault emergency worker",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-03-12T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      snapshotMissing: [
        { label: "Body Worn Video (BWV)", status: "outstanding" },
        { label: "Interview Recording", status: "outstanding" },
      ],
      bundleText: custodyBundle,
    });

    const labels = chase.items.map((item) => item.label).join("\n");
    expect(labels).toMatch(/Body-worn video \(BWV\)/i);
    expect(labels).toMatch(/Full custody record \/ PACE material/i);
    expect(labels).not.toMatch(/BWV reference \| 7 \|/i);
    expect(labels).not.toMatch(/I activated BWV at the scene/i);
    expect(labels).not.toMatch(/referred to on the schedule but not attached/i);
  });
});
