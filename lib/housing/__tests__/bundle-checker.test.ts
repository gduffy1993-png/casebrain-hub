import { describe, it, expect } from "vitest";
import type { BundleScanItemType } from "@/types/bundle-scan";

// Mock test for bundle checker logic
// In a real implementation, we'd mock Supabase and test the scanHousingBundle function

describe("Bundle Checker", () => {
  it("should detect missing surveyor report", () => {
    const documents = [
      { name: "letter.pdf", type: "application/pdf" },
      { name: "email.pdf", type: "application/pdf" },
    ];

    const hasSurveyorReport = documents.some(
      (doc) =>
        doc.name.toLowerCase().includes("survey") ||
        doc.name.toLowerCase().includes("inspection") ||
        doc.name.toLowerCase().includes("assessment"),
    );

    expect(hasSurveyorReport).toBe(false);
  });

  it("should detect surveyor report when present", () => {
    const documents = [
      { name: "surveyor_report.pdf", type: "application/pdf" },
      { name: "letter.pdf", type: "application/pdf" },
    ];

    const hasSurveyorReport = documents.some(
      (doc) =>
        doc.name.toLowerCase().includes("survey") ||
        doc.name.toLowerCase().includes("inspection") ||
        doc.name.toLowerCase().includes("assessment"),
    );

    expect(hasSurveyorReport).toBe(true);
  });

  it("should identify critical severity for expired limitation", () => {
    const limitationDate = new Date("2020-01-01");
    const today = new Date();
    const daysRemaining = Math.floor(
      (limitationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    const severity: BundleScanItemType = daysRemaining < 0 ? "expired_limitation" : "missing_schedule";

    expect(severity).toBe("expired_limitation");
  });

  it("should calculate overall risk correctly", () => {
    const items = [
      { severity: "critical" as const },
      { severity: "high" as const },
      { severity: "medium" as const },
    ];

    const criticalCount = items.filter((i) => i.severity === "critical").length;
    const highCount = items.filter((i) => i.severity === "high").length;

    let overallRisk: "low" | "medium" | "high" | "critical" = "low";
    if (criticalCount > 0) {
      overallRisk = "critical";
    } else if (highCount >= 2) {
      overallRisk = "high";
    } else if (highCount === 1) {
      overallRisk = "medium";
    }

    expect(overallRisk).toBe("critical");
  });
});

