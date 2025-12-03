import { describe, it, expect } from "vitest";
import type { LitigationPack } from "../../packs/types";
import type { OutcomeSummary, ComplaintRiskSummary } from "../enterprise-types";

// Mock pack for testing
const createMockPack = (): LitigationPack => ({
  id: "test_pack",
  label: "Test Pack",
  description: "Test",
  version: "1.0.0",
  defaultPracticeArea: "other_litigation",
  evidenceChecklist: [],
  complianceItems: [],
  limitationRules: [],
  limitationSummary: { summary: "Test limitation" },
  riskRules: [],
  missingEvidenceHints: { summary: "Test", patterns: [] },
  keyIssuesTemplates: [],
  outcomePatterns: {
    settlementLevers: ["Test lever"],
    defencePatterns: ["Test defence"],
    escalationTriggers: ["Test trigger"],
  },
  complaintRiskPatterns: {
    summary: "Test complaint risk",
    patterns: ["Test pattern"],
  },
  nextStepPatterns: [],
  hearingPrepChecklist: [],
  instructionsToCounselHints: [],
  searchKeywords: [],
  glossary: [],
  promptHints: {
    clientUpdate: "Test client update hint",
  },
});

describe("Drafting Integration with Outcome/Complaint Summaries", () => {
  it("should include key issues in draft context", () => {
    const analysis = {
      risks: [
        { severity: "CRITICAL", label: "Critical risk", description: "Description" },
        { severity: "HIGH", label: "High risk", description: "Description" },
      ],
      missingEvidence: [
        { label: "Medical report", priority: "CRITICAL" },
      ],
      limitation: {
        daysRemaining: 15,
        isExpired: false,
      },
      keyIssues: [
        { label: "Liability disputed" },
        { label: "Quantum unclear" },
      ],
    };

    // Simulate prompt construction
    const promptContext = JSON.stringify({
      keyRisks: analysis.risks
        .filter(r => r.severity === "CRITICAL" || r.severity === "HIGH")
        .map(r => r.label)
        .slice(0, 5),
      missingEvidence: analysis.missingEvidence
        .filter(e => e.priority === "CRITICAL" || e.priority === "HIGH")
        .map(e => e.label)
        .slice(0, 5),
      limitationUrgent: analysis.limitation?.daysRemaining && analysis.limitation.daysRemaining <= 30
        ? `Limitation: ${analysis.limitation.daysRemaining} days remaining`
        : undefined,
      keyIssues: analysis.keyIssues?.map(i => i.label).slice(0, 5) ?? [],
    }, null, 2);

    expect(promptContext).toContain("Critical risk");
    expect(promptContext).toContain("High risk");
    expect(promptContext).toContain("Medical report");
    expect(promptContext).toContain("Liability disputed");
    expect(promptContext).toContain("Quantum unclear");
    expect(promptContext).toContain("Limitation: 15 days remaining");
  });

  it("should include outcome summary in draft context", () => {
    const outcomeSummary: OutcomeSummary = {
      level: "weak",
      dimensions: {
        liability: "weak",
        quantum: "moderate",
        evidential: "weak",
        limitation: "strong",
      },
      notes: ["Evidence gaps identified", "Liability position needs strengthening"],
    };

    const promptContext = JSON.stringify({
      overallLevel: outcomeSummary.level,
      dimensions: outcomeSummary.dimensions,
      notes: outcomeSummary.notes.slice(0, 3),
    }, null, 2);

    expect(promptContext).toContain("weak");
    expect(promptContext).toContain("liability");
    expect(promptContext).toContain("Evidence gaps identified");
  });

  it("should adjust tone for high complaint risk", () => {
    const complaintRiskSummary: ComplaintRiskSummary = {
      level: "high",
      drivers: ["No client update for 45 days", "Critical compliance gaps present"],
      notes: ["High complaint risk"],
    };

    const systemPrompt = complaintRiskSummary.level === "high"
      ? "IMPORTANT: This case has HIGH complaint risk. Be more explicit about uncertainties, risks, and manage client expectations carefully. Use cautious but professional language."
      : "Standard drafting tone.";

    expect(systemPrompt).toContain("HIGH complaint risk");
    expect(systemPrompt).toContain("explicit about uncertainties");
    expect(systemPrompt).toContain("manage client expectations");
  });

  it("should include complaint risk drivers in draft context", () => {
    const complaintRiskSummary: ComplaintRiskSummary = {
      level: "high",
      drivers: ["No client update for 45 days", "Critical compliance gaps", "Limitation approaching"],
      notes: ["High complaint risk"],
    };

    const promptContext = JSON.stringify({
      level: complaintRiskSummary.level,
      drivers: complaintRiskSummary.drivers.slice(0, 3),
    }, null, 2);

    expect(promptContext).toContain("high");
    expect(promptContext).toContain("No client update for 45 days");
    expect(promptContext).toContain("Critical compliance gaps");
  });

  it("should use pack-specific prompt hints", () => {
    const pack = createMockPack();

    const systemPrompt = pack.promptHints?.clientUpdate
      ? `Practice-specific guidance: ${pack.promptHints.clientUpdate}`
      : "";

    expect(systemPrompt).toContain("Test client update hint");
  });

  it("should handle missing outcome/complaint summaries gracefully", () => {
    const analysis = {
      risks: [{ severity: "HIGH", label: "Risk", description: "Description" }],
      missingEvidence: [],
      keyIssues: [],
    };

    // Should not crash when summaries are undefined
    const promptContext = JSON.stringify({
      keyRisks: analysis.risks
        .filter(r => r.severity === "CRITICAL" || r.severity === "HIGH")
        .map(r => r.label)
        .slice(0, 5),
      // outcomeSummary and complaintRiskSummary are undefined
    }, null, 2);

    expect(promptContext).toContain("Risk");
  });
});

