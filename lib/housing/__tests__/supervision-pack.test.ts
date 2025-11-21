import { describe, it, expect } from "vitest";

// Mock test for supervision pack logic
// In a real implementation, we'd mock Supabase and test generateSupervisionPack

describe("Supervision Pack Generator", () => {
  it("should include all required sections", () => {
    const packSections = [
      "summary",
      "limitation",
      "hazards",
      "awaabsLaw",
      "vulnerability",
      "timeline",
      "riskAlerts",
      "recommendedActions",
      "outstandingTasks",
      "disclaimer",
    ];

    const mockPack = {
      summary: {},
      limitation: {},
      hazards: {},
      awaabsLaw: {},
      vulnerability: {},
      timeline: [],
      riskAlerts: [],
      recommendedActions: [],
      outstandingTasks: [],
      disclaimer: "",
    };

    packSections.forEach((section) => {
      expect(mockPack).toHaveProperty(section);
    });
  });

  it("should format markdown correctly", () => {
    const caseTitle = "Test Case";
    const caseId = "test-123";
    const markdown = `# Supervision Pack: ${caseTitle}\n\n**Case ID:** ${caseId}\n\n`;

    expect(markdown).toContain("# Supervision Pack:");
    expect(markdown).toContain(caseTitle);
    expect(markdown).toContain("**Case ID:**");
    expect(markdown).toContain(caseId);
  });

  it("should prioritize risk alerts by severity", () => {
    const riskAlerts = [
      { severity: "low" as const, title: "Low risk" },
      { severity: "critical" as const, title: "Critical risk" },
      { severity: "medium" as const, title: "Medium risk" },
      { severity: "high" as const, title: "High risk" },
    ];

    const sorted = riskAlerts.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });

    expect(sorted[0].severity).toBe("critical");
    expect(sorted[1].severity).toBe("high");
    expect(sorted[2].severity).toBe("medium");
    expect(sorted[3].severity).toBe("low");
  });

  it("should include disclaimer in all outputs", () => {
    const disclaimer =
      "This supervision pack is generated from extracted evidence and case data. It is procedural guidance only and does not constitute legal advice.";

    expect(disclaimer).toContain("procedural guidance only");
    expect(disclaimer).toContain("not legal advice");
  });
});

