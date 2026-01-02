/**
 * Strategy Confidence Drift Engine
 * 
 * Implements deterministic rules so confidence can:
 * - Increase
 * - Decrease
 * - Collapse
 * 
 * Based on evidence changes, not static assessment.
 */

import type { RouteType } from "./strategy-fight-types";
import type { EvidenceSignals } from "./strategy-recommendation-engine";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type ConfidenceChange = {
  from: ConfidenceLevel;
  to: ConfidenceLevel;
  trigger: string;
  explanation: string;
  evidenceBacked: boolean;
};

export type ConfidenceState = {
  current: ConfidenceLevel;
  previous?: ConfidenceLevel;
  changes: ConfidenceChange[];
  explanation: string;
};

/**
 * Calculate confidence drift based on evidence changes
 */
export function calculateConfidenceDrift(
  route: RouteType,
  currentSignals: EvidenceSignals,
  previousSignals?: EvidenceSignals
): ConfidenceState {
  // Start with base confidence assessment
  let current: ConfidenceLevel = assessBaseConfidence(route, currentSignals);
  const changes: ConfidenceChange[] = [];

  // If we have previous signals, detect changes
  if (previousSignals) {
    const drift = detectConfidenceDrift(route, previousSignals, currentSignals);
    if (drift) {
      current = drift.to;
      changes.push(drift);
    }
  }

  const explanation = generateConfidenceExplanation(route, current, currentSignals, changes);

  return {
    current,
    previous: previousSignals ? assessBaseConfidence(route, previousSignals) : undefined,
    changes,
    explanation,
  };
}

/**
 * Assess base confidence from current signals
 */
function assessBaseConfidence(route: RouteType, signals: EvidenceSignals): ConfidenceLevel {
  let score = 0;

  switch (route) {
    case "fight_charge":
      if (signals.idStrength === "weak") score += 2;
      if (signals.disclosureCompleteness === "gaps" && signals.disclosureGaps.length > 0) score += 1;
      if (signals.paceCompliance === "breaches") score += 1;
      if (signals.prosecutionStrength === "weak") score += 1;
      
      if (signals.idStrength === "strong") score -= 2;
      if (signals.prosecutionStrength === "strong") score -= 2;
      
      // Unknown signals reduce confidence
      if (signals.idStrength === "unknown") score -= 1;
      if (signals.disclosureCompleteness === "unknown") score -= 1;
      break;

    case "charge_reduction":
      if (signals.medicalEvidence === "single_brief") score += 2;
      if (signals.cctvSequence === "brief") score += 1;
      if (signals.weaponUse === "brief_incidental") score += 1;
      
      if (signals.medicalEvidence === "sustained") score -= 2;
      if (signals.cctvSequence === "prolonged") score -= 1;
      if (signals.weaponUse === "sustained_targeted") score -= 1;
      
      // Unknown signals reduce confidence
      if (signals.medicalEvidence === "unknown") score -= 1;
      if (signals.cctvSequence === "unknown") score -= 1;
      break;

    case "outcome_management":
      if (signals.prosecutionStrength === "strong") score += 2;
      if (signals.idStrength === "strong") score += 1;
      if (signals.medicalEvidence === "sustained") score += 1;
      
      if (signals.prosecutionStrength === "weak") score -= 2;
      if (signals.disclosureCompleteness === "gaps" && signals.disclosureGaps.length > 2) score -= 1;
      break;
  }

  if (score >= 3) return "HIGH";
  if (score >= 0) return "MEDIUM";
  return "LOW";
}

/**
 * Detect confidence drift between signal states
 */
