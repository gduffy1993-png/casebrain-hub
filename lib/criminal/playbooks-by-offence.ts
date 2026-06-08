/**
 * Phase 5: Playbooks per offence
 * Key disclosure that matters and common defence angles by offence type.
 * Used so DBM/EPP and strategy scale by charge type.
 */

import type { OffenceType } from "./strategy-suggest/constants";
import {
  getStrategyAnglesForOffence,
  STRATEGY_ANGLE_LABELS,
} from "./strategy-suggest/constants";

export type OffencePlaybook = {
  offenceType: OffenceType;
  /** Disclosure items that typically matter for this offence. */
  keyDisclosure: string[];
  /** Human-readable labels for common defence angles (from strategy angles). */
  commonAngleLabels: string[];
};

/** Key disclosure that matters per offence type (short labels for UI). */
const KEY_DISCLOSURE_BY_OFFENCE: Record<OffenceType, string[]> = {
  assault_oapa: [
    "Medical evidence (level of harm, ABH/GBH)",
    "CCTV / identification",
    "Witness statements (complainant, bystanders)",
    "999 / custody record (timing, first account)",
  ],
  robbery: [
    "CCTV / identification",
    "Property / value (theft element)",
    "Witness statements (force or threat)",
    "Forensic (if applicable)",
  ],
  theft: [
    "CCTV / identification",
    "Proof of ownership / value",
    "Witness / complainant statement",
    "Chain of evidence (recovery)",
  ],
  burglary: [
    "CCTV / identification",
    "Forensic (entry point, DNA)",
    "Proof of trespass / intent at entry",
    "Property / value (theft element if applicable)",
  ],
  drugs: [
    "Chain of custody",
    "Forensic (weight, purity, packaging)",
    "Search / arrest record",
    "Expert (intent to supply vs personal use)",
  ],
  fraud: [
    "Documents (representations, reliance)",
    "Bank / transaction records",
    "Witness / victim statements",
    "Expert (if technical fraud)",
  ],
  sexual: [
    "Complainant statement / ABE",
    "Medical / forensic (if applicable)",
    "CCTV / communications (context)",
    "Third-party / disclosure schedule",
  ],
  criminal_damage_arson: [
    "Evidence of damage / fire (photos, expert)",
    "Ownership / property",
    "CCTV / identification",
    "Witness statements (intent / recklessness)",
  ],
  public_order: [
    "CCTV / body-worn",
    "Witness statements (violence / threat)",
    "Location / context",
  ],
  other: [
    "Core evidence for actus reus / mens rea",
    "Identification",
    "Disclosure schedule",
  ],
};

/**
 * Returns the playbook for an offence type: key disclosure + common defence angles (with labels).
 */
export function getPlaybookForOffence(offenceType: OffenceType): OffencePlaybook {
  const angleIds = getStrategyAnglesForOffence(offenceType);
  const commonAngleLabels = angleIds.map(
    (id) => STRATEGY_ANGLE_LABELS[id] || id.replace(/_/g, " ")
  );
  return {
    offenceType,
    keyDisclosure: KEY_DISCLOSURE_BY_OFFENCE[offenceType] ?? KEY_DISCLOSURE_BY_OFFENCE.other,
    commonAngleLabels,
  };
}
