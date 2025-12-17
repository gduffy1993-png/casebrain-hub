import { describe, expect, it } from "vitest";
import { findMissingEvidence } from "@/lib/missing-evidence";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";

describe("Criminal purity + probability gating", () => {
  it("criminal missing evidence must not include CFA/retainer/Part36/PAP/quantum items", () => {
    const missing = findMissingEvidence("case-1", "criminal", []);
    const joined = missing.map((m) => m.label).join(" | ").toLowerCase();
    expect(joined).not.toMatch(/cfa|retainer|engagement letter|part\s*36|pap|schedule of loss|quantum|letter before action|pre-action/i);
  });

  it("probabilities are suppressed when completeness is low", () => {
    const res = shouldShowProbabilities({
      practiceArea: "criminal",
      completeness: 0,
      criticalMissingCount: 0,
    });
    expect(res.show).toBe(false);
    expect(res.reason).toMatch(/insufficient bundle/i);
  });
});


