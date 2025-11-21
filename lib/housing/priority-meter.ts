"use server";

/**
 * Tenant Vulnerability & Priority Meter
 * 
 * Automatically detects:
 * - Children in property
 * - Elderly tenants
 * - Asthma, COPD, mould-linked health issues
 * - Pregnancy
 * - Special medical factors
 * - Severe hazard + health cross-risk
 * 
 * Ranks cases: Low / Medium / High / Emergency Priority
 */

import type { HousingCaseRecord } from "@/types";

export type VulnerabilityFactor = {
  type:
    | "child"
    | "elderly"
    | "pregnancy"
    | "asthma"
    | "copd"
    | "respiratory"
    | "disability"
    | "mobility_impairment"
    | "mental_health"
    | "other_medical";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
};

export type PriorityScore = {
  caseId: string;
  caseTitle: string;
  overallPriority: "low" | "medium" | "high" | "emergency";
  priorityScore: number; // 0-100
  vulnerabilityFactors: VulnerabilityFactor[];
  hazardSeverity: "none" | "low" | "medium" | "high" | "critical";
  crossRisk: boolean; // Health vulnerability + relevant hazard (e.g., asthma + damp)
  reasoning: string;
  recommendedUrgency: "standard" | "expedited" | "urgent" | "emergency";
};

/**
 * Calculate priority score for a housing case
 */