function detectConfidenceDrift(
  route: RouteType,
  previous: EvidenceSignals,
  current: EvidenceSignals
): ConfidenceChange | null {
  const previousConf = assessBaseConfidence(route, previous);
  const currentConf = assessBaseConfidence(route, current);

  if (previousConf === currentConf) {
    return null; // No change
  }

  // Detect what changed
  const triggers: string[] = [];

  // ID strength changes
  if (previous.idStrength !== current.idStrength) {
    if (route === "fight_charge") {
      if (current.idStrength === "strong" && previous.idStrength === "weak") {
        triggers.push("Identification evidence strengthened");
      } else if (current.idStrength === "weak" && previous.idStrength === "strong") {
        triggers.push("Identification evidence weakened");
      }
    }
  }

  // Medical evidence changes
  if (previous.medicalEvidence !== current.medicalEvidence) {
    if (route === "charge_reduction") {
      if (current.medicalEvidence === "sustained" && previous.medicalEvidence === "single_brief") {
        triggers.push("Medical evidence shows sustained injuries");
      } else if (current.medicalEvidence === "single_brief" && previous.medicalEvidence === "sustained") {
        triggers.push("Medical evidence shows single/brief injuries");
      }
    }
  }

  // CCTV sequence changes
  if (previous.cctvSequence !== current.cctvSequence) {
    if (route === "charge_reduction") {
      if (current.cctvSequence === "prolonged" && previous.cctvSequence === "brief") {
        triggers.push("CCTV shows prolonged sequence");
      } else if (current.cctvSequence === "brief" && previous.cctvSequence === "prolonged") {
        triggers.push("CCTV shows brief sequence");
      }
    }
  }

  // Disclosure completeness changes
  if (previous.disclosureCompleteness !== current.disclosureCompleteness) {
    if (route === "fight_charge") {
      if (current.disclosureCompleteness === "complete" && previous.disclosureCompleteness === "gaps") {
        triggers.push("Full disclosure provided");
      } else if (current.disclosureCompleteness === "gaps" && previous.disclosureCompleteness === "complete") {
        triggers.push("Disclosure gaps identified");
      }
    }
  }

  // PACE compliance changes
  if (previous.paceCompliance !== current.paceCompliance) {
    if (route === "fight_charge") {
      if (current.paceCompliance === "breaches" && previous.paceCompliance === "compliant") {
        triggers.push("PACE breaches identified");
      } else if (current.paceCompliance === "compliant" && previous.paceCompliance === "breaches") {
        triggers.push("PACE compliance confirmed");
      }
    }
  }

  const trigger = triggers.length > 0 ? triggers.join("; ") : "Evidence signals changed";
  const explanation = generateDriftExplanation(route, previousConf, currentConf, trigger);

  return {
    from: previousConf,
    to: currentConf,
    trigger,
    explanation,
    evidenceBacked: triggers.length > 0,
  };
}

/**
 * Generate confidence explanation
 */
function generateConfidenceExplanation(
  route: RouteType,
  confidence: ConfidenceLevel,
  signals: EvidenceSignals,
  changes: ConfidenceChange[]
): string {
  let explanation = `Confidence: ${confidence}. `;

  if (changes.length > 0) {
    const latestChange = changes[changes.length - 1];
    explanation += `Confidence ${latestChange.from} → ${latestChange.to} due to: ${latestChange.trigger}. `;
  }

  // Add evidence-based reasons
  const reasons: string[] = [];

  switch (route) {
    case "fight_charge":
      if (signals.idStrength === "weak") {
        reasons.push("weak identification evidence");
      }
      if (signals.disclosureCompleteness === "gaps") {
        reasons.push("disclosure gaps");
      }
      if (signals.paceCompliance === "breaches") {
        reasons.push("PACE breaches");
      }
      if (signals.idStrength === "unknown" || signals.disclosureCompleteness === "unknown") {
        reasons.push("key evidence signals unknown");
      }
      break;

    case "charge_reduction":
      if (signals.medicalEvidence === "single_brief") {
        reasons.push("single/brief injury pattern");
      }
      if (signals.cctvSequence === "brief") {
        reasons.push("brief CCTV sequence");
      }
      if (signals.medicalEvidence === "unknown" || signals.cctvSequence === "unknown") {
        reasons.push("key evidence signals unknown");
      }
      break;

    case "outcome_management":
      if (signals.prosecutionStrength === "strong") {
        reasons.push("strong prosecution case");
      }
      if (signals.prosecutionStrength === "unknown") {
        reasons.push("prosecution strength uncertain");
      }
      break;
  }

  if (reasons.length > 0) {
    explanation += `Based on: ${reasons.join(", ")}.`;
  }

  return explanation;
}

/**
 * Generate drift explanation
 */
function generateDriftExplanation(
  route: RouteType,
  from: ConfidenceLevel,
  to: ConfidenceLevel,
  trigger: string
): string {
  const direction = to === "HIGH" ? "increased" : to === "LOW" ? "decreased" : "changed";
  
  return `Confidence ${direction} from ${from} to ${to} because: ${trigger}.`;
}

