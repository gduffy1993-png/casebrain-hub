/**
 * Core Litigation Brain - Limitation Calculator
 * 
 * Calculates limitation periods and risk severity based on case facts.
 * Now uses the pack system for practice-area-specific limitation rules.
 * 
 * This is procedural guidance only and does not constitute legal advice.
 */

import type { RiskSeverity } from "./types";
import type { PracticeArea } from "../types/casebrain";
import { 
  getLimitationRules, 
  getLimitationSummary, 
  normalizePracticeArea 
} from "../packs";

export interface LimitationInput {
  incidentDate?: string; // ISO
  dateOfKnowledge?: string; // ISO
  claimantDateOfBirth?: string; // ISO, to spot minors
  practiceArea: string; // Now accepts any practice area string, normalized internally
  today?: string; // default: new Date().toISOString()
}

export interface LimitationResult {
  limitationDate?: string; // ISO
  severity: RiskSeverity;
  explanation: string; // 1–2 sentences, no legal advice
  daysRemaining?: number; // days until limitation (negative if expired)
  isExpired: boolean;
  isMinor?: boolean; // true if claimant is/was a minor at incident
  practiceAreaSummary?: string; // Pack-specific limitation summary
  specialCases?: string[]; // Pack-specific special cases
}

/**
 * Map legacy practice area strings to normalized format
 */
function normalizeLegacyPracticeArea(area: string): PracticeArea {
  const lower = area.toLowerCase();
  
  // Legacy mappings
  if (lower === "housing" || lower.includes("disrepair")) {
    return "housing_disrepair";
  }
  if (lower === "pi_rta" || lower === "pi_general" || lower.includes("personal_injury") || lower === "pi") {
    return "personal_injury";
  }
  if (lower === "clin_neg" || lower.includes("clinical")) {
    return "clinical_negligence";
  }
  if (lower.includes("family")) {
    return "family";
  }
  
  return normalizePracticeArea(area);
}

/**
 * Calculate limitation period and risk severity
 * 
 * Uses pack-specific limitation rules where available.
 * Falls back to reasonable defaults if pack has no specific rules.
 * 
 * This is NOT legal advice. Dates must be confirmed with a qualified legal advisor.
 */
export function calculateLimitation(input: LimitationInput): LimitationResult {
  const today = input.today ? new Date(input.today) : new Date();
  const normalizedArea = normalizeLegacyPracticeArea(input.practiceArea);
  
  // Get pack-specific limitation info
  const limitationRules = getLimitationRules(normalizedArea);
  const limitationSummary = getLimitationSummary(normalizedArea);

  // Determine base event date (date of knowledge takes precedence if available)
  const baseDateStr = input.dateOfKnowledge ?? input.incidentDate;
  
  if (!baseDateStr) {
    return {
      severity: "medium",
      explanation:
        "Insufficient data to calculate limitation period. Incident date or date of knowledge required. This is procedural guidance only and does not constitute legal advice.",
      isExpired: false,
      practiceAreaSummary: limitationSummary.summary,
      specialCases: limitationSummary.specialCases,
    };
  }

  const baseDate = new Date(baseDateStr);
  if (isNaN(baseDate.getTime())) {
    return {
      severity: "medium",
      explanation:
        "Invalid date format provided. This is procedural guidance only and does not constitute legal advice.",
      isExpired: false,
      practiceAreaSummary: limitationSummary.summary,
      specialCases: limitationSummary.specialCases,
    };
  }

  // Check if claimant is/was a minor
  let isMinor = false;
  if (input.claimantDateOfBirth) {
    const dob = new Date(input.claimantDateOfBirth);
    if (!isNaN(dob.getTime())) {
      const ageAtIncident = (baseDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      isMinor = ageAtIncident < 18;
    }
  }

  // Get the primary limitation rule from the pack
  const primaryRule = limitationRules[0];
  
  // Determine limitation period duration based on pack rules or defaults
  let durationYears: number;
  let dateOfKnowledgeApplies = false;
  
  if (primaryRule) {
    durationYears = primaryRule.defaultYears;
    dateOfKnowledgeApplies = primaryRule.dateOfKnowledgeApplies;
  } else {
    // Fallback defaults based on normalized area
    switch (normalizedArea) {
      case "housing_disrepair":
        durationYears = 6;
        break;
      case "personal_injury":
      case "clinical_negligence":
        durationYears = 3;
        dateOfKnowledgeApplies = true;
        break;
      case "family":
        durationYears = 0; // Family doesn't have traditional limitation
        break;
      default:
        durationYears = 6; // Default contract limitation
    }
  }

  // For family cases with no real limitation, return early with appropriate message
  if (durationYears === 0) {
    return {
      severity: "low",
      explanation: "Family proceedings do not have traditional limitation periods. Check specific deadlines for appeals, enforcement, or any associated civil claims. This is procedural guidance only.",
      isExpired: false,
      isMinor: isMinor || undefined,
      practiceAreaSummary: limitationSummary.summary,
      specialCases: limitationSummary.specialCases,
    };
  }

  // Calculate limitation date
  const limitationDate = new Date(baseDate);
  limitationDate.setFullYear(limitationDate.getFullYear() + durationYears);

  // Calculate days remaining
  const daysRemaining = Math.floor(
    (limitationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isExpired = daysRemaining < 0;

  // Use pack thresholds if available, otherwise defaults
  const thresholds = primaryRule?.warningThresholds ?? {
    critical: 30,
    high: 90,
    medium: 180,
  };

  // Determine severity based on days remaining
  let severity: RiskSeverity;
  if (isExpired) {
    severity = "critical";
  } else if (daysRemaining <= thresholds.critical) {
    severity = "critical";
  } else if (daysRemaining <= thresholds.high) {
    severity = "high";
  } else if (daysRemaining <= thresholds.medium) {
    severity = "medium";
  } else {
    severity = "low";
  }

  // Build explanation
  const explanationParts: string[] = [];
  
  if (isExpired) {
    explanationParts.push(
      `Possible limitation period may have expired (calculated date: ${limitationDate.toLocaleDateString("en-GB")}).`,
    );
  } else {
    explanationParts.push(
      `Possible limitation deadline around ${limitationDate.toLocaleDateString("en-GB")} (${daysRemaining} days remaining).`,
    );
  }

  if (isMinor) {
    explanationParts.push(
      "Claimant appears to be/was a minor at the time of the incident. Limitation period may be extended – this requires qualified legal assessment.",
    );
  }

  if (dateOfKnowledgeApplies && input.dateOfKnowledge && input.dateOfKnowledge !== input.incidentDate) {
    explanationParts.push(
      "Date of knowledge differs from incident date – limitation period calculated from date of knowledge.",
    );
  }

  explanationParts.push(
    "This is procedural guidance only and does not constitute legal advice. Dates must be confirmed with a qualified legal advisor.",
  );

  return {
    limitationDate: limitationDate.toISOString(),
    severity,
    explanation: explanationParts.join(" "),
    daysRemaining,
    isExpired,
    isMinor: isMinor || undefined,
    practiceAreaSummary: limitationSummary.summary,
    specialCases: limitationSummary.specialCases,
  };
}

