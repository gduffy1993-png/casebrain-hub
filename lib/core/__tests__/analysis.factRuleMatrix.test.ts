import { describe, it, expect } from "vitest";
import { buildFactRuleMatrix } from "../analysis";
import type { Fact } from "../enterprise-types";
import type { RiskFlag, MissingEvidenceItem, LimitationInfo, NextStep, KeyIssue } from "../../types/casebrain";
import type { OutcomeSummary, ComplaintRiskSummary } from "../enterprise-types";

describe("buildFactRuleMatrix", () => {
  it("should return empty array when no facts are provided", () => {
    const matrix = buildFactRuleMatrix(
      [],
      [],
      [],
      null,
      [],
      [],
    );
    expect(matrix).toEqual([]);
  });

  it("should link facts to rules via explanations", () => {
    const facts: Fact[] = [
      { id: "fact-1", label: "Client reported incident on 2024-01-15", category: "event" },
      { id: "fact-2", label: "Medical report obtained", category: "evidence" },
    ];

    const risks: Array<RiskFlag & { explanation?: { ruleId?: string; triggeredByFacts?: string[] } }> = [
      {
        id: "risk-1",
        caseId: "case-1",
        severity: "HIGH",
        type: "limitation",
        code: "LIMITATION",
        title: "Limitation approaching",
        message: "Limitation period is approaching",
        source: "risk_detection",
        status: "outstanding",
        createdAt: new Date().toISOString(),
        explanation: {
          id: "exp-1",
          ruleId: "rule-limitation-1",
          triggeredByFacts: ["fact-1"],
          summary: "Fact-1 triggered limitation risk",
        },
      },
    ];

    const nextSteps: Array<NextStep & { explanation?: { ruleId?: string; triggeredByFacts?: string[] } }> = [
      {
        id: "next-1",
        caseId: "case-1",
        action: "Review limitation position",
        priority: "HIGH",
        explanation: {
          id: "exp-2",
          ruleId: "rule-next-1",
          triggeredByFacts: ["fact-1", "fact-2"],
          summary: "Facts triggered next step",
        },
      },
    ];

    const matrix = buildFactRuleMatrix(
      facts,
      risks,
      [],
      null,
      [],
      nextSteps,
    );

    expect(matrix.length).toBeGreaterThan(0);
    
    const fact1Link = matrix.find(link => link.factId === "fact-1");
    expect(fact1Link).toBeDefined();
    expect(fact1Link?.ruleIds).toContain("rule-limitation-1");
    expect(fact1Link?.ruleIds).toContain("rule-next-1");
    expect(fact1Link?.outputTypes).toContain("risk");
    expect(fact1Link?.outputTypes).toContain("nextStep");

    const fact2Link = matrix.find(link => link.factId === "fact-2");
    expect(fact2Link).toBeDefined();
    expect(fact2Link?.ruleIds).toContain("rule-next-1");
    expect(fact2Link?.outputTypes).toContain("nextStep");
  });

  it("should handle facts without explanations gracefully", () => {
    const facts: Fact[] = [
      { id: "fact-1", label: "Some fact", category: "event" },
    ];

    const risks: Array<RiskFlag & { explanation?: { ruleId?: string; triggeredByFacts?: string[] } }> = [
      {
        id: "risk-1",
        caseId: "case-1",
        severity: "HIGH",
        type: "limitation",
        code: "LIMITATION",
        title: "Some risk",
        message: "Risk message",
        source: "risk_detection",
        status: "outstanding",
        createdAt: new Date().toISOString(),
        // No explanation
      },
    ];

    const matrix = buildFactRuleMatrix(
      facts,
      risks,
      [],
      null,
      [],
      [],
    );

    // Should not crash, but fact-1 won't be linked since risk has no explanation
    expect(matrix).toEqual([]);
  });

  it("should include outcome and complaint summaries in matrix", () => {
    const facts: Fact[] = [
      { id: "fact-1", label: "Critical evidence missing", category: "evidence" },
    ];

    const outcomeSummary: OutcomeSummary = {
      level: "weak",
      dimensions: {
        liability: "weak",
        quantum: "moderate",
        evidential: "weak",
        limitation: "strong",
      },
      notes: ["Evidence gaps identified"],
      explanation: {
        id: "exp-outcome",
        ruleId: "rule-outcome-1",
        triggeredByFacts: ["fact-1"],
        summary: "Fact-1 contributed to weak outcome",
      },
    };

    const complaintRiskSummary: ComplaintRiskSummary = {
      level: "high",
      drivers: ["Missing evidence"],
      notes: ["High complaint risk"],
      explanation: {
        id: "exp-complaint",
        ruleId: "rule-complaint-1",
        triggeredByFacts: ["fact-1"],
        summary: "Fact-1 contributed to complaint risk",
      },
    };

    const matrix = buildFactRuleMatrix(
      facts,
      [],
      [],
      null,
      [],
      [],
      outcomeSummary,
      complaintRiskSummary,
    );

    const fact1Link = matrix.find(link => link.factId === "fact-1");
    expect(fact1Link).toBeDefined();
    expect(fact1Link?.ruleIds).toContain("rule-outcome-1");
    expect(fact1Link?.ruleIds).toContain("rule-complaint-1");
    expect(fact1Link?.outputTypes).toContain("outcome");
  });
});

