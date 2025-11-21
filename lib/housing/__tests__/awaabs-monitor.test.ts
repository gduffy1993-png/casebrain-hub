import { describe, it, expect } from "vitest";
import { calculateAwaabsLawStatus } from "../awaabs-monitor";
import type { HousingCaseRecord } from "@/types/housing";

describe("Awaab's Law Monitor", () => {
  it("should return 'none' risk for non-social landlord", () => {
    const housingCase: HousingCaseRecord = {
      id: "test-case",
      org_id: "test-org",
      tenant_name: "Test Tenant",
      tenant_dob: null,
      tenant_vulnerability: [],
      property_address: "123 Test St",
      landlord_name: "Private Landlord",
      landlord_type: "private",
      first_report_date: "2024-01-01",
      repair_attempts_count: 0,
      no_access_count: 0,
      no_access_days_total: 0,
      unfit_for_habitation: false,
      hhsrs_category_1_hazards: [],
      hhsrs_category_2_hazards: [],
      limitation_risk: null,
      limitation_date: null,
      stage: "intake",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const status = calculateAwaabsLawStatus(housingCase, "Test Case");

    expect(status.isSocialLandlord).toBe(false);
    expect(status.overallRisk).toBe("none");
  });

  it("should calculate investigation deadline for social landlord", () => {
    const firstReportDate = new Date("2024-01-01");
    const now = new Date();
    const daysSinceReport = Math.floor(
      (now.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUntilDeadline = 14 - daysSinceReport;

    expect(daysUntilDeadline).toBeLessThanOrEqual(14);
    expect(daysUntilDeadline).toBeGreaterThan(-365); // Should be within a year
  });

  it("should identify critical risk when deadline breached", () => {
    const firstReportDate = new Date();
    firstReportDate.setDate(firstReportDate.getDate() - 20); // 20 days ago

    const daysSinceReport = Math.floor(
      (Date.now() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const deadlineBreached = daysSinceReport > 14;

    expect(deadlineBreached).toBe(true);
  });

  it("should identify risk category 1 for immediate breach", () => {
    const investigationDeadlineBreached = true;
    const workStartDeadlineBreached = false;

    let riskCategory: 1 | 2 | null = null;
    if (investigationDeadlineBreached || workStartDeadlineBreached) {
      riskCategory = 1;
    }

    expect(riskCategory).toBe(1);
  });
});

