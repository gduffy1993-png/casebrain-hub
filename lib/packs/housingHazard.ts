/**
 * Housing Hazard Analysis Module
 *
 * Provides specialized analysis for Awaab's Law compliance and HHSRS hazards
 * in housing disrepair cases.
 */

import type { Severity } from "@/lib/types/casebrain";
import { getPackForPracticeArea } from "@/lib/packs";

// =============================================================================
// Types
// =============================================================================

export type HazardSeverity = "cat1" | "cat2" | "awaab_urgent" | "concern" | "low";

export type HousingHazardSummary = {
  // Damp & Mould Assessment
  dampMouldDetected: boolean;
  dampMouldIndicators: string[];
  dampMouldSeverity: Severity;

  // Vulnerable Occupants
  vulnerableOccupantsDetected: boolean;
  vulnerableFactors: string[];
  vulnerabilitySeverity: Severity;

  // Health Impact
  healthSymptomsDetected: boolean;
  symptoms: string[];

  // Landlord Response
  delayPatternsDetected: boolean;
  delayFactors: string[];

  // HHSRS Assessment
  hhsrsCategory?: "1" | "2" | "none";
  hhsrsHazards: string[];

  // Awaab's Law
  awaabApplies: boolean;
  awaabBreachRisk: Severity;
  awaabDeadlineDays?: number;

  // Overall
  overallRiskLevel: Severity;
  urgentAction: boolean;
  recommendations: string[];
};

// =============================================================================
// Analysis Functions
// =============================================================================

type HazardInput = {
  caseTitle: string;
  documents: Array<{ name: string; type?: string; extractedText?: string }>;
  notes?: string;
  landlordType?: "social" | "private" | "unknown";
  firstComplaintDate?: string;
  hasChildOccupant?: boolean;
  hasElderlyOccupant?: boolean;
  hasDisabledOccupant?: boolean;
};

/**
 * Build housing hazard summary from case data
 */
