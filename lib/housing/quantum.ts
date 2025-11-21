
import type { HousingCaseRecord, HousingDefect } from "@/types";

/**
 * Housing Disrepair Quantum Calculator
 * 
 * Calculates damages ranges based on:
 * - Defect severity and duration
 * - Tenant vulnerability
 * - Property condition (unfit for habitation)
 * - Medical evidence
 * - Special damages (heating costs, alternative accommodation, etc.)
 */

export type QuantumHead = {
  category: string;
  description: string;
  amount: number;
  range?: { min: number; max: number };
  evidence: string[];
  confidence: "high" | "medium" | "low";
};

export type QuantumCalculation = {
  generalDamages: {
    baseRange: { min: number; max: number };
    adjustment: string;
    finalRange: { min: number; max: number };
    reasoning: string;
  };
  specialDamages: QuantumHead[];
  futureLoss?: QuantumHead[];
  totalRange: { min: number; max: number };
  confidence: "high" | "medium" | "low";
  disclaimer: string;
};

/**
 * Calculate general damages based on case factors
 * 
 * Base ranges (approximate, based on case law):
 * - Minor disrepair, short duration: £500-£2,000
 * - Moderate disrepair, medium duration: £2,000-£5,000
 * - Severe disrepair, long duration: £5,000-£15,000
 * - Unfit for habitation: £15,000-£30,000+
 * 
 * Adjustments:
 * - Vulnerable tenant: +25-50%
 * - Category 1 hazards: +50-100%
 * - Health impact (asthma + damp/mould): +50-100%
 * - Long duration (>2 years): +25-50%
 */
