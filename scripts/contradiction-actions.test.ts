import { describe, expect, it } from "vitest";
import { buildContradictionActions } from "../lib/criminal/contradiction-actions";
import type { BundleContradiction, BundleContradictionType } from "../lib/criminal/extract-bundle-contradictions";

const TYPES: BundleContradictionType[] = [
  "location",
  "first_contact",
  "loss_figure",
  "cctv_window",
  "sequence_order",
  "sequence_timeline",
  "scope_multi_vs_single",
  "scope_indictment_count",
  "strength_serious_vs_minor",
  "strength_force_vs_cctv",
  "multi_incident_dates",
  "multi_incident_complainants",
  "triangulation_mg11_cctv",
  "triangulation_dispatch_scene",
  "triangulation_bwv_account",
];

function contradiction(type: BundleContradictionType): BundleContradiction {
  return {
    type,
    sources: ["MG5", "MG11"],
    values: ["source A", "source B"],
    theoryLine: "Existing theory line.",
    riskLine: "Existing risk line.",
    opportunityLine: "Existing opportunity line.",
  };
}

describe("contradiction actions", () => {
  it("maps every contradiction type to court, chase, summary and client-safe actions", () => {
    const actions = buildContradictionActions(TYPES.map(contradiction));

    expect(actions).toHaveLength(TYPES.length);
    for (const action of actions) {
      expect(action.label).toMatch(/source A vs source B/);
      expect(action.todayCourtLine).toMatch(/defence asks the court to record/i);
      expect(action.chaseAsk.length).toBeGreaterThan(12);
      expect(action.draftChaseWording).toMatch(/please provide/i);
      expect(action.summaryRisk).toMatch(/remain|not safely|unresolved|provisional|may not|should not be fixed|reconciled/i);
      expect(action.clientSafeLine).not.toMatch(/case is won|plead guilty|guaranteed/i);
    }
  });

  it("dedupes repeated contradiction types", () => {
    const actions = buildContradictionActions([
      contradiction("triangulation_bwv_account"),
      contradiction("triangulation_bwv_account"),
      contradiction("loss_figure"),
    ]);

    expect(actions.map((a) => a.type)).toEqual(["triangulation_bwv_account", "loss_figure"]);
  });
});
