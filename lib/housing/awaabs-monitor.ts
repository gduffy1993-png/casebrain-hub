"use server";

/**
 * Awaab's Law Trigger Monitor
 * 
 * Automatically calculates:
 * - Days until legal duty breach
 * - Risk category (1 or 2)
 * - Expected response window
 * - Missed landlord deadlines
 * - Enforcement checklist
 * 
 * This is a critical compliance feature for housing teams.
 */

import type { HousingCaseRecord } from "@/types";

export type AwaabsLawStatus = {
  caseId: string;
  caseTitle: string;
  isSocialLandlord: boolean;
  firstReportDate: Date | null;
  investigationDate: Date | null;
  workStartDate: Date | null;
  workCompleteDate: Date | null;
  
  // Countdown metrics
  daysUntilInvestigationDeadline: number | null; // Days until 14-day deadline
  daysUntilWorkStartDeadline: number | null; // Days until 7-day deadline (if investigated)
  daysUntilCompletionDeadline: number | null; // Days until reasonable completion
  
  // Status flags
  investigationDeadlineBreached: boolean;
  workStartDeadlineBreached: boolean;
  completionDeadlineBreached: boolean;
  
  // Risk assessment
  overallRisk: "none" | "low" | "medium" | "high" | "critical";
  riskCategory: 1 | 2 | null; // 1 = immediate breach, 2 = approaching breach
  
  // Enforcement checklist
  enforcementChecklist: Array<{
    item: string;
    status: "pending" | "completed" | "overdue";
    deadline?: Date;
    priority: "urgent" | "high" | "medium";
  }>;
  
  // Summary
  summary: string;
  recommendedActions: string[];
};

/**
 * Calculate Awaab's Law status for a housing case
 */
