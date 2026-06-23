import { describe, expect, it } from "vitest";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";

describe("criminal brief plan", () => {
  it("builds a digital attribution plan from phone/source material", () => {
    const plan = buildCriminalBriefPlan({
      allegation: "Malicious communications by messages",
      bundleText: [
        "=== SECTION: MG5 ===",
        "The Crown relies on screenshots from a phone.",
        "=== SECTION: MG6 ===",
        "MG6C/001 — Phone extraction — summary only, source download outstanding.",
        "MG6C/002 — Screenshots — served.",
      ].join("\n"),
    });

    expect(plan.profile).toBe("digital_attribution");
    expect(plan.mainIssue).toMatch(/Attribution/i);
    expect(plan.todayAngle).toMatch(/Attribution remains provisional/i);
    expect(plan.forbiddenTopics).toContain("BWV");
    expect(plan.missingEvidence.map((item) => item.label).join(" ")).toMatch(/extraction|metadata|source/i);
  });

  it("builds a custody/PACE plan without treating extracts as served facts", () => {
    const plan = buildCriminalBriefPlan({
      allegation: "Assault emergency worker",
      bundleText: [
        "=== SECTION: MG6 ===",
        "MG6C/010 — Custody record — extract only.",
        "MG6C/011 — Interview recording — not served.",
      ].join("\n"),
    });

    expect(plan.profile).toBe("custody_pace");
    expect(plan.todayAngle).toMatch(/Custody\/PACE safeguards cannot be finally assessed/i);
    expect(plan.limitedEvidence.map((item) => item.label).join(" ")).toMatch(/Custody record/i);
    expect(plan.missingEvidence.map((item) => item.label).join(" ")).toMatch(/Interview/i);
  });
});
