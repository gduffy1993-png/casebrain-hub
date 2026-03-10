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

/** Detect if charges indicate Criminal Damage / Arson (s.1(1) or s.1(3) CDA 1971). */
function isCriminalDamageArson(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return (
    section.includes("cda") ||
    section.includes("criminal damage") ||
    section.includes("1(1)") ||
    section.includes("1(3)") ||
    offence.includes("arson") ||
    offence.includes("criminal damage") ||
    offence.includes("damage by fire")
  );
}

/** Detect if charges indicate s18/s20 OAPA (GBH). */
function isOapa(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return (
    section.includes("18") ||
    section.includes("20") ||
    offence.includes("wounding") ||
    offence.includes("gbh") ||
    offence.includes("grievous bodily harm")
  );
}

function isRobbery(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return section.includes("s8") || section.includes("section 8") || offence.includes("robbery");
}

function isBurglary(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return section.includes("s9") || section.includes("section 9") || offence.includes("burglary");
}

function isTheft(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const offence = (top.offence ?? "").toLowerCase();
  return offence.includes("theft");
}

function isFraud(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return section.includes("fraud") || offence.includes("fraud");
}

function isS47Abh(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return section.includes("s47") || section.includes("47") || offence.includes("actual bodily harm") || offence.includes("abh");
}

function isCommonAssault(charges: Array<{ offence?: string; section?: string }>): boolean {
  const top = charges[0];
  if (!top) return false;
  const section = (top.section ?? "").toLowerCase();
  const offence = (top.offence ?? "").toLowerCase();
  return section.includes("s39") || section.includes("39") || offence.includes("common assault") || offence.includes("assault by beating");
}

/**
 * Generate worst-case cap based on current evidence.
 * Offence-aware: CD/Arson uses damage/fire/valuation; GBH uses intent/weapon/sequence.
 */
export function generateWorstCaseCap(
  charges: Array<{ offence: string; section?: string }>,
  incidentShape: IncidentShape,
  weaponTracker: WeaponTracker | null,
  evidenceImpactMap?: Array<{ evidenceItem: { name: string } }>
): WorstCaseCap {
  const topCharge = charges[0];
  const chargeText = topCharge?.offence || "unknown offence";
  const section = topCharge?.section || "";

  const absentEvidence: string[] = [];
  const unprovenElements: string[] = [];

  if (isCriminalDamageArson(charges)) {
    // Criminal Damage / Arson: value of damage, intent vs recklessness, fire, life endangerment
    absentEvidence.push("clear evidence defendant caused the damage or started the fire");
    unprovenElements.push("defendant caused damage or ignition");
    absentEvidence.push("ignition source or mechanism evidence");
    unprovenElements.push("intent or recklessness as to damage/danger to life");
    const ceiling = chargeText || "Criminal damage / Arson (s.1(1) or s.1(3) CDA 1971)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isRobbery(charges)) {
    absentEvidence.push("evidence of theft and force or threat of force at the time");
    unprovenElements.push("theft and force/threat immediately before or at time of theft");
    const ceiling = chargeText || "Robbery (s.8 Theft Act 1968)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isBurglary(charges)) {
    absentEvidence.push("evidence of entry as trespasser and intent or ulterior offence");
    unprovenElements.push("entry as trespasser and required intent");
    const ceiling = chargeText || "Burglary (s.9 Theft Act 1968)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isTheft(charges)) {
    absentEvidence.push("evidence of appropriation and dishonesty and intention to permanently deprive");
    unprovenElements.push("appropriation of property belonging to another with dishonesty and intention to permanently deprive");
    const ceiling = chargeText || "Theft (s.1 Theft Act 1968)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isFraud(charges)) {
    absentEvidence.push("evidence of dishonesty and (false representation / failure to disclose / abuse of position) and gain or loss");
    unprovenElements.push("dishonesty and relevant conduct and gain/loss");
    const ceiling = chargeText || "Fraud (Fraud Act 2006)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isS47Abh(charges)) {
    absentEvidence.push("evidence of assault/battery and causation of actual bodily harm");
    unprovenElements.push("assault or battery and causation of ABH");
    const ceiling = chargeText || "s.47 OAPA 1861 (ABH)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isCommonAssault(charges)) {
    absentEvidence.push("evidence of assault or battery");
    unprovenElements.push("assault or battery");
    const ceiling = chargeText || "Common assault / Battery (s.39 CJA 1988)";
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  if (isOapa(charges)) {
    // GBH / OAPA: existing logic
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
    let ceiling = chargeText;
    if (section?.includes("18") || chargeText.toLowerCase().includes("section 18")) {
      if (absentEvidence.includes("sustained or targeted intent")) {
        ceiling = "s.20 OAPA 1861 (wounding/inflicting GBH)";
        unprovenElements.push("specific intent to cause serious harm");
      }
    }
    const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
    const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
    const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${ceiling}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
    return { ceiling, explanation, absentEvidence, unprovenElements };
  }

  // Generic fallback — any other criminal offence (theft, assault, fraud, etc.)
  absentEvidence.push("complete evidence of act and causation");
  unprovenElements.push("actus reus and mens rea to the required standard");
  if (incidentShape === "unclear_disclosure_dependent") {
    absentEvidence.push("complete sequence or circumstantial evidence");
    unprovenElements.push("clear link between defendant and offence");
  }
  const absentText = absentEvidence.length > 0 ? `absent evidence of ${absentEvidence.join(", ")}` : "current material";
  const unprovenText = unprovenElements.length > 0 ? unprovenElements.join(", ") : "key elements";
  const explanation = `Even on adverse disclosure, the realistic ceiling of this case is ${chargeText}, ${absentText}, because current material does not demonstrate ${unprovenText}.`;
  return {
    ceiling: chargeText,
    explanation,
    absentEvidence,
    unprovenElements,
  };
}
