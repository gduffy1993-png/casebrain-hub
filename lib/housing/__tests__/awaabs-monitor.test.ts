import { describe, it, expect } from "vitest";
import { calculateAwaabsLawStatus } from "../awaabs-monitor";
import type { HousingCaseRecord } from "@/types/housing";

function baseCase(overrides: Partial<HousingCaseRecord> = {}): HousingCaseRecord {
  return {
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
    ...overrides,
  };
}

describe("Awaab's Law Monitor", () => {
  it("should return 'none' risk for non-social landlord", () => {
    const status = calculateAwaabsLawStatus(baseCase(), "Test Case", {
      asOf: new Date("2024-01-15T12:00:00Z"),
    });

    expect(status.isSocialLandlord).toBe(false);
    expect(status.overallRisk).toBe("none");
  });

  it("should calculate investigation deadline for social landlord", () => {
    const asOf = new Date("2024-01-10T12:00:00Z"); // 9 days after report → 5 days until 14-day deadline
    const status = calculateAwaabsLawStatus(
      baseCase({
        landlord_name: "Council Housing",
        landlord_type: "social",
        first_report_date: "2024-01-01",
      }),
      "Social Case",
      { asOf },
    );

    expect(status.isSocialLandlord).toBe(true);
    expect(status.daysUntilInvestigationDeadline).toBe(5);
    expect(status.daysUntilInvestigationDeadline!).toBeLessThanOrEqual(14);
    expect(status.daysUntilInvestigationDeadline!).toBeGreaterThan(-365);
    expect(status.investigationDeadlineBreached).toBe(false);
  });

  it("should identify critical risk when deadline breached", () => {
    const asOf = new Date("2024-01-21T12:00:00Z"); // 20 days after report
    const status = calculateAwaabsLawStatus(
      baseCase({
        landlord_name: "Council Housing",
        landlord_type: "council",
        first_report_date: "2024-01-01",
      }),
      "Breached Case",
      { asOf },
    );

    expect(status.investigationDeadlineBreached).toBe(true);
    expect(status.daysUntilInvestigationDeadline).toBeLessThan(0);
    expect(status.overallRisk).toBe("critical");
  });
});
