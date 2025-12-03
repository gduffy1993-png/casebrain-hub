/**
 * HHSRS (Housing Health and Safety Rating System) compliance checks
 * and Awaab's Law compliance for housing disrepair cases
 */

export type HhsrsHazard = 
  | "damp"
  | "mould"
  | "leak"
  | "structural"
  | "heating"
  | "electrical"
  | "infestation"
  | "fire"
  | "fall"
  | "carbon_monoxide"
  | "asbestos"
  | "lead"
  | "noise"
  | "lighting"
  | "sanitation"
  | "water_supply";

export type ComplianceCheck = {
  rule: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  passed: boolean;
  details?: string;
};

/**
 * Check Awaab's Law compliance (social landlords must investigate within 14 days,
 * start work within 7 days of investigation, complete within reasonable time)
 * 
 * Awaab's Law (Social Housing (Regulation) Act 2023) applies to social landlords
 * and requires:
 * - Investigation within 14 days of report
 * - Work to start within 7 days of investigation
 * - Completion within reasonable time (guidance suggests 28 days for urgent repairs)
 */
export function checkAwaabsLaw(
  firstReportDate: Date | null,
  investigationDate: Date | null,
  workStartDate: Date | null,
  workCompleteDate: Date | null,
  isSocialLandlord: boolean,
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  if (!isSocialLandlord) {
    return checks; // Awaab's Law only applies to social landlords
  }

  if (!firstReportDate) {
    checks.push({
      rule: "Awaab's Law - First Report Date",
      description: "First report date must be recorded to assess Awaab's Law compliance",
      severity: "medium",
      passed: false,
      details: "No first report date available",
    });
    return checks;
  }

  const now = new Date();

  // Check 1: Investigation within 14 days
  if (investigationDate) {
    const daysToInvestigation = Math.floor(
      (investigationDate.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const passed = daysToInvestigation <= 14;
    checks.push({
      rule: "Awaab's Law - Investigation",
      description: "Social landlord must investigate within 14 days of report (Awaab's Law)",
      severity: daysToInvestigation > 21 ? "critical" : daysToInvestigation > 14 ? "high" : "low",
      passed,
      details: passed
        ? `Investigation occurred ${daysToInvestigation} days after first report (within 14-day limit)`
        : `Investigation occurred ${daysToInvestigation} days after first report (exceeds 14-day limit)`,
    });
  } else {
    // Check if deadline has passed
    const daysSinceReport = Math.floor(
      (now.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    checks.push({
      rule: "Awaab's Law - Investigation",
      description: "Social landlord must investigate within 14 days of report (Awaab's Law)",
      severity: daysSinceReport > 14 ? "critical" : "high",
      passed: false,
      details:
        daysSinceReport > 14
          ? `No investigation recorded. ${daysSinceReport} days since first report (deadline exceeded)`
          : `No investigation recorded. ${daysSinceReport} days since first report (deadline: ${14 - daysSinceReport} days remaining)`,
    });
  }

  // Check 2: Work started within 7 days of investigation
  if (investigationDate) {
    if (workStartDate) {
      const daysToStart = Math.floor(
        (workStartDate.getTime() - investigationDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const passed = daysToStart <= 7;
      checks.push({
        rule: "Awaab's Law - Work Start",
        description: "Work must start within 7 days of investigation (Awaab's Law)",
        severity: daysToStart > 14 ? "critical" : daysToStart > 7 ? "high" : "low",
        passed,
        details: passed
          ? `Work started ${daysToStart} days after investigation (within 7-day limit)`
          : `Work started ${daysToStart} days after investigation (exceeds 7-day limit)`,
      });
    } else {
      // Check if deadline has passed
      const daysSinceInvestigation = Math.floor(
        (now.getTime() - investigationDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      checks.push({
        rule: "Awaab's Law - Work Start",
        description: "Work must start within 7 days of investigation (Awaab's Law)",
        severity: daysSinceInvestigation > 7 ? "critical" : "high",
        passed: false,
        details:
          daysSinceInvestigation > 7
            ? `No work start recorded. ${daysSinceInvestigation} days since investigation (deadline exceeded)`
            : `No work start recorded. ${daysSinceInvestigation} days since investigation (deadline: ${7 - daysSinceInvestigation} days remaining)`,
      });
    }
  }

  // Check 3: Completion within reasonable time (28 days for urgent, 90 days for non-urgent)
  if (workStartDate) {
    if (workCompleteDate) {
      const daysToComplete = Math.floor(
        (workCompleteDate.getTime() - workStartDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      // For Category 1 hazards, 28 days is reasonable. For others, 90 days.
      const reasonableTime = 90; // Default to 90 days, can be adjusted based on hazard severity
      const passed = daysToComplete <= reasonableTime;
      checks.push({
        rule: "Awaab's Law - Completion",
        description: "Work should be completed within reasonable time (guidance: 28 days urgent, 90 days standard)",
        severity: daysToComplete > reasonableTime * 1.5 ? "high" : daysToComplete > reasonableTime ? "medium" : "low",
        passed,
        details: passed
          ? `Work completed ${daysToComplete} days after start (within reasonable time)`
          : `Work completed ${daysToComplete} days after start (exceeds reasonable time guidance)`,
      });
    } else {
      const daysSinceStart = Math.floor(
        (now.getTime() - workStartDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      checks.push({
        rule: "Awaab's Law - Completion",
        description: "Work should be completed within reasonable time (guidance: 28 days urgent, 90 days standard)",
        severity: daysSinceStart > 90 ? "high" : daysSinceStart > 28 ? "medium" : "low",
        passed: false,
        details: `Work not yet completed. ${daysSinceStart} days since work started`,
      });
    }
  }

  return checks;
}

/**
 * Check HHSRS Category 1 hazards (most serious - action must be taken)
 */
export function checkHhsrsCategory1(hazards: string[]): ComplianceCheck[] {
  const category1Hazards: HhsrsHazard[] = [
    "damp",
    "mould",
    "structural",
    "fire",
    "carbon_monoxide",
    "asbestos",
    "lead",
  ];

  const detected = hazards.filter((h) =>
    category1Hazards.includes(h as HhsrsHazard),
  );

  return [
    {
      rule: "HHSRS Category 1 Hazards",
      description: "Category 1 hazards require immediate action by landlord",
      severity: detected.length > 0 ? "critical" : "low",
      passed: detected.length === 0,
      details:
        detected.length > 0
          ? `Detected: ${detected.join(", ")}`
          : "No Category 1 hazards detected",
    },
  ];
}

/**
 * Check Section 11 LTA 1985 duty (landlord's repairing obligation)
 * 
 * Section 11 of the Landlord and Tenant Act 1985 imposes a duty on landlords to:
 * - Keep in repair the structure and exterior of the dwelling
 * - Keep in repair and proper working order installations for supply of water, gas, electricity, sanitation, space heating and heating water
 * 
 * This duty is ongoing and cannot be excluded or limited.
 */
export function checkSection11Lta(
  defectReportedDate: Date | null,
  repairCompletedDate: Date | null,
  noAccessDays: number,
  repairAttempts: number,
  isTenantVulnerable: boolean,
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  if (!defectReportedDate) {
    checks.push({
      rule: "Section 11 LTA 1985 - Defect Report",
      description: "Defect report date required to assess Section 11 compliance",
      severity: "medium",
      passed: false,
      details: "No defect report date available",
    });
    return checks;
  }

  const now = new Date();
  const daysSinceReport = Math.floor(
    (now.getTime() - defectReportedDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Check 1: Repair completion within reasonable time
  if (repairCompletedDate) {
    const daysToRepair = Math.floor(
      (repairCompletedDate.getTime() - defectReportedDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    // For vulnerable tenants or Category 1 hazards, 14 days is reasonable. For others, 28 days.
    const reasonableTime = isTenantVulnerable ? 14 : 28;
    const passed = daysToRepair <= reasonableTime;
    checks.push({
      rule: "Section 11 LTA 1985 - Repair Duty",
      description: `Landlord must keep property in good repair. Reasonable time: ${reasonableTime} days${isTenantVulnerable ? " (vulnerable tenant)" : ""}`,
      severity:
        daysToRepair > reasonableTime * 2
          ? "critical"
          : daysToRepair > reasonableTime
            ? "high"
            : daysToRepair > reasonableTime * 0.75
              ? "medium"
              : "low",
      passed,
      details: passed
        ? `Repair completed ${daysToRepair} days after report (within reasonable time)`
        : `Repair completed ${daysToRepair} days after report (exceeds reasonable time of ${reasonableTime} days)`,
    });
  } else {
    // No repair completed - check if reasonable time has passed
    const reasonableTime = isTenantVulnerable ? 14 : 28;
    const passed = daysSinceReport <= reasonableTime;
    checks.push({
      rule: "Section 11 LTA 1985 - Repair Duty",
      description: `Landlord must keep property in good repair. Reasonable time: ${reasonableTime} days${isTenantVulnerable ? " (vulnerable tenant)" : ""}`,
      severity:
        daysSinceReport > reasonableTime * 2
          ? "critical"
          : daysSinceReport > reasonableTime
            ? "high"
            : daysSinceReport > reasonableTime * 0.75
              ? "medium"
              : "low",
      passed,
      details: passed
        ? `Repair not yet completed. ${daysSinceReport} days since report (within reasonable time)`
        : `Repair not yet completed. ${daysSinceReport} days since report (exceeds reasonable time of ${reasonableTime} days)`,
    });
  }

  // Check 2: Excessive no-access claims (may indicate bad faith)
  if (noAccessDays > 0) {
    const passed = noAccessDays <= 30;
    checks.push({
      rule: "Section 11 LTA 1985 - No Access Pattern",
      description: "Excessive no-access claims may indicate bad faith or breach of duty",
      severity:
        noAccessDays > 90
          ? "critical"
          : noAccessDays > 60
            ? "high"
            : noAccessDays > 30
              ? "medium"
              : "low",
      passed,
      details: `${noAccessDays} total days claimed as no access${noAccessDays > 90 ? " - pattern suggests bad faith" : ""}`,
    });
  }

  // Check 3: Multiple failed repair attempts
  if (repairAttempts > 0 && !repairCompletedDate) {
    const passed = repairAttempts <= 2;
    checks.push({
      rule: "Section 11 LTA 1985 - Failed Repairs",
      description: "Multiple failed repair attempts may indicate breach of duty",
      severity: repairAttempts > 3 ? "high" : repairAttempts > 2 ? "medium" : "low",
      passed,
      details: `${repairAttempts} repair attempt(s) without successful completion`,
    });
  }

  return checks;
}

/**
 * Check limitation period (generally 6 years for breach of contract)
 */
export function checkLimitationPeriod(
  firstReportDate: Date | null,
  currentDate: Date = new Date(),
): ComplianceCheck {
  if (!firstReportDate) {
    return {
      rule: "Limitation Period",
      description: "6-year limitation period for breach of contract claims",
      severity: "medium",
      passed: false,
      details: "No first report date available",
    };
  }

  const yearsSinceReport = (currentDate.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  const yearsRemaining = 6 - yearsSinceReport;

  return {
    rule: "Limitation Period",
    description: "6-year limitation period for breach of contract claims",
    severity:
      yearsRemaining < 0.5
        ? "critical"
        : yearsRemaining < 1
          ? "high"
          : yearsRemaining < 2
            ? "medium"
            : "low",
    passed: yearsRemaining > 0,
    details:
      yearsRemaining > 0
        ? `${yearsRemaining.toFixed(1)} years remaining`
        : "Limitation period expired",
  };
}

/**
 * Check for vulnerability flags that may affect reasonable timeframes and duty of care
 */
export function checkVulnerabilityFlags(
  vulnerabilities: string[],
  isUnfitForHabitation: boolean,
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  if (vulnerabilities.length === 0 && !isUnfitForHabitation) {
    return checks;
  }

  const hasHighVulnerability =
    vulnerabilities.includes("elderly") ||
    vulnerabilities.includes("child") ||
    vulnerabilities.includes("pregnancy") ||
    vulnerabilities.includes("disability") ||
    isUnfitForHabitation;

  if (hasHighVulnerability) {
    checks.push({
      rule: "Vulnerability - Enhanced Duty",
      description: "Vulnerable tenant or unfit property requires enhanced duty of care and faster response times",
      severity: isUnfitForHabitation ? "critical" : "high",
      passed: true, // This is informational, not a failure
      details: `Vulnerabilities: ${vulnerabilities.join(", ")}${isUnfitForHabitation ? " | Property unfit for habitation" : ""}`,
    });
  }

  // Health-related vulnerabilities (asthma, respiratory) with damp/mould
  if (
    (vulnerabilities.includes("asthma") || vulnerabilities.includes("respiratory")) &&
    vulnerabilities.some((v) => v.includes("damp") || v.includes("mould"))
  ) {
    checks.push({
      rule: "Vulnerability - Health Risk",
      description: "Health-related vulnerability combined with damp/mould creates serious health risk",
      severity: "critical",
      passed: false,
      details: "Asthma/respiratory condition with damp/mould exposure - immediate action required",
    });
  }

  return checks;
}

/**
 * Check no-access flags and patterns
 */
export function checkNoAccessFlags(
  noAccessDays: number,
  noAccessCount: number,
  firstReportDate: Date | null,
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  if (noAccessDays === 0 && noAccessCount === 0) {
    return checks;
  }

  // Flag 1: Excessive total no-access days
  if (noAccessDays > 90) {
    checks.push({
      rule: "No Access - Excessive Days",
      description: "Excessive no-access days may indicate bad faith or breach of duty",
      severity: "critical",
      passed: false,
      details: `${noAccessDays} total days claimed as no access - pattern suggests systematic obstruction`,
    });
  } else if (noAccessDays > 60) {
    checks.push({
      rule: "No Access - Excessive Days",
      description: "High number of no-access days requires investigation",
      severity: "high",
      passed: false,
      details: `${noAccessDays} total days claimed as no access`,
    });
  }

  // Flag 2: Frequent no-access claims
  if (noAccessCount > 3) {
    checks.push({
      rule: "No Access - Frequent Claims",
      description: "Frequent no-access claims may indicate pattern of obstruction",
      severity: noAccessCount > 5 ? "high" : "medium",
      passed: false,
      details: `${noAccessCount} separate no-access claims recorded`,
    });
  }

  // Flag 3: No-access pattern relative to time since first report
  if (firstReportDate) {
    const daysSinceReport = Math.floor(
      (Date.now() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const noAccessPercentage = (noAccessDays / daysSinceReport) * 100;

    if (noAccessPercentage > 50 && daysSinceReport > 30) {
      checks.push({
        rule: "No Access - Pattern Analysis",
        description: "More than 50% of time claimed as no access suggests systematic obstruction",
        severity: "critical",
        passed: false,
        details: `${noAccessPercentage.toFixed(1)}% of time since first report (${noAccessDays} of ${daysSinceReport} days) claimed as no access`,
      });
    }
  }

  return checks;
}

/**
 * Comprehensive compliance check for housing disrepair case
 */
export function runHousingComplianceChecks(input: {
  firstReportDate: Date | null;
  investigationDate: Date | null;
  workStartDate: Date | null;
  workCompleteDate: Date | null;
  defectReportedDate: Date | null;
  repairCompletedDate: Date | null;
  noAccessDays: number;
  noAccessCount: number;
  repairAttempts: number;
  hazards: string[];
  isSocialLandlord: boolean;
  isTenantVulnerable: boolean;
  vulnerabilities: string[];
  isUnfitForHabitation: boolean;
}): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Awaab's Law (only for social landlords)
  if (input.isSocialLandlord) {
    checks.push(
      ...checkAwaabsLaw(
        input.firstReportDate,
        input.investigationDate,
        input.workStartDate,
        input.workCompleteDate,
        input.isSocialLandlord,
      ),
    );
  }

  // HHSRS Category 1
  checks.push(...checkHhsrsCategory1(input.hazards));

  // Section 11 LTA
  checks.push(
    ...checkSection11Lta(
      input.defectReportedDate,
      input.repairCompletedDate,
      input.noAccessDays,
      input.repairAttempts,
      input.isTenantVulnerable,
    ),
  );

  // Limitation period
  checks.push(checkLimitationPeriod(input.firstReportDate));

  // Vulnerability flags
  checks.push(
    ...checkVulnerabilityFlags(input.vulnerabilities, input.isUnfitForHabitation),
  );

  // No-access flags
  checks.push(
    ...checkNoAccessFlags(input.noAccessDays, input.noAccessCount, input.firstReportDate),
  );

  return checks;
}

