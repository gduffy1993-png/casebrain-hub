import { describe, it, expect } from "vitest";
import { riskCopy } from "../riskCopy";

describe("riskCopy", () => {
  describe("limitation", () => {
    it("should return correct titles for each severity", () => {
      expect(riskCopy.limitation.title("critical")).toBe("Limitation period – CRITICAL");
      expect(riskCopy.limitation.title("high")).toBe("Limitation period – high risk");
      expect(riskCopy.limitation.title("medium")).toBe("Limitation period – check required");
      expect(riskCopy.limitation.title("low")).toBe("Limitation period – monitor");
    });

    it("should build messages with limitation date", () => {
      const message = riskCopy.limitation.buildMessage({
        limitationDate: "2025-12-31T00:00:00.000Z",
        daysRemaining: 90,
      });

      expect(message).toContain("2025-12-31");
      expect(message).toContain("procedural guidance only");
      expect(message).toContain("does not constitute legal advice");
    });

    it("should build messages for expired limitation", () => {
      const message = riskCopy.limitation.buildMessage({
        limitationDate: "2024-01-01T00:00:00.000Z",
        isExpired: true,
      });

      expect(message).toContain("may have expired");
      expect(message).toContain("procedural guidance only");
    });

    it("should always include non-legal-advice disclaimer", () => {
      const message1 = riskCopy.limitation.buildMessage({});
      const message2 = riskCopy.limitation.buildMessage({
        limitationDate: "2025-12-31T00:00:00.000Z",
        contextSummary: "Test context",
      });

      expect(message1).toContain("procedural guidance only");
      expect(message1).toContain("does not constitute legal advice");
      expect(message2).toContain("procedural guidance only");
      expect(message2).toContain("does not constitute legal advice");
    });

    it("should generate recommended actions", () => {
      const actions = riskCopy.limitation.defaultRecommendedActions({
        limitationDate: "2025-12-31T00:00:00.000Z",
      });

      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].id).toBe("confirm-dates");
      expect(actions[0].priority).toBe("urgent");
      expect(actions.some((a) => a.id === "standstill-or-issue")).toBe(true);
    });

    it("should include vulnerability actions when applicable", () => {
      const actions = riskCopy.limitation.defaultRecommendedActions({
        limitationDate: "2025-12-31T00:00:00.000Z",
        isMinor: true,
        hasVulnerability: true,
      });

      expect(actions.some((a) => a.id === "check-vulnerability")).toBe(true);
    });

    it("should include urgent review action for expired limitation", () => {
      const actions = riskCopy.limitation.defaultRecommendedActions({
        limitationDate: "2024-01-01T00:00:00.000Z",
        isExpired: true,
      });

      expect(actions.some((a) => a.id === "urgent-review")).toBe(true);
      expect(actions.find((a) => a.id === "urgent-review")?.priority).toBe("urgent");
    });
  });

  describe("awaabs_law", () => {
    it("should return correct titles for each severity", () => {
      expect(riskCopy.awaabs_law.title("critical")).toBe("Awaab's Law – CRITICAL breach");
      expect(riskCopy.awaabs_law.title("high")).toBe("Awaab's Law – deadline exceeded");
      expect(riskCopy.awaabs_law.title("medium")).toBe("Awaab's Law – deadline approaching");
    });

    it("should build messages with deadline information", () => {
      const message = riskCopy.awaabs_law.buildMessage({
        deadlineType: "investigation",
        deadlineDate: "2025-12-31T00:00:00.000Z",
        daysOverdue: 5,
      });

      expect(message).toContain("Awaab's Law");
      expect(message).toContain("14 days");
      expect(message).toContain("procedural guidance only");
    });
  });

  describe("section_11", () => {
    it("should return correct titles for each severity", () => {
      expect(riskCopy.section_11.title("critical")).toBe("Section 11 LTA 1985 – CRITICAL breach");
      expect(riskCopy.section_11.title("high")).toBe("Section 11 LTA 1985 – reasonable time exceeded");
    });

    it("should build messages with repair time information", () => {
      const message = riskCopy.section_11.buildMessage({
        daysSinceReport: 35,
        reasonableTime: 28,
        isVulnerable: false,
      });

      expect(message).toContain("Section 11 LTA 1985");
      expect(message).toContain("procedural guidance only");
    });
  });
});

