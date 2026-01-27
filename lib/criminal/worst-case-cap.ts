/**
 * Worst-Case Cap Panel
 * 
 * Generates a supervisor-grade worst-case exposure assessment.
 * NO predictions, NO percentages, NO assumptions about unserved disclosure.
 * Only states what the realistic ceiling is based on current evidence.
 */

import type { IncidentShape } from "./incident-shape";
import type { WeaponTracker } from "./weapon-tracker";

export type WorstCaseCap = {
  ceiling: string;
  explanation: string;
  absentEvidence: string[];
  unprovenElements: string[];
};

/**
 * Generate worst-case cap based on current evidence
 */
export function generateWorstCaseCap(
  charges: Array<{ offence: string; section?: string }>,
  incidentShape: IncidentShape,
  weaponTracker: WeaponTracker | null,
  evidenceImpactMap?: Array<{ evidenceItem: { name: string } }>
): WorstCaseCap {
  // Extract top charge
  const topCharge = charges[0];
  const chargeText = topCharge?.offence || "unknown offence";
  const section = topCharge?.section || "";

  // Determine absent evidence
  const absentEvidence: string[] = [];
  const unprovenElements: string[] = [];

  // Check for intent evidence
  if (incidentShape === "single_impulsive_blow" || incidentShape === "unclear_disclosure_dependent") {
    absentEvidence.push("sustained or targeted intent");
    unprovenElements.push("deliberation or repeated blows");
  }

  // Check for weapon evidence
  if (weaponTracker) {
    if (weaponTracker.forensicConfirmation === "no") {
      absentEvidence.push("forensic confirmation of weapon");
      unprovenElements.push("weapon linked to defendant");
    }
    if (weaponTracker.weaponRecovered === "no" || weaponTracker.weaponRecovered === "unclear") {
      absentEvidence.push("weapon recovery");
    }
  }

  // Check for sequence/duration evidence
  if (incidentShape === "unclear_disclosure_dependent") {
    absentEvidence.push("complete sequence evidence");
    unprovenElements.push("duration or pattern of attack");
  }

  // Determine realistic ceiling based on charge and absent evidence
  let ceiling = chargeText;
  
  // If s18 charged but no sustained intent evidence
  if (section?.includes("18") || chargeText.toLowerCase().includes("section 18")) {
    if (absentEvidence.includes("sustained or targeted intent")) {
      ceiling = "s.20 OAPA 1861 (wounding/inflicting GBH)";
      unprovenElements.push("specific intent to cause serious harm");
    }
  }

  // Build explanation
  const absentText = absentEvidence.length > 0 
    ? `absent evidence of ${absentEvidence.join(", ")}`
    : "current material";
  
  const unprovenText = unprovenElements.length > 0
    ? unprovenElements.join(", ")
    : "key elements";

  const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;

  return {
    ceiling,
    explanation,
    absentEvidence,
    unprovenElements,
  };
}
