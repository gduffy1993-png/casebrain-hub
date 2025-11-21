import { describe, it, expect } from "vitest";
import { calculateLimitation } from "../limitation";

describe("calculateLimitation", () => {
  it("should calculate 6-year limitation for housing cases", () => {
    const incidentDate = "2019-01-01";
    const today = "2025-01-01"; // 6 years later

    const result = calculateLimitation({
      incidentDate,
      practiceArea: "housing",
      today,
    });

    expect(result.limitationDate).toBe("2025-01-01T00:00:00.000Z");
    expect(result.severity).toBe("critical");
    expect(result.isExpired).toBe(true);
    expect(result.daysRemaining).toBeLessThan(0);
    expect(result.explanation).toContain("procedural guidance only");
  });

  it("should calculate 3-year limitation for PI cases", () => {
    const incidentDate = "2022-01-01";
    const today = "2024-12-01"; // ~3 years later, but not expired

    const result = calculateLimitation({
      incidentDate,
      practiceArea: "pi_rta",
      today,
    });

    expect(result.limitationDate).toBe("2025-01-01T00:00:00.000Z");
    expect(result.severity).toBe("critical"); // Within 90 days
    expect(result.isExpired).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.daysRemaining).toBeLessThan(90);
  });

  it("should return medium severity when dates are missing", () => {
    const result = calculateLimitation({
      practiceArea: "housing",
    });

    expect(result.limitationDate).toBeUndefined();
    expect(result.severity).toBe("medium");
    expect(result.explanation).toContain("Insufficient data");
    expect(result.explanation).toContain("procedural guidance only");
  });

  it("should handle past limitation dates (expired)", () => {
    const incidentDate = "2015-01-01";
    const today = "2025-01-01"; // 10 years later

    const result = calculateLimitation({
      incidentDate,
      practiceArea: "housing",
      today,
    });

    expect(result.limitationDate).toBe("2021-01-01T00:00:00.000Z");
    expect(result.severity).toBe("critical");
    expect(result.isExpired).toBe(true);
    expect(result.daysRemaining).toBeLessThan(0);
  });

  it("should use date of knowledge if provided", () => {
    const incidentDate = "2019-01-01";
    const dateOfKnowledge = "2020-01-01"; // 1 year later
    const today = "2025-01-01";

    const result = calculateLimitation({
      incidentDate,
      dateOfKnowledge,
      practiceArea: "housing",
      today,
    });

    // Should use date of knowledge (2020) + 6 years = 2026
    expect(result.limitationDate).toBe("2026-01-01T00:00:00.000Z");
    expect(result.explanation).toContain("date of knowledge");
  });

  it("should detect minor claimants", () => {
    const incidentDate = "2020-01-01";
    const claimantDob = "2010-01-01"; // 10 years old at incident
    const today = "2025-01-01";

    const result = calculateLimitation({
      incidentDate,
      claimantDateOfBirth: claimantDob,
      practiceArea: "pi_rta",
      today,
    });

    expect(result.isMinor).toBe(true);
    expect(result.explanation).toContain("minor");
    expect(result.explanation).toContain("qualified legal assessment");
  });

  it("should set severity based on days remaining", () => {
    const incidentDate = "2022-01-01";
    const practiceArea = "pi_rta";

    // Test critical (< 90 days)
    const result1 = calculateLimitation({
      incidentDate,
      practiceArea,
      today: "2024-12-01", // ~30 days before limitation
    });
    expect(result1.severity).toBe("critical");

    // Test high (90-180 days)
    const result2 = calculateLimitation({
      incidentDate,
      practiceArea,
      today: "2024-09-01", // ~120 days before limitation
    });
    expect(result2.severity).toBe("high");

    // Test medium (180-365 days)
    const result3 = calculateLimitation({
      incidentDate,
      practiceArea,
      today: "2024-06-01", // ~210 days before limitation
    });
    expect(result3.severity).toBe("medium");

    // Test low (> 365 days)
    const result4 = calculateLimitation({
      incidentDate,
      practiceArea,
      today: "2023-06-01", // ~550 days before limitation
    });
    expect(result4.severity).toBe("low");
  });

  it("should handle invalid date formats gracefully", () => {
    const result = calculateLimitation({
      incidentDate: "invalid-date",
      practiceArea: "housing",
    });

    expect(result.severity).toBe("medium");
    expect(result.explanation).toContain("Invalid date format");
  });
});