export function calculateAwaabsLawStatus(
  housingCase: HousingCaseRecord,
  caseTitle: string,
): AwaabsLawStatus {
  const isSocialLandlord =
    housingCase.landlord_type === "social" || housingCase.landlord_type === "council";
  
  if (!isSocialLandlord) {
    return {
      caseId: housingCase.id,
      caseTitle,
      isSocialLandlord: false,
      firstReportDate: housingCase.first_report_date ? new Date(housingCase.first_report_date) : null,
      investigationDate: null,
      workStartDate: null,
      workCompleteDate: null,
      daysUntilInvestigationDeadline: null,
      daysUntilWorkStartDeadline: null,
      daysUntilCompletionDeadline: null,
      investigationDeadlineBreached: false,
      workStartDeadlineBreached: false,
      completionDeadlineBreached: false,
      overallRisk: "none",
      riskCategory: null,
      enforcementChecklist: [],
      summary: "Awaab's Law applies only to social landlords. This case does not fall under Awaab's Law requirements.",
      recommendedActions: [],
    };
  }

  const now = new Date();
  const firstReportDate = housingCase.first_report_date
    ? new Date(housingCase.first_report_date)
    : null;
  // Note: investigation_date, work_start_date, work_complete_date are not yet in schema
  // These should be added to housing_cases table for full Awaab's Law monitoring
  // For now, we'll use null and the monitor will still calculate deadlines based on first_report_date
  // TODO: Add investigation_date, work_start_date, work_complete_date to housing_cases schema
  const investigationDate = null as Date | null;
  const workStartDate = null as Date | null;
  const workCompleteDate = null as Date | null;

  // Calculate days until investigation deadline (14 days from first report)
  let daysUntilInvestigationDeadline: number | null = null;
  let investigationDeadlineBreached = false;
  
  if (firstReportDate !== null) {
    if (investigationDate !== null) {
      const invDate: Date = investigationDate; // Type assertion for narrowing
      const daysToInvestigation = Math.floor(
        (invDate.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      investigationDeadlineBreached = daysToInvestigation > 14;
      daysUntilInvestigationDeadline = investigationDeadlineBreached ? -(daysToInvestigation - 14) : 14 - daysToInvestigation;
    } else {
      const daysSinceReport = Math.floor(
        (now.getTime() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysUntilInvestigationDeadline = 14 - daysSinceReport;
      investigationDeadlineBreached = daysSinceReport > 14;
    }
  }

  // Calculate days until work start deadline (7 days from investigation)
  let daysUntilWorkStartDeadline: number | null = null;
  let workStartDeadlineBreached = false;
  
  if (investigationDate !== null) {
    const invDate: Date = investigationDate; // Type assertion for narrowing
    if (workStartDate !== null) {
      const wsDate: Date = workStartDate; // Type assertion for narrowing
      const daysToStart = Math.floor(
        (wsDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      workStartDeadlineBreached = daysToStart > 7;
      daysUntilWorkStartDeadline = workStartDeadlineBreached ? -(daysToStart - 7) : 7 - daysToStart;
    } else {
      const daysSinceInvestigation = Math.floor(
        (now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysUntilWorkStartDeadline = 7 - daysSinceInvestigation;
      workStartDeadlineBreached = daysSinceInvestigation > 7;
    }
  }

  // Calculate days until completion deadline (28 days for urgent, 90 days standard)
  let daysUntilCompletionDeadline: number | null = null;
  let completionDeadlineBreached = false;
  
  const hasCategory1Hazard = (housingCase.hhsrs_category_1_hazards?.length ?? 0) > 0;
  const reasonableCompletionTime = hasCategory1Hazard ? 28 : 90;
  
  if (workStartDate !== null) {
    const wsDate: Date = workStartDate; // Type assertion for narrowing
    if (workCompleteDate !== null) {
      const wcDate: Date = workCompleteDate; // Type assertion for narrowing
      const daysToComplete = Math.floor(
        (wcDate.getTime() - wsDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      completionDeadlineBreached = daysToComplete > reasonableCompletionTime;
      daysUntilCompletionDeadline = completionDeadlineBreached
        ? -(daysToComplete - reasonableCompletionTime)
        : reasonableCompletionTime - daysToComplete;
    } else {
      const daysSinceStart = Math.floor(
        (now.getTime() - wsDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysUntilCompletionDeadline = reasonableCompletionTime - daysSinceStart;
      completionDeadlineBreached = daysSinceStart > reasonableCompletionTime;
    }
  }

  // Determine overall risk
  let overallRisk: AwaabsLawStatus["overallRisk"] = "none";
  let riskCategory: 1 | 2 | null = null;
  
  if (investigationDeadlineBreached || workStartDeadlineBreached) {
    overallRisk = "critical";
    riskCategory = 1;
  } else if (completionDeadlineBreached) {
    overallRisk = "high";
    riskCategory = 1;
  } else if (daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 3) {
    overallRisk = "critical";
    riskCategory = 1;
  } else if (daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 7) {
    overallRisk = "high";
    riskCategory = 2;
  } else if (daysUntilWorkStartDeadline !== null && daysUntilWorkStartDeadline <= 2) {
    overallRisk = "high";
    riskCategory = 2;
  } else if (
    daysUntilInvestigationDeadline !== null &&
    daysUntilInvestigationDeadline > 0 &&
    daysUntilInvestigationDeadline <= 10
  ) {
    overallRisk = "medium";
    riskCategory = 2;
  }

  // Build enforcement checklist
  const enforcementChecklist: AwaabsLawStatus["enforcementChecklist"] = [];
  
  if (firstReportDate !== null) {
    const investigationDeadline = new Date(firstReportDate);
    investigationDeadline.setDate(investigationDeadline.getDate() + 14);
    
    enforcementChecklist.push({
      item: "Investigation must be completed",
      status: investigationDate !== null
        ? investigationDeadlineBreached
          ? "overdue"
          : "completed"
        : investigationDeadlineBreached
          ? "overdue"
          : "pending",
      deadline: investigationDeadline,
      priority: investigationDeadlineBreached || (daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 3)
        ? "urgent"
        : daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 7
          ? "high"
          : "medium",
    });
  }

  if (investigationDate !== null) {
    const workStartDeadline = new Date(investigationDate);
    workStartDeadline.setDate(workStartDeadline.getDate() + 7);
    
    enforcementChecklist.push({
      item: "Work must start",
      status: workStartDate !== null
        ? workStartDeadlineBreached
          ? "overdue"
          : "completed"
        : workStartDeadlineBreached
          ? "overdue"
          : "pending",
      deadline: workStartDeadline,
      priority: workStartDeadlineBreached || (daysUntilWorkStartDeadline !== null && daysUntilWorkStartDeadline <= 2)
        ? "urgent"
        : daysUntilWorkStartDeadline !== null && daysUntilWorkStartDeadline <= 4
          ? "high"
          : "medium",
    });
  }

  if (workStartDate !== null) {
    const completionDeadline = new Date(workStartDate);
    completionDeadline.setDate(completionDeadline.getDate() + reasonableCompletionTime);
    
    enforcementChecklist.push({
      item: `Work must be completed (${reasonableCompletionTime} days for ${hasCategory1Hazard ? "Category 1 hazard" : "standard repair"})`,
      status: workCompleteDate !== null
        ? completionDeadlineBreached
          ? "overdue"
          : "completed"
        : completionDeadlineBreached
          ? "overdue"
          : "pending",
      deadline: completionDeadline,
      priority: completionDeadlineBreached
        ? "urgent"
        : daysUntilCompletionDeadline !== null && daysUntilCompletionDeadline <= 7
          ? "high"
          : "medium",
    });
  }

  // Build summary
  const summaryParts: string[] = [];
  if (investigationDeadlineBreached) {
    summaryParts.push(
      `CRITICAL: Investigation deadline breached by ${Math.abs(daysUntilInvestigationDeadline ?? 0)} days.`,
    );
  } else if (daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 3) {
    summaryParts.push(
      `URGENT: Investigation deadline in ${daysUntilInvestigationDeadline} days.`,
    );
  }
  
  if (workStartDeadlineBreached) {
    summaryParts.push(
      `CRITICAL: Work start deadline breached by ${Math.abs(daysUntilWorkStartDeadline ?? 0)} days.`,
    );
  } else if (daysUntilWorkStartDeadline !== null && daysUntilWorkStartDeadline <= 2) {
    summaryParts.push(
      `URGENT: Work start deadline in ${daysUntilWorkStartDeadline} days.`,
    );
  }
  
  if (completionDeadlineBreached) {
    summaryParts.push(
      `Work completion deadline breached by ${Math.abs(daysUntilCompletionDeadline ?? 0)} days.`,
    );
  }

  if (summaryParts.length === 0) {
    summaryParts.push("All Awaab's Law deadlines are currently met or not yet due.");
  }

  // Recommended actions
  const recommendedActions: string[] = [];
  
  if (investigationDeadlineBreached || (daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 3)) {
    recommendedActions.push("Issue formal notice to landlord regarding investigation deadline breach");
    recommendedActions.push("Consider enforcement action or referral to regulator");
  }
  
  if (workStartDeadlineBreached || (daysUntilWorkStartDeadline !== null && daysUntilWorkStartDeadline <= 2)) {
    recommendedActions.push("Escalate to senior management - work start deadline at risk");
    recommendedActions.push("Prepare enforcement documentation");
  }
  
  if (completionDeadlineBreached) {
    recommendedActions.push("Review completion timeline and consider enforcement action");
  }
  
  if (recommendedActions.length === 0) {
    recommendedActions.push("Monitor deadlines and ensure compliance is maintained");
  }

  return {
    caseId: housingCase.id,
    caseTitle,
    isSocialLandlord: true,
    firstReportDate,
    investigationDate,
    workStartDate,
    workCompleteDate,
    daysUntilInvestigationDeadline,
    daysUntilWorkStartDeadline,
    daysUntilCompletionDeadline,
    investigationDeadlineBreached,
    workStartDeadlineBreached,
    completionDeadlineBreached,
    overallRisk,
    riskCategory,
    enforcementChecklist,
    summary: summaryParts.join(" "),
    recommendedActions,
  };
}

