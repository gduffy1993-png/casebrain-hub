/**
 * Review & Confirm: stance options by offence family, stage options, strategy preview labels.
 */

import { mapStanceDetectedToPrimary, type PrimaryStrategyType } from "./phase1-detection";

/** Procedural stage choices (editable). */
export const REVIEW_STAGE_OPTIONS = [
  "Disclosure outstanding – not ready for plea",
  "Ready for plea",
  "Before first hearing",
  "Before PTPH",
  "Before trial",
] as const;

const VIOLENCE_STANCES = [
  "Intent denial + Causation",
  "Put to proof",
  "Lawful force",
  "Act denial",
  "Recklessness challenge",
] as const;

const S18_EXTRA = ["Specific intent challenge", "Diminished responsibility (if raised)"] as const;

const THEFT_PROPERTY_STANCES = [
  "Put to proof",
  "Identity / wrong person",
  "No dishonesty / consent",
  "Reserved pending disclosure",
] as const;

const DRUGS_STANCES = [
  "Put to proof",
  "Challenge chain of evidence / possession",
  "Reserved pending disclosure",
] as const;

const FRAUD_STANCES = [
  "Put to proof",
  "No dishonesty / no intent to defraud",
  "Reserved pending disclosure",
] as const;

const PUBLIC_ORDER_STANCES = [
  "Put to proof",
  "Self-defence / lawful excuse",
  "Identification",
  "Reserved pending disclosure",
] as const;

const SEXUAL_STANCES = [
  "Put to proof",
  "Consent (where applicable)",
  "Reserved pending disclosure",
] as const;

const RTA_STANCES = [
  "Put to proof",
  "Factual dispute",
  "Reserved pending disclosure",
] as const;

const GENERIC_STANCES = [
  "Put to proof",
  "Lawful force",
  "Reserved pending disclosure",
] as const;

/**
 * Stance dropdown options for the detected offence code (hide irrelevant families).
 */
export function getStanceOptionsForOffenceCode(offenceCode: string): string[] {
  const c = (offenceCode || "").toLowerCase();

  if (/s18|wounding.with.intent|gbh.with.intent/.test(c) || (c.includes("s18") && c.includes("oapa"))) {
    return [...VIOLENCE_STANCES, ...S18_EXTRA];
  }
  if (/s20|s47|oapa|assault|gbh|wound|abh|violent.disorder|affray|harassment|stalking|threat/.test(c)) {
    return [...VIOLENCE_STANCES];
  }

  if (/theft|robbery|burglary|handling|twoc|blackmail|making.off/.test(c)) {
    return [...THEFT_PROPERTY_STANCES];
  }
  if (/drug|possession|pwits|supply|cannabis|cocaine/.test(c)) {
    return [...DRUGS_STANCES];
  }
  if (/fraud|false.accounting|money.launder|bribery/.test(c)) {
    return [...FRAUD_STANCES];
  }
  if (/poa_s|public.order|affray|disorder|obstruction/.test(c)) {
    return [...PUBLIC_ORDER_STANCES];
  }
  if (/rape|sexual|penetration|indecent|exposure|voyeur/.test(c)) {
    return [...SEXUAL_STANCES];
  }
  if (/driv|death.by|careless|dangerous|drink|vehicle/.test(c)) {
    return [...RTA_STANCES];
  }

  if (c === "unknown" || !c) {
    return [...GENERIC_STANCES, ...VIOLENCE_STANCES.slice(0, 3)];
  }

  return [...GENERIC_STANCES];
}

const STRATEGY_LABELS: Record<PrimaryStrategyType, string> = {
  fight_charge: "Fight charge (full trial strategy)",
  charge_reduction: "Charge reduction (e.g. s.18 → s.20)",
  outcome_management: "Outcome management (plea / mitigation)",
};

export function stanceToPrimaryStrategy(stance: string): PrimaryStrategyType {
  const p = mapStanceDetectedToPrimary(stance);
  if (p) return p;
  const s = (stance || "").toLowerCase();
  if (s.includes("recklessness")) return "charge_reduction";
  if (s.includes("mitigation") || s.includes("early plea") || s.includes("outcome management")) return "outcome_management";
  return "fight_charge";
}

export function getStrategyPreviewLabel(stance: string): string {
  return STRATEGY_LABELS[stanceToPrimaryStrategy(stance)];
}

export const STRATEGY_OVERRIDE_OPTIONS: { value: PrimaryStrategyType; label: string }[] = [
  { value: "fight_charge", label: STRATEGY_LABELS.fight_charge },
  { value: "charge_reduction", label: STRATEGY_LABELS.charge_reduction },
  { value: "outcome_management", label: STRATEGY_LABELS.outcome_management },
];
