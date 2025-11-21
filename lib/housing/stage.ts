
import type { HousingCaseRecord, HousingDefect, HousingLandlordResponse } from "@/types";

/**
 * Housing Disrepair Stage Assessment
 * 
 * Determines the current litigation stage based on case data and timeline.
 */

export type HousingStage =
  | "intake"
  | "investigation"
  | "pre_action"
  | "litigation"
  | "settlement"
  | "closed";

export type StageAssessment = {
  stage: HousingStage;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  indicators: string[];
};

/**
 * Assess housing disrepair case stage
 */
export function assessHousingStage(
  housingCase: HousingCaseRecord,
  defects: HousingDefect[],
  landlordResponses: HousingLandlordResponse[],
  hasPreActionLetter: boolean,
  hasCourtAction: boolean,
  hasSettlement: boolean,
): StageAssessment {
  const indicators: string[] = [];
  let stage: HousingStage = "intake";
  let confidence: "high" | "medium" | "low" = "medium";

  // Check for closed/settled
  if (hasSettlement || housingCase.stage === "closed") {
    stage = hasSettlement ? "settlement" : "closed";
    confidence = "high";
    indicators.push(hasSettlement ? "Settlement reached" : "Case closed");
    return { stage, confidence, reasoning: "Case resolved or closed", indicators };
  }

  // Check for litigation
  if (hasCourtAction || housingCase.stage === "litigation") {
    stage = "litigation";
    confidence = "high";
    indicators.push("Court action commenced");
    return { stage, confidence, reasoning: "Case is in litigation", indicators };
  }

  // Check for pre-action
  if (hasPreActionLetter || housingCase.stage === "pre_action") {
    stage = "pre_action";
    confidence = "high";
    indicators.push("Pre-action protocol letter sent");
    return { stage, confidence, reasoning: "Pre-action protocol stage", indicators };
  }

  // Check for investigation stage
  const hasRepairAttempts = housingCase.repair_attempts_count > 0;
  const hasInvestigation = landlordResponses.some(
    (r) => r.response_type === "acknowledgement" || r.response_type === "repair_scheduled",
  );
  const daysSinceReport = housingCase.first_report_date
    ? Math.floor(
        (Date.now() - new Date(housingCase.first_report_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  if (hasRepairAttempts || hasInvestigation || daysSinceReport > 14) {
    stage = "investigation";
    confidence = hasRepairAttempts || hasInvestigation ? "high" : "medium";

    if (hasRepairAttempts) indicators.push(`${housingCase.repair_attempts_count} repair attempt(s)`);
    if (hasInvestigation) indicators.push("Landlord investigation/acknowledgement");
    if (daysSinceReport > 14) indicators.push(`${daysSinceReport} days since first report`);

    const reasoning = `Case in investigation phase${hasRepairAttempts ? " with repair attempts" : ""}${hasInvestigation ? " with landlord response" : ""}`;
    return { stage, confidence, reasoning, indicators };
  }

  // Default to intake
  stage = "intake";
  confidence = housingCase.first_report_date ? "high" : "low";
  indicators.push("Initial case intake");
  if (!housingCase.first_report_date) {
    indicators.push("Missing first report date");
  }

  return {
    stage,
    confidence,
    reasoning: "Case in initial intake phase - awaiting investigation/response",
    indicators,
  };
}

/**
 * Get recommended next actions based on stage
 */
export function getRecommendedActions(
  stage: HousingStage,
  housingCase: HousingCaseRecord,
  defects: HousingDefect[],
): Array<{ action: string; priority: "urgent" | "high" | "medium" | "low"; reason: string }> {
  const isSocialLandlord =
    housingCase.landlord_type === "social" || housingCase.landlord_type === "council";
  const actions: Array<{ action: string; priority: "urgent" | "high" | "medium" | "low"; reason: string }> = [];

  if (stage === "intake") {
    actions.push({
      action: "Send initial repair request letter",
      priority: "high",
      reason: "Formal request required to trigger landlord's duty under Section 11 LTA 1985",
    });

    if (isSocialLandlord) {
      actions.push({
        action: "Monitor Awaab's Law compliance (14-day investigation deadline)",
        priority: "urgent",
        reason: "Social landlords must investigate within 14 days under Awaab's Law",
      });
    }

    if (defects.some((d) => d.hhsrs_category === "category_1")) {
      actions.push({
        action: "Flag Category 1 HHSRS hazards - immediate action required",
        priority: "urgent",
        reason: "Category 1 hazards require immediate action by landlord",
      });
    }
  } else if (stage === "investigation") {
    actions.push({
      action: "Monitor repair progress and landlord responses",
      priority: "high",
      reason: "Track compliance with Section 11 LTA duty and Awaab's Law (if applicable)",
    });

    if (housingCase.no_access_days_total > 30) {
      actions.push({
        action: "Investigate no-access pattern - may indicate bad faith",
        priority: "high",
        reason: `${housingCase.no_access_days_total} days claimed as no access`,
      });
    }

    if (housingCase.repair_attempts_count > 2 && defects.some((d) => !d.repair_successful)) {
      actions.push({
        action: "Consider escalation - multiple failed repair attempts",
        priority: "medium",
        reason: "Multiple failed repairs may indicate breach of duty",
      });
    }
  } else if (stage === "pre_action") {
    actions.push({
      action: "Prepare pre-action protocol letter",
      priority: "high",
      reason: "Required before commencing proceedings",
    });

    actions.push({
      action: "Consider ADR/mediation",
      priority: "medium",
      reason: "Pre-action protocol encourages ADR before litigation",
    });
  } else if (stage === "litigation") {
    actions.push({
      action: "Prepare disclosure list",
      priority: "high",
      reason: "CPR disclosure requirements",
    });

    actions.push({
      action: "Consider expert evidence (surveyor, medical if applicable)",
      priority: "medium",
      reason: "Expert evidence may be required for quantum and causation",
    });
  }

  // Limitation period check (applies to all stages)
  if (housingCase.limitation_risk === "critical" || housingCase.limitation_risk === "high") {
    actions.push({
      action: "URGENT: Limitation period expiring - issue proceedings or seek extension",
      priority: "urgent",
      reason: housingCase.limitation_date
        ? `Limitation date: ${new Date(housingCase.limitation_date).toLocaleDateString("en-GB")}`
        : "Limitation period assessment required",
    });
  }

  return actions;
}