export function calculatePriorityScore(
  housingCase: HousingCaseRecord,
  caseTitle: string,
): PriorityScore {
  const vulnerabilities = housingCase.tenant_vulnerability ?? [];
  const hasCategory1Hazard = (housingCase.hhsrs_category_1_hazards?.length ?? 0) > 0;
  const hasCategory2Hazard = (housingCase.hhsrs_category_2_hazards?.length ?? 0) > 0;
  const isUnfitForHabitation = housingCase.unfit_for_habitation ?? false;
  const hasDampMould = (housingCase.hhsrs_category_1_hazards ?? []).some(
    (h) => h.toLowerCase().includes("damp") || h.toLowerCase().includes("mould"),
  );

  // Detect vulnerability factors
  const vulnerabilityFactors: VulnerabilityFactor[] = [];
  let priorityScore = 0;

  // Child detection
  if (vulnerabilities.some((v) => v.toLowerCase().includes("child") || v.toLowerCase().includes("minor"))) {
    vulnerabilityFactors.push({
      type: "child",
      severity: hasCategory1Hazard || isUnfitForHabitation ? "critical" : "high",
      description: "Children present in property",
    });
    priorityScore += hasCategory1Hazard || isUnfitForHabitation ? 30 : 15;
  }

  // Elderly detection
  if (vulnerabilities.some((v) => v.toLowerCase().includes("elderly") || v.toLowerCase().includes("senior"))) {
    vulnerabilityFactors.push({
      type: "elderly",
      severity: hasCategory1Hazard || isUnfitForHabitation ? "critical" : "high",
      description: "Elderly tenant(s)",
    });
    priorityScore += hasCategory1Hazard || isUnfitForHabitation ? 25 : 12;
  }

  // Pregnancy detection
  if (vulnerabilities.some((v) => v.toLowerCase().includes("pregnancy") || v.toLowerCase().includes("pregnant"))) {
    vulnerabilityFactors.push({
      type: "pregnancy",
      severity: hasCategory1Hazard || hasDampMould ? "critical" : "high",
      description: "Pregnant tenant",
    });
    priorityScore += hasCategory1Hazard || hasDampMould ? 35 : 18;
  }

  // Asthma detection
  if (vulnerabilities.some((v) => v.toLowerCase().includes("asthma"))) {
    const severity = hasDampMould ? "critical" : hasCategory1Hazard ? "high" : "medium";
    vulnerabilityFactors.push({
      type: "asthma",
      severity,
      description: "Tenant has asthma",
    });
    priorityScore += hasDampMould ? 40 : hasCategory1Hazard ? 20 : 10;
  }

  // COPD detection
  if (vulnerabilities.some((v) => v.toLowerCase().includes("copd"))) {
    const severity = hasDampMould ? "critical" : hasCategory1Hazard ? "high" : "medium";
    vulnerabilityFactors.push({
      type: "copd",
      severity,
      description: "Tenant has COPD",
    });
    priorityScore += hasDampMould ? 40 : hasCategory1Hazard ? 20 : 10;
  }

  // General respiratory
  if (vulnerabilities.some((v) => v.toLowerCase().includes("respiratory"))) {
    const severity = hasDampMould ? "critical" : hasCategory1Hazard ? "high" : "medium";
    vulnerabilityFactors.push({
      type: "respiratory",
      severity,
      description: "Respiratory condition",
    });
    priorityScore += hasDampMould ? 35 : hasCategory1Hazard ? 18 : 8;
  }

  // Disability
  if (vulnerabilities.some((v) => v.toLowerCase().includes("disability"))) {
    vulnerabilityFactors.push({
      type: "disability",
      severity: hasCategory1Hazard || isUnfitForHabitation ? "high" : "medium",
      description: "Tenant has disability",
    });
    priorityScore += hasCategory1Hazard || isUnfitForHabitation ? 20 : 10;
  }

  // Mobility impairment
  if (vulnerabilities.some((v) => v.toLowerCase().includes("mobility"))) {
    vulnerabilityFactors.push({
      type: "mobility_impairment",
      severity: hasCategory1Hazard || isUnfitForHabitation ? "high" : "medium",
      description: "Mobility impairment",
    });
    priorityScore += hasCategory1Hazard || isUnfitForHabitation ? 18 : 8;
  }

  // Mental health
  if (vulnerabilities.some((v) => v.toLowerCase().includes("mental"))) {
    vulnerabilityFactors.push({
      type: "mental_health",
      severity: hasCategory1Hazard || isUnfitForHabitation ? "high" : "medium",
      description: "Mental health condition",
    });
    priorityScore += hasCategory1Hazard || isUnfitForHabitation ? 15 : 7;
  }

  // Other medical
  const otherMedical = vulnerabilities.filter(
    (v) =>
      !v.toLowerCase().includes("child") &&
      !v.toLowerCase().includes("elderly") &&
      !v.toLowerCase().includes("pregnancy") &&
      !v.toLowerCase().includes("asthma") &&
      !v.toLowerCase().includes("copd") &&
      !v.toLowerCase().includes("respiratory") &&
      !v.toLowerCase().includes("disability") &&
      !v.toLowerCase().includes("mobility") &&
      !v.toLowerCase().includes("mental"),
  );
  
  if (otherMedical.length > 0) {
    vulnerabilityFactors.push({
      type: "other_medical",
      severity: hasCategory1Hazard ? "high" : "medium",
      description: `Other medical factors: ${otherMedical.join(", ")}`,
    });
    priorityScore += hasCategory1Hazard ? 12 : 5;
  }

  // Hazard severity scoring
  let hazardSeverity: PriorityScore["hazardSeverity"] = "none";
  if (isUnfitForHabitation) {
    hazardSeverity = "critical";
    priorityScore += 50;
  } else if (hasCategory1Hazard) {
    hazardSeverity = "critical";
    priorityScore += 40;
  } else if (hasCategory2Hazard) {
    hazardSeverity = "high";
    priorityScore += 20;
  } else if ((housingCase.hhsrs_category_2_hazards?.length ?? 0) > 0) {
    hazardSeverity = "medium";
    priorityScore += 10;
  }

  // Cross-risk detection (health vulnerability + relevant hazard)
  const hasHealthVulnerability = vulnerabilityFactors.some(
    (f) => f.type === "asthma" || f.type === "copd" || f.type === "respiratory",
  );
  const crossRisk = hasHealthVulnerability && hasDampMould;
  
  if (crossRisk) {
    priorityScore += 25; // Significant cross-risk bonus
  }

  // Cap score at 100
  priorityScore = Math.min(100, priorityScore);

  // Determine overall priority
  let overallPriority: PriorityScore["overallPriority"];
  let recommendedUrgency: PriorityScore["recommendedUrgency"];

  if (priorityScore >= 80 || (crossRisk && hasCategory1Hazard)) {
    overallPriority = "emergency";
    recommendedUrgency = "emergency";
  } else if (priorityScore >= 60 || (hasCategory1Hazard && vulnerabilityFactors.length > 0)) {
    overallPriority = "high";
    recommendedUrgency = "urgent";
  } else if (priorityScore >= 40 || hasCategory1Hazard || vulnerabilityFactors.length > 0) {
    overallPriority = "high";
    recommendedUrgency = "expedited";
  } else if (priorityScore >= 20 || hasCategory2Hazard) {
    overallPriority = "medium";
    recommendedUrgency = "expedited";
  } else {
    overallPriority = "low";
    recommendedUrgency = "standard";
  }

  // Build reasoning
  const reasoningParts: string[] = [];
  
  if (crossRisk) {
    reasoningParts.push("CRITICAL CROSS-RISK: Health vulnerability combined with damp/mould hazard.");
  }
  
  if (isUnfitForHabitation) {
    reasoningParts.push("Property declared unfit for habitation.");
  }
  
  if (hasCategory1Hazard) {
    reasoningParts.push("Category 1 HHSRS hazards present.");
  }
  
  if (vulnerabilityFactors.length > 0) {
    reasoningParts.push(
      `Vulnerability factors detected: ${vulnerabilityFactors.map((f) => f.type).join(", ")}.`,
    );
  }
  
  if (reasoningParts.length === 0) {
    reasoningParts.push("Standard priority case - no exceptional risk factors detected.");
  }

  return {
    caseId: housingCase.id,
    caseTitle,
    overallPriority,
    priorityScore,
    vulnerabilityFactors,
    hazardSeverity,
    crossRisk,
    reasoning: reasoningParts.join(" "),
    recommendedUrgency,
  };
}

