/**
 * Worst-Case Cap Panel
 *
 * Generates a supervisor-grade worst-case exposure assessment.
 * Uses offence detection and central offence wording for all criminal case types.
 */

import type { IncidentShape } from "./incident-shape";
import type { WeaponTracker } from "./weapon-tracker";
import { detectOffence } from "./offence-elements";
import { getOffenceWording, getGenericWording } from "./offence-wording";

export type WorstCaseCap = {
  ceiling: string;
  explanation: string;
  absentEvidence: string[];
  unprovenElements: string[];
};

/**
 * Generate worst-case cap based on current evidence.
 * Offence-aware for all defined offence types via offence-wording config.
 */
export function generateWorstCaseCap(
  charges: Array<{ offence: string; section?: string }>,
  incidentShape: IncidentShape,
  weaponTracker: WeaponTracker | null,
  _evidenceImpactMap?: Array<{ evidenceItem: { name: string } }>,
  resolvedOffenceLabel?: string
): WorstCaseCap {
  const def = detectOffence(charges);
  const code = def.code;
  const topCharge = charges[0];
  const chargeText = topCharge?.offence || def.label || "unknown offence";
  // When offence not detected from charges, use resolved label from case if provided (avoids "Unknown Offence" in UI)
  const displayLabel =
    code !== "unknown"
      ? chargeText
      : (resolvedOffenceLabel?.trim() && resolvedOffenceLabel.toLowerCase() !== "unknown offence"
        ? resolvedOffenceLabel.trim()
        : chargeText);
  const section = topCharge?.section || "";

  const wording = getOffenceWording(code) ?? getGenericWording();
  const absentEvidence: string[] = [...wording.worstCase.absent];
  const unprovenElements: string[] = [...wording.worstCase.unproven];

  // OAPA (s18/s20): add weapon and sequence from evidence context
  if (code === "s18_oapa" || code === "s20_oapa") {
    if (incidentShape === "single_impulsive_blow" || incidentShape === "unclear_disclosure_dependent") {
      absentEvidence.push("sustained or targeted intent");
      unprovenElements.push("deliberation or repeated blows");
    }
    if (weaponTracker) {
      if (weaponTracker.forensicConfirmation === "no") {
        absentEvidence.push("forensic confirmation of weapon");
        unprovenElements.push("weapon linked to defendant");
      }
      if (weaponTracker.weaponRecovered === "no" || weaponTracker.weaponRecovered === "unclear") {
        absentEvidence.push("weapon recovery");
      }
    }
    if (incidentShape === "unclear_disclosure_dependent") {
      absentEvidence.push("complete sequence evidence");
      unprovenElements.push("duration or pattern of attack");
    }
  }

  let ceiling = displayLabel;
  if (code === "s18_oapa" && (section?.includes("18") || chargeText.toLowerCase().includes("section 18"))) {
    if (absentEvidence.includes("sustained or targeted intent")) {
      ceiling = "s.20 OAPA 1861 (wounding/inflicting GBH)";
      unprovenElements.push("specific intent to cause serious harm");
    }
  }

  const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
  const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
  const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;

  return {
    ceiling,
    explanation,
    absentEvidence,
    unprovenElements,
  };
}
