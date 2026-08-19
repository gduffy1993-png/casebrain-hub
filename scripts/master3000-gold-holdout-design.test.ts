import { describe, expect, it } from "vitest";
import {
  GOLD_HOLDOUT_POLICY,
  STRATIFICATION_AXES,
  validateGoldHoldoutPolicy,
} from "../lib/eval/master3000-quality";

describe("master3000 gold/holdout design", () => {
  it("keeps gold and holdout targets inside the master prompt ranges", () => {
    expect(GOLD_HOLDOUT_POLICY.goldTargetMin).toBeGreaterThanOrEqual(150);
    expect(GOLD_HOLDOUT_POLICY.goldTargetMax).toBeLessThanOrEqual(250);
    expect(GOLD_HOLDOUT_POLICY.holdoutTargetMin).toBeGreaterThanOrEqual(50);
    expect(GOLD_HOLDOUT_POLICY.holdoutTargetMax).toBeLessThanOrEqual(100);
  });

  it("requires the core stratification axes", () => {
    expect(GOLD_HOLDOUT_POLICY.axes).toEqual(STRATIFICATION_AXES);
    expect(GOLD_HOLDOUT_POLICY.axes).toContain("offence_family");
    expect(GOLD_HOLDOUT_POLICY.axes).toContain("source_quality");
    expect(GOLD_HOLDOUT_POLICY.axes).toContain("workflow_surface_risk");
  });

  it("forbids using CaseBrain output as the source of truth", () => {
    expect(GOLD_HOLDOUT_POLICY.truthSourcesForbidden).toContain("current_casebrain_output");
    expect(GOLD_HOLDOUT_POLICY.truthSourcesAllowed).toContain("source_pdf_or_source_text");
    expect(GOLD_HOLDOUT_POLICY.truthSourcesAllowed).toContain("independent_truth_key");
  });

  it("keeps holdout independent and non-claims explicit", () => {
    expect(GOLD_HOLDOUT_POLICY.selectionRules.some((rule) => /disjoint/i.test(rule))).toBe(true);
    expect(GOLD_HOLDOUT_POLICY.nonClaims).toEqual({
      selected: false,
      groundTruthInvented: false,
      casebrainOutputUsedAsTruth: false,
    });
  });

  it("validates the policy with zero issues", () => {
    expect(validateGoldHoldoutPolicy()).toEqual([]);
  });
});

