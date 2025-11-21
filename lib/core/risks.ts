/**
 * Core Litigation Brain - Risk Alert Generation
 * 
 * Converts compliance checks, limitation calculations, and other risk indicators
 * into standardised RiskAlert objects for display in the UI.
 */

import type { RiskAlert, RiskSeverity } from "./types";
import { riskCopy, type LimitationContext } from "./riskCopy";
import { calculateLimitation, type LimitationResult } from "./limitation";

/**
 * Convert limitation calculation result to RiskAlert
 */
export function limitationToRiskAlert(
  caseId: string,
  limitationResult: LimitationResult,
  contextSummary?: string, // Legacy: kept for backwards compatibility
  isMinor?: boolean,
  hasVulnerability?: boolean,
  context?: LimitationContext, // New structured context
): RiskAlert {
  // If structured context is provided, use it directly; otherwise build from legacy params
  const messageContext: LimitationContext | undefined = context 
    ? context  // Use provided context directly
    : (limitationResult.limitationDate || contextSummary
      ? {
          limitationDate: limitationResult.limitationDate,
          statusLabel: "Outstanding",
          // Parse legacy contextSummary if provided
          ...(contextSummary && contextSummary.includes("Category")
            ? {
                hazard: {
                  level: contextSummary.includes("Category 1") ? 1 : 2,
                  type: contextSummary
                    .split("Category")[1]
                    ?.split(":")[1]
                    ?.trim()
                    ?.split(",")[0]
                    ?.toLowerCase()
                    ?.replace(/\s+/g, "_") ?? "unknown",
                },
              }
            : {}),
        }
      : undefined);

  return {
    id: `limitation-${caseId}`,
    type: "limitation",
    severity: limitationResult.severity,
    title: riskCopy.limitation.title(limitationResult.severity),
    message: riskCopy.limitation.buildMessage({
      limitationDate: limitationResult.limitationDate,
      contextSummary, // Legacy fallback
      daysRemaining: limitationResult.daysRemaining,
      isExpired: limitationResult.isExpired,
      context: messageContext,
    }),
    deadlineDate: limitationResult.limitationDate,
    status: "outstanding",
    recommendedActions: riskCopy.limitation.defaultRecommendedActions({
      limitationDate: limitationResult.limitationDate,
      isMinor: isMinor ?? limitationResult.isMinor,
      hasVulnerability,
      isExpired: limitationResult.isExpired,
    }),
    sourceEvidence: limitationResult.limitationDate
      ? [`limitation_calculation_${caseId}`]
      : undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Convert Awaab's Law compliance check to RiskAlert
 */
export function awaabsLawToRiskAlert(
  caseId: string,
  check: {
    rule: string;
    passed: boolean;
    severity: RiskSeverity;
    details: string;
    deadlineDate?: Date;
    daysOverdue?: number;
    deadlineType?: "investigation" | "work_start" | "completion";
  },
): RiskAlert | null {
  if (check.passed && check.severity === "low") {
    return null; // Don't create alerts for low-severity passed checks
  }

  const ruleLower = check.rule.toLowerCase();
  const deadlineType =
    check.deadlineType ??
    (ruleLower.includes("investigation")
      ? "investigation"
      : ruleLower.includes("work start") || ruleLower.includes("work_start")
        ? "work_start"
        : "completion");

  return {
    id: `awaabs-${caseId}-${deadlineType}`,
    type: "awaabs_law",
    severity: check.severity,
    title: riskCopy.awaabs_law.title(check.severity),
    message: riskCopy.awaabs_law.buildMessage({
      deadlineType,
      deadlineDate: check.deadlineDate?.toISOString(),
      daysOverdue: check.daysOverdue,
    }),
    deadlineDate: check.deadlineDate?.toISOString(),
    status: "outstanding",
    recommendedActions: [
      {
        id: "verify-compliance",
        label: "Verify Awaab's Law compliance status",
        description:
          "Confirm whether the social landlord has complied with investigation and work start deadlines. Document any breaches.",
        priority: check.severity === "critical" ? "urgent" : "high",
      },
      {
        id: "consider-enforcement",
        label: "Consider enforcement action if deadline exceeded",
        description:
          "If deadlines have been exceeded, consider appropriate enforcement action or escalation. Review with qualified legal counsel.",
        priority: check.severity === "critical" ? "urgent" : "normal",
      },
    ],
    sourceEvidence: [`awaabs_compliance_${caseId}`],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Convert Section 11 LTA compliance check to RiskAlert
 */
export function section11ToRiskAlert(
  caseId: string,
  check: {
    rule: string;
    passed: boolean;
    severity: RiskSeverity;
    details: string;
    daysSinceReport?: number;
    reasonableTime?: number;
    isVulnerable?: boolean;
  },
): RiskAlert | null {
  if (check.passed && check.severity === "low") {
    return null; // Don't create alerts for low-severity passed checks
  }

  return {
    id: `section11-${caseId}`,
    type: "section_11",
    severity: check.severity,
    title: riskCopy.section_11.title(check.severity),
    message: riskCopy.section_11.buildMessage({
      daysSinceReport: check.daysSinceReport,
      reasonableTime: check.reasonableTime,
      isVulnerable: check.isVulnerable,
    }),
    status: "outstanding",
    recommendedActions: [
      {
        id: "monitor-repairs",
        label: "Monitor repair progress and landlord responses",
        description:
          "Track compliance with Section 11 LTA duty. Document all repair attempts, landlord responses, and any delays.",
        priority: check.severity === "critical" || check.severity === "high" ? "high" : "normal",
      },
      {
        id: "consider-escalation",
        label: "Consider escalation if reasonable time exceeded",
        description:
          "If reasonable time has been exceeded, consider sending pre-action protocol letter or escalating the matter.",
        priority: check.severity === "critical" ? "urgent" : "normal",
      },
    ],
    sourceEvidence: [`section11_compliance_${caseId}`],
    createdAt: new Date().toISOString(),
  };
}

