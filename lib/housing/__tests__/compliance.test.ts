import { describe, it, expect } from "vitest";
import {
  checkAwaabsLaw,
  checkHhsrsCategory1,
  checkSection11Lta,
  checkLimitationPeriod,
  checkVulnerabilityFlags,
  checkNoAccessFlags,
  runHousingComplianceChecks,
} from "../compliance";

describe("Housing Compliance Checks", () => {
  describe("Awaab's Law", () => {
    it("should pass when investigation occurs within 14 days", () => {
      const firstReport = new Date("2024-01-01");
      const investigation = new Date("2024-01-10"); // 9 days later

      const checks = checkAwaabsLaw(
        firstReport,
        investigation,
        null,
        null,
        true, // isSocialLandlord
      );

      const investigationCheck = checks.find((c) => c.rule.includes("Investigation"));
      expect(investigationCheck).toBeDefined();
      expect(investigationCheck?.passed).toBe(true);
      expect(investigationCheck?.severity).toBe("low");
    });

    it("should fail when investigation exceeds 14 days", () => {
      const firstReport = new Date("2024-01-01");
      const investigation = new Date("2024-01-20"); // 19 days later

      const checks = checkAwaabsLaw(
        firstReport,
        investigation,
        null,
        null,
        true,
      );

      const investigationCheck = checks.find((c) => c.rule.includes("Investigation"));
      expect(investigationCheck).toBeDefined();
      expect(investigationCheck?.passed).toBe(false);
      expect(investigationCheck?.severity).toBe("high");
    });

    it("should fail when investigation deadline has passed without investigation", () => {
      const firstReport = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

      const checks = checkAwaabsLaw(firstReport, null, null, null, true);

      const investigationCheck = checks.find((c) => c.rule.includes("Investigation"));
      expect(investigationCheck).toBeDefined();
      expect(investigationCheck?.passed).toBe(false);
      expect(investigationCheck?.severity).toBe("critical");
    });

    it("should pass when work starts within 7 days of investigation", () => {
      const firstReport = new Date("2024-01-01");
      const investigation = new Date("2024-01-10");
      const workStart = new Date("2024-01-15"); // 5 days after investigation

      const checks = checkAwaabsLaw(
        firstReport,
        investigation,
        workStart,
        null,
        true,
      );

      const workStartCheck = checks.find((c) => c.rule.includes("Work Start"));
      expect(workStartCheck).toBeDefined();
      expect(workStartCheck?.passed).toBe(true);
    });

    it("should not apply to private landlords", () => {
      const firstReport = new Date("2024-01-01");
      const checks = checkAwaabsLaw(firstReport, null, null, null, false);

      expect(checks.length).toBe(0);
    });
  });

  describe("HHSRS Category 1", () => {
    it("should flag Category 1 hazards", () => {
      const checks = checkHhsrsCategory1(["damp", "mould", "structural"]);

      expect(checks.length).toBe(1);
      expect(checks[0].passed).toBe(false);
      expect(checks[0].severity).toBe("critical");
      expect(checks[0].details).toContain("damp");
    });

    it("should pass when no Category 1 hazards", () => {
      const checks = checkHhsrsCategory1(["electrical", "heating"]);

      expect(checks.length).toBe(1);
      expect(checks[0].passed).toBe(true);
      expect(checks[0].severity).toBe("low");
    });
  });

  describe("Section 11 LTA 1985", () => {
    it("should pass when repair completed within reasonable time (28 days)", () => {
      const defectReported = new Date("2024-01-01");
      const repairCompleted = new Date("2024-01-20"); // 19 days later

      const checks = checkSection11Lta(
        defectReported,
        repairCompleted,
        0, // noAccessDays
        1, // repairAttempts
        false, // isTenantVulnerable
      );

      const repairCheck = checks.find((c) => c.rule.includes("Repair Duty"));
      expect(repairCheck).toBeDefined();
      expect(repairCheck?.passed).toBe(true);
    });

    it("should use 14-day reasonable time for vulnerable tenants", () => {
      const defectReported = new Date("2024-01-01");
      const repairCompleted = new Date("2024-01-20"); // 19 days later

      const checks = checkSection11Lta(
        defectReported,
        repairCompleted,
        0,
        1,
        true, // isTenantVulnerable
      );

      const repairCheck = checks.find((c) => c.rule.includes("Repair Duty"));
      expect(repairCheck).toBeDefined();
      expect(repairCheck?.passed).toBe(false); // 19 days exceeds 14-day limit
      expect(repairCheck?.details).toContain("vulnerable tenant");
    });

    it("should flag excessive no-access days", () => {
      const checks = checkSection11Lta(
        new Date("2024-01-01"),
        null,
        95, // noAccessDays
        0,
        false,
      );

      const noAccessCheck = checks.find((c) => c.rule.includes("No Access"));
      expect(noAccessCheck).toBeDefined();
      expect(noAccessCheck?.passed).toBe(false);
      expect(noAccessCheck?.severity).toBe("critical");
    });

    it("should flag multiple failed repair attempts", () => {
      const checks = checkSection11Lta(
        new Date("2024-01-01"),
        null, // not completed
        0,
        4, // 4 repair attempts
        false,
      );

      const failedRepairsCheck = checks.find((c) => c.rule.includes("Failed Repairs"));
      expect(failedRepairsCheck).toBeDefined();
      expect(failedRepairsCheck?.passed).toBe(false);
      expect(failedRepairsCheck?.severity).toBe("high");
    });
  });

  describe("Limitation Period", () => {
    it("should flag critical risk when less than 6 months remaining", () => {
      const firstReport = new Date(Date.now() - 5.5 * 365 * 24 * 60 * 60 * 1000); // 5.5 years ago

      const check = checkLimitationPeriod(firstReport);

      expect(check.passed).toBe(true); // Still within 6 years
      expect(check.severity).toBe("high"); // Less than 6 months remaining
    });

    it("should flag expired limitation period", () => {
      const firstReport = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000); // 7 years ago

      const check = checkLimitationPeriod(firstReport);

      expect(check.passed).toBe(false);
      expect(check.severity).toBe("critical");
    });
  });

  describe("Vulnerability Flags", () => {
    it("should flag health risk for asthma with damp/mould", () => {
      const checks = checkVulnerabilityFlags(["asthma", "damp"], false);

      const healthRiskCheck = checks.find((c) => c.rule.includes("Health Risk"));
      expect(healthRiskCheck).toBeDefined();
      expect(healthRiskCheck?.severity).toBe("critical");
      expect(healthRiskCheck?.passed).toBe(false);
    });

    it("should flag enhanced duty for vulnerable tenants", () => {
      const checks = checkVulnerabilityFlags(["elderly", "mobility"], false);

      const enhancedDutyCheck = checks.find((c) => c.rule.includes("Enhanced Duty"));
      expect(enhancedDutyCheck).toBeDefined();
      expect(enhancedDutyCheck?.severity).toBe("high");
    });

    it("should flag critical for unfit habitation", () => {
      const checks = checkVulnerabilityFlags([], true);

      const enhancedDutyCheck = checks.find((c) => c.rule.includes("Enhanced Duty"));
      expect(enhancedDutyCheck).toBeDefined();
      expect(enhancedDutyCheck?.severity).toBe("critical");
    });
  });

  describe("No Access Flags", () => {
    it("should flag excessive no-access days", () => {
      const checks = checkNoAccessFlags(95, 3, new Date("2024-01-01"));

      const excessiveCheck = checks.find((c) => c.rule.includes("Excessive Days"));
      expect(excessiveCheck).toBeDefined();
      expect(excessiveCheck?.severity).toBe("critical");
      expect(excessiveCheck?.details).toContain("systematic obstruction");
    });

    it("should flag frequent no-access claims", () => {
      const checks = checkNoAccessFlags(45, 5, new Date("2024-01-01"));

      const frequentCheck = checks.find((c) => c.rule.includes("Frequent Claims"));
      expect(frequentCheck).toBeDefined();
      expect(frequentCheck?.severity).toBe("high");
    });

    it("should flag pattern when >50% of time is no-access", () => {
      const firstReport = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const checks = checkNoAccessFlags(60, 2, firstReport);

      const patternCheck = checks.find((c) => c.rule.includes("Pattern Analysis"));
      expect(patternCheck).toBeDefined();
      expect(patternCheck?.severity).toBe("critical");
      expect(patternCheck?.details).toContain("50%");
    });
  });

  describe("Comprehensive Compliance Check", () => {
    it("should run all checks for social landlord with vulnerable tenant", () => {
      const checks = runHousingComplianceChecks({
        firstReportDate: new Date("2024-01-01"),
        investigationDate: new Date("2024-01-20"), // Exceeds 14 days
        workStartDate: null,
        workCompleteDate: null,
        defectReportedDate: new Date("2024-01-01"),
        repairCompletedDate: null,
        noAccessDays: 95,
        noAccessCount: 5,
        repairAttempts: 3,
        hazards: ["damp", "mould"],
        isSocialLandlord: true,
        isTenantVulnerable: true,
        vulnerabilities: ["asthma", "elderly"],
        isUnfitForHabitation: false,
      });

      expect(checks.length).toBeGreaterThan(5);

      // Should have Awaab's Law check (social landlord)
      const awaabsCheck = checks.find((c) => c.rule.includes("Awaab"));
      expect(awaabsCheck).toBeDefined();

      // Should have HHSRS check
      const hhsrsCheck = checks.find((c) => c.rule.includes("HHSRS"));
      expect(hhsrsCheck).toBeDefined();

      // Should have Section 11 check
      const section11Check = checks.find((c) => c.rule.includes("Section 11"));
      expect(section11Check).toBeDefined();

      // Should have limitation check
      const limitationCheck = checks.find((c) => c.rule.includes("Limitation"));
      expect(limitationCheck).toBeDefined();

      // Should have vulnerability check
      const vulnerabilityCheck = checks.find((c) => c.rule.includes("Vulnerability"));
      expect(vulnerabilityCheck).toBeDefined();

      // Should have no-access check
      const noAccessCheck = checks.find((c) => c.rule.includes("No Access"));
      expect(noAccessCheck).toBeDefined();
    });

    it("should not run Awaab's Law for private landlords", () => {
      const checks = runHousingComplianceChecks({
        firstReportDate: new Date("2024-01-01"),
        investigationDate: null,
        workStartDate: null,
        workCompleteDate: null,
        defectReportedDate: new Date("2024-01-01"),
        repairCompletedDate: null,
        noAccessDays: 0,
        noAccessCount: 0,
        repairAttempts: 0,
        hazards: [],
        isSocialLandlord: false, // Private landlord
        isTenantVulnerable: false,
        vulnerabilities: [],
        isUnfitForHabitation: false,
      });

      const awaabsCheck = checks.find((c) => c.rule.includes("Awaab"));
      expect(awaabsCheck).toBeUndefined();
    });
  });
});