export function calculateGeneralDamages(
  housingCase: HousingCaseRecord,
  defects: HousingDefect[],
  hasMedicalEvidence: boolean,
): QuantumCalculation["generalDamages"] {
  const hasCategory1 = housingCase.hhsrs_category_1_hazards.length > 0;
  const isUnfit = housingCase.unfit_for_habitation;
  const isVulnerable = housingCase.tenant_vulnerability.length > 0;
  const hasHealthRisk =
    housingCase.tenant_vulnerability.includes("asthma") &&
    housingCase.hhsrs_category_1_hazards.some((h) => h === "damp" || h === "mould");

  // Calculate duration
  const firstReport = housingCase.first_report_date
    ? new Date(housingCase.first_report_date)
    : null;
  const durationYears = firstReport
    ? (Date.now() - firstReport.getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0;

  // Base range based on severity
  let baseRange: { min: number; max: number };
  if (isUnfit) {
    baseRange = { min: 15000, max: 30000 };
  } else if (hasCategory1) {
    baseRange = { min: 5000, max: 15000 };
  } else {
    const severeDefects = defects.filter((d) => d.severity === "severe" || d.severity === "critical");
    if (severeDefects.length > 0) {
      baseRange = { min: 2000, max: 5000 };
    } else {
      baseRange = { min: 500, max: 2000 };
    }
  }

  // Apply adjustments
  const adjustments: string[] = [];
  let adjustmentMultiplier = 1;

  if (hasHealthRisk && hasMedicalEvidence) {
    adjustmentMultiplier *= 1.75; // +75% for health impact with medical evidence
    adjustments.push("Health impact (asthma + damp/mould) with medical evidence: +75%");
  } else if (hasHealthRisk) {
    adjustmentMultiplier *= 1.5; // +50% for health risk without medical evidence
    adjustments.push("Health risk (asthma + damp/mould): +50%");
  }

  if (isVulnerable) {
    adjustmentMultiplier *= 1.35; // +35% for vulnerable tenant
    adjustments.push("Vulnerable tenant: +35%");
  }

  if (hasCategory1) {
    adjustmentMultiplier *= 1.5; // +50% for Category 1 hazards
    adjustments.push("Category 1 HHSRS hazards: +50%");
  }

  if (durationYears > 2) {
    adjustmentMultiplier *= 1.35; // +35% for long duration
    adjustments.push(`Long duration (${durationYears.toFixed(1)} years): +35%`);
  } else if (durationYears > 1) {
    adjustmentMultiplier *= 1.15; // +15% for medium duration
    adjustments.push(`Medium duration (${durationYears.toFixed(1)} years): +15%`);
  }

  const finalRange = {
    min: Math.round(baseRange.min * adjustmentMultiplier),
    max: Math.round(baseRange.max * adjustmentMultiplier),
  };

  return {
    baseRange,
    adjustment: adjustments.join("; "),
    finalRange,
    reasoning: `Base range: £${baseRange.min.toLocaleString()}-£${baseRange.max.toLocaleString()} based on ${isUnfit ? "unfit for habitation" : hasCategory1 ? "Category 1 hazards" : "defect severity"}. Adjustments applied: ${adjustments.length > 0 ? adjustments.join(", ") : "none"}`,
  };
}

/**
 * Calculate special damages
 */
export function calculateSpecialDamages(
  housingCase: HousingCaseRecord,
  defects: HousingDefect[],
  additionalHeatingCosts?: number,
  alternativeAccommodationCosts?: number,
  propertyDamageValue?: number,
): QuantumHead[] {
  const heads: QuantumHead[] = [];

  // Additional heating costs (if heating defect)
  if (defects.some((d) => d.defect_type === "heating")) {
    const heatingCosts = additionalHeatingCosts ?? estimateHeatingCosts(defects, housingCase);
    if (heatingCosts > 0) {
      heads.push({
        category: "Additional Heating Costs",
        description: "Extra heating costs due to heating failure",
        amount: heatingCosts,
        evidence: ["heating_defect", "utility_bills"],
        confidence: additionalHeatingCosts ? "high" : "medium",
      });
    }
  }

  // Alternative accommodation (if unfit for habitation)
  if (housingCase.unfit_for_habitation && alternativeAccommodationCosts) {
    heads.push({
      category: "Alternative Accommodation",
      description: "Costs of temporary accommodation",
      amount: alternativeAccommodationCosts,
      evidence: ["accommodation_receipts"],
      confidence: "high",
    });
  }

  // Property damage (damage to belongings)
  if (propertyDamageValue && propertyDamageValue > 0) {
    heads.push({
      category: "Property Damage",
      description: "Damage to tenant's belongings",
      amount: propertyDamageValue,
      evidence: ["damage_photos", "replacement_receipts"],
      confidence: "high",
    });
  }

  // Travel costs (if medical appointments due to health impact)
  if (
    housingCase.tenant_vulnerability.includes("asthma") &&
    housingCase.hhsrs_category_1_hazards.some((h) => h === "damp" || h === "mould")
  ) {
    heads.push({
      category: "Travel Costs",
      description: "Travel to medical appointments",
      amount: 200, // Estimate
      evidence: ["medical_appointments"],
      confidence: "low",
    });
  }

  return heads;
}

function estimateHeatingCosts(defects: HousingDefect[], housingCase: HousingCaseRecord): number {
  const heatingDefect = defects.find((d) => d.defect_type === "heating");
  if (!heatingDefect || !housingCase.first_report_date) {
    return 0;
  }

  const daysSinceReport = Math.floor(
    (Date.now() - new Date(housingCase.first_report_date).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Rough estimate: £5-10 per day for additional heating (electric heaters, etc.)
  // Adjust for winter months (higher) vs summer (lower)
  const dailyCost = 7.5; // Average
  const winterMonths = Math.min(daysSinceReport / 30, 6); // Assume max 6 months of winter
  const summerMonths = Math.max(0, daysSinceReport / 30 - 6);

  return Math.round(winterMonths * 30 * dailyCost * 1.5 + summerMonths * 30 * dailyCost * 0.5);
}

/**
 * Calculate complete quantum
 */
export function calculateQuantum(
  housingCase: HousingCaseRecord,
  defects: HousingDefect[],
  hasMedicalEvidence: boolean,
  specialDamagesInputs?: {
    additionalHeatingCosts?: number;
    alternativeAccommodationCosts?: number;
    propertyDamageValue?: number;
  },
): QuantumCalculation {
  const generalDamages = calculateGeneralDamages(housingCase, defects, hasMedicalEvidence);
  const specialDamages = calculateSpecialDamages(
    housingCase,
    defects,
    specialDamagesInputs?.additionalHeatingCosts,
    specialDamagesInputs?.alternativeAccommodationCosts,
    specialDamagesInputs?.propertyDamageValue,
  );

  const specialTotal = specialDamages.reduce((sum, head) => sum + head.amount, 0);

  const totalRange = {
    min: generalDamages.finalRange.min + specialTotal,
    max: generalDamages.finalRange.max + specialTotal,
  };

  const confidence =
    hasMedicalEvidence && specialDamages.length > 0
      ? "high"
      : hasMedicalEvidence || specialDamages.length > 0
        ? "medium"
        : "low";

  return {
    generalDamages,
    specialDamages,
    totalRange,
    confidence,
    disclaimer:
      "These quantum calculations are estimates based on case factors and should be verified with qualified legal counsel and expert evidence. Actual quantum will depend on specific circumstances, case law, and expert assessment.",
  };
}