export function buildHousingHazardSummary(input: HazardInput): HousingHazardSummary {
  const pack = getPackForPracticeArea("housing_disrepair");
  const hazardModel = pack.housingHazardModel;

  if (!hazardModel) {
    return getEmptySummary();
  }

  // Combine all text for analysis
  const allText = [
    input.caseTitle,
    input.notes ?? "",
    ...input.documents.map((d) => `${d.name} ${d.extractedText ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();

  // Detect damp & mould
  const dampMouldIndicators = hazardModel.dampMouldFactors.filter((f: string) =>
    allText.includes(f.toLowerCase())
  );
  const dampMouldDetected = dampMouldIndicators.length > 0;

  // Detect vulnerable occupants
  const vulnerableFactors = hazardModel.vulnerableOccupantFactors.filter((f: string) =>
    allText.includes(f.toLowerCase())
  );
  // Also check explicit flags
  if (input.hasChildOccupant && !vulnerableFactors.includes("child")) {
    vulnerableFactors.push("child");
  }
  if (input.hasElderlyOccupant && !vulnerableFactors.includes("elderly")) {
    vulnerableFactors.push("elderly");
  }
  if (input.hasDisabledOccupant && !vulnerableFactors.includes("disabled")) {
    vulnerableFactors.push("disabled");
  }
  const vulnerableOccupantsDetected = vulnerableFactors.length > 0;

  // Detect symptoms
  const symptoms = hazardModel.symptomKeywords.filter((s: string) =>
    allText.includes(s.toLowerCase())
  );
  const healthSymptomsDetected = symptoms.length > 0;

  // Detect delay patterns
  const delayFactors = hazardModel.delayPatterns.filter((p: string) =>
    allText.includes(p.toLowerCase())
  );
  const delayPatternsDetected = delayFactors.length > 0;

  // Determine HHSRS category
  let hhsrsCategory: "1" | "2" | "none" = "none";
  const hhsrsHazards: string[] = [];

  if (allText.includes("category 1") || allText.includes("cat 1") || allText.includes("cat1")) {
    hhsrsCategory = "1";
    hhsrsHazards.push("Category 1 hazard identified");
  } else if (
    allText.includes("category 2") ||
    allText.includes("cat 2") ||
    allText.includes("cat2")
  ) {
    hhsrsCategory = "2";
    hhsrsHazards.push("Category 2 hazard identified");
  }

  // Determine if Awaab's Law applies (social landlord + damp/mould)
  const awaabApplies =
    input.landlordType === "social" && dampMouldDetected;

  // Calculate Awaab deadline (if applicable)
  let awaabDeadlineDays: number | undefined;
  if (awaabApplies && input.firstComplaintDate) {
    const complaintDate = new Date(input.firstComplaintDate);
    const now = new Date();
    const daysSinceComplaint = Math.floor(
      (now.getTime() - complaintDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Awaab's Law: 14 days to investigate, 7 more to start repairs
    awaabDeadlineDays = Math.max(0, 21 - daysSinceComplaint);
  }

  // Calculate severities
  const dampMouldSeverity = calculateDampMouldSeverity(
    dampMouldIndicators.length,
    vulnerableOccupantsDetected
  );
  const vulnerabilitySeverity = calculateVulnerabilitySeverity(
    vulnerableFactors.length,
    healthSymptomsDetected
  );
  const awaabBreachRisk = calculateAwaabBreachRisk(
    awaabApplies,
    awaabDeadlineDays,
    delayPatternsDetected
  );

  // Overall risk level
  const overallRiskLevel = calculateOverallRisk(
    dampMouldSeverity,
    vulnerabilitySeverity,
    hhsrsCategory,
    awaabBreachRisk
  );

  // Determine if urgent action needed
  const urgentAction =
    hhsrsCategory === "1" ||
    overallRiskLevel === "CRITICAL" ||
    (awaabApplies && (awaabDeadlineDays ?? 99) <= 7) ||
    (dampMouldDetected && vulnerableOccupantsDetected);

  // Build recommendations
  const recommendations = buildRecommendations({
    dampMouldDetected,
    vulnerableOccupantsDetected,
    healthSymptomsDetected,
    hhsrsCategory,
    awaabApplies,
    awaabDeadlineDays,
    delayPatternsDetected,
  });

  return {
    dampMouldDetected,
    dampMouldIndicators,
    dampMouldSeverity,
    vulnerableOccupantsDetected,
    vulnerableFactors,
    vulnerabilitySeverity,
    healthSymptomsDetected,
    symptoms,
    delayPatternsDetected,
    delayFactors,
    hhsrsCategory: hhsrsCategory === "none" ? undefined : hhsrsCategory,
    hhsrsHazards,
    awaabApplies,
    awaabBreachRisk,
    awaabDeadlineDays,
    overallRiskLevel,
    urgentAction,
    recommendations,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function getEmptySummary(): HousingHazardSummary {
  return {
    dampMouldDetected: false,
    dampMouldIndicators: [],
    dampMouldSeverity: "LOW",
    vulnerableOccupantsDetected: false,
    vulnerableFactors: [],
    vulnerabilitySeverity: "LOW",
    healthSymptomsDetected: false,
    symptoms: [],
    delayPatternsDetected: false,
    delayFactors: [],
    hhsrsHazards: [],
    awaabApplies: false,
    awaabBreachRisk: "LOW",
    overallRiskLevel: "LOW",
    urgentAction: false,
    recommendations: [],
  };
}

function calculateDampMouldSeverity(
  indicatorCount: number,
  hasVulnerable: boolean
): Severity {
  if (indicatorCount === 0) return "LOW";
  if (hasVulnerable && indicatorCount >= 2) return "CRITICAL";
  if (indicatorCount >= 3) return "HIGH";
  if (indicatorCount >= 2) return "MEDIUM";
  return "LOW";
}

function calculateVulnerabilitySeverity(
  factorCount: number,
  hasSymptoms: boolean
): Severity {
  if (factorCount === 0) return "LOW";
  if (hasSymptoms && factorCount >= 1) return "CRITICAL";
  if (factorCount >= 2) return "HIGH";
  return "MEDIUM";
}

function calculateAwaabBreachRisk(
  applies: boolean,
  deadlineDays: number | undefined,
  hasDelays: boolean
): Severity {
  if (!applies) return "LOW";
  if (deadlineDays !== undefined) {
    if (deadlineDays <= 0) return "CRITICAL";
    if (deadlineDays <= 7) return "HIGH";
    if (deadlineDays <= 14) return "MEDIUM";
  }
  if (hasDelays) return "HIGH";
  return "MEDIUM";
}

function calculateOverallRisk(
  dampSeverity: Severity,
  vulnerabilitySeverity: Severity,
  hhsrsCategory: "1" | "2" | "none",
  awaabBreachRisk: Severity
): Severity {
  if (hhsrsCategory === "1") return "CRITICAL";
  if (
    dampSeverity === "CRITICAL" ||
    vulnerabilitySeverity === "CRITICAL" ||
    awaabBreachRisk === "CRITICAL"
  ) {
    return "CRITICAL";
  }
  if (
    dampSeverity === "HIGH" ||
    vulnerabilitySeverity === "HIGH" ||
    awaabBreachRisk === "HIGH"
  ) {
    return "HIGH";
  }
  if (hhsrsCategory === "2") return "MEDIUM";
  if (
    dampSeverity === "MEDIUM" ||
    vulnerabilitySeverity === "MEDIUM" ||
    awaabBreachRisk === "MEDIUM"
  ) {
    return "MEDIUM";
  }
  return "LOW";
}

function buildRecommendations(params: {
  dampMouldDetected: boolean;
  vulnerableOccupantsDetected: boolean;
  healthSymptomsDetected: boolean;
  hhsrsCategory: "1" | "2" | "none";
  awaabApplies: boolean;
  awaabDeadlineDays?: number;
  delayPatternsDetected: boolean;
}): string[] {
  const recs: string[] = [];

  if (params.dampMouldDetected) {
    recs.push("Obtain dated photographs of all damp and mould affected areas.");
    recs.push("Instruct a surveyor for HHSRS assessment if not already done.");
  }

  if (params.vulnerableOccupantsDetected) {
    recs.push("Document vulnerable occupants and their specific needs.");
    if (params.healthSymptomsDetected) {
      recs.push("Obtain medical evidence linking health issues to conditions.");
    }
  }

  if (params.hhsrsCategory === "1") {
    recs.push("URGENT: Category 1 hazard requires immediate attention.");
    recs.push("Consider emergency injunction or local authority involvement.");
  } else if (params.hhsrsCategory === "2") {
    recs.push("Category 2 hazard identified - monitor for escalation.");
  }

  if (params.awaabApplies) {
    if (params.awaabDeadlineDays !== undefined && params.awaabDeadlineDays <= 7) {
      recs.push(
        `URGENT: Awaab's Law deadline approaching (${params.awaabDeadlineDays} days remaining).`
      );
    }
    recs.push("Document all landlord communications re: damp/mould investigation and repairs.");
  }

  if (params.delayPatternsDetected) {
    recs.push("Record all instances of landlord delay or non-response.");
    recs.push("Consider escalating via pre-action protocol if delays persist.");
  }

  return recs;
}

