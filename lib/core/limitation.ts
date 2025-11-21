/**
 * Core Litigation Brain - Limitation Calculator
 * 
 * Calculates limitation periods and risk severity based on case facts.
 * This is procedural guidance only and does not constitute legal advice.
 */

import type { RiskSeverity } from "./types";

export interface LimitationInput {
  incidentDate?: string; // ISO
  dateOfKnowledge?: string; // ISO
  claimantDateOfBirth?: string; // ISO, to spot minors
  practiceArea: "housing" | "pi_rta" | "pi_general" | "clin_neg" | "other";
  today?: string; // default: new Date().toISOString()
}

export interface LimitationResult {
  limitationDate?: string; // ISO
  severity: RiskSeverity;
  explanation: string; // 1–2 sentences, no legal advice
  daysRemaining?: number; // days until limitation (negative if expired)
  isExpired: boolean;
  isMinor?: boolean; // true if claimant is/was a minor at incident
}

/**
 * Calculate limitation period and risk severity
 * 
 * Rules (procedural guidance only):
 * - Housing disrepair: 6 years from incident date or date of knowledge (whichever is later)
 * - PI/Clinical Negligence: 3 years from incident date or date of knowledge
 * - Minors: Limitation period may be extended (not fully modeled here - flag for review)
 * 
 * This is NOT legal advice. Dates must be confirmed with a qualified legal advisor.
 */
export function calculateLimitation(input: LimitationInput): LimitationResult {
  const today = input.today ? new Date(input.today) : new Date();

  // Determine base event date (date of knowledge takes precedence if available)
  const baseDateStr = input.dateOfKnowledge ?? input.incidentDate;
  
  if (!baseDateStr) {
    return {
      severity: "medium",
      explanation:
        "Insufficient data to calculate limitation period. Incident date or date of knowledge required. This is procedural guidance only and does not constitute legal advice.",
      isExpired: false,
    };
  }

  const baseDate = new Date(baseDateStr);
  if (isNaN(baseDate.getTime())) {
    return {
      severity: "medium",
      explanation:
        "Invalid date format provided. This is procedural guidance only and does not constitute legal advice.",
      isExpired: false,
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

  // Determine limitation period duration based on practice area
  let durationYears: number;
  switch (input.practiceArea) {
    case "housing":
      durationYears = 6; // 6 years for breach of contract (housing disrepair)
      break;
    case "pi_rta":
    case "pi_general":
    case "clin_neg":
      durationYears = 3; // 3 years for personal injury / clinical negligence
      break;
    default:
      durationYears = 3; // Default to 3 years (most common)
  }

  // Calculate limitation date
  const limitationDate = new Date(baseDate);
  limitationDate.setFullYear(limitationDate.getFullYear() + durationYears);

  // Calculate days remaining
  const daysRemaining = Math.floor(
    (limitationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isExpired = daysRemaining < 0;

  // Determine severity based on days remaining
  let severity: RiskSeverity;
  if (isExpired) {
    severity = "critical";
  } else if (daysRemaining <= 90) {
    severity = "critical";
  } else if (daysRemaining <= 180) {
    severity = "high";
  } else if (daysRemaining <= 365) {
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
      "Claimant appears to be/was a minor at the time of the incident. Limitation period may be extended - this requires qualified legal assessment.",
    );
  }

  if (input.dateOfKnowledge && input.dateOfKnowledge !== input.incidentDate) {
    explanationParts.push(
      "Date of knowledge differs from incident date - limitation period calculated from date of knowledge.",
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
  };
}

