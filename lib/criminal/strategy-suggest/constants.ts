/**
 * Option 3: AI Strategy Suggestion – Fixed lists (Phase 1.3, 1.4) and feature flag (Phase 1.6).
 * AI and app must only use these values. No invented offence types or strategy angles.
 */

// -----------------------------------------------------------------------------
// FEATURE FLAG (Phase 1.6)
// When false, API must not call AI; return fallback. Ship with false until ready.
// -----------------------------------------------------------------------------

export function isAiStrategySuggestionsEnabled(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  return process.env.USE_AI_STRATEGY_SUGGESTIONS === "true" || process.env.NEXT_PUBLIC_USE_AI_STRATEGY_SUGGESTIONS === "true";
}

// -----------------------------------------------------------------------------
// OFFENCE TYPES (Phase 1.3)
// AI picks one. App maps to UI. Unknown → "other".
// -----------------------------------------------------------------------------

export const OFFENCE_TYPES = [
  "assault_oapa",
  "robbery",
  "theft",
  "burglary",
  "drugs",
  "fraud",
  "sexual",
  "criminal_damage_arson",
  "public_order",
  "other",
] as const;

export type OffenceType = (typeof OFFENCE_TYPES)[number];

export const OFFENCE_TYPE_LABELS: Record<OffenceType, string> = {
  assault_oapa: "Assault / OAPA (s.18, s.20, GBH, ABH)",
  robbery: "Robbery",
  theft: "Theft",
  burglary: "Burglary",
  drugs: "Drugs (possession / supply)",
  fraud: "Fraud",
  sexual: "Sexual offences",
  criminal_damage_arson: "Criminal damage / Arson",
  public_order: "Public order (affray, violent disorder)",
  other: "Other",
};

/** Check if string is a valid offence type; otherwise return "other". */
export function normaliseOffenceType(value: string): OffenceType {
  const v = value?.trim().toLowerCase();
  if (OFFENCE_TYPES.includes(v as OffenceType)) return v as OffenceType;
  return "other";
}

// -----------------------------------------------------------------------------
// STRATEGY ANGLES (Phase 1.4)
// AI suggests from this list only. App displays; never show raw unchecked strings.
// Generic set used for "other" and as base. Per-offence additions in strategy-angles-by-offence.
// -----------------------------------------------------------------------------

/** Generic strategy angles (used for "other" and available to all offence types). */
export const GENERIC_STRATEGY_ANGLES = [
  "reserved_pending_disclosure",
  "deny_offence_wrong_person",
  "deny_intent_lesser_charge",
  "self_defence_lawful_excuse",
  "disclosure_failures",
  "pace_breaches",
  "identification_challenge",
  "mitigation_early_plea",
  "challenge_evidence_procedure",
  "duress_necessity",
] as const;

/** Human-readable labels for strategy angle IDs. */
export const STRATEGY_ANGLE_LABELS: Record<string, string> = {
  reserved_pending_disclosure: "Reserved pending disclosure",
  deny_offence_wrong_person: "Deny offence / wrong person (ID)",
  deny_intent_lesser_charge: "Deny intent / seek lesser charge",
  self_defence_lawful_excuse: "Self-defence / lawful excuse",
  disclosure_failures: "Disclosure failures / stay",
  pace_breaches: "PACE breaches / exclusion",
  identification_challenge: "Identification challenge (Turnbull)",
  mitigation_early_plea: "Mitigation / early plea",
  challenge_evidence_procedure: "Challenge evidence / procedure",
  duress_necessity: "Duress / necessity",
  // Assault / OAPA
  deny_intent_s18_alternative_s20: "Deny intent (s.18) / alternative s.20",
  accept_act_dispute_intent_s18_s20: "Accept act, dispute intent (s.18 → s.20)",
  // Robbery
  deny_theft_no_dishonesty: "Deny theft (no dishonesty / appropriation)",
  deny_minimise_force: "Deny / minimise force or threat",
  no_intention_to_deprive: "No intention to permanently deprive",
  // Theft
  honest_belief_no_dishonesty: "Honest belief / no dishonesty",
  claim_of_right: "Belief in legal right (claim of right)",
  no_intent_permanent_deprive: "No intention to permanently deprive",
  // Drugs
  deny_possession_not_mine: "Deny possession / not mine",
  deny_intent_to_supply_personal_use: "Deny intent to supply / personal use",
  // Fraud
  no_false_representation: "No false representation",
  no_intent_gain_loss: "No intent to gain or cause loss",
  // Sexual
  consent: "Consent",
  reasonable_belief_consent: "Reasonable belief in consent",
  // Criminal damage / arson
  no_intent_recklessness: "No intention / recklessness",
  lawful_excuse_s5: "Lawful excuse (s.5 CDA)",
  // Public order
  no_use_threat_violence: "No use or threat of violence",
};

/** All known strategy angle IDs (for validation). */
export const ALL_STRATEGY_ANGLE_IDS = [
  ...GENERIC_STRATEGY_ANGLES,
  "deny_intent_s18_alternative_s20",
  "accept_act_dispute_intent_s18_s20",
  "deny_theft_no_dishonesty",
  "deny_minimise_force",
  "no_intention_to_deprive",
  "honest_belief_no_dishonesty",
  "claim_of_right",
  "no_intent_permanent_deprive",
  "deny_possession_not_mine",
  "deny_intent_to_supply_personal_use",
  "no_false_representation",
  "no_intent_gain_loss",
  "consent",
  "reasonable_belief_consent",
  "no_intent_recklessness",
  "lawful_excuse_s5",
  "no_use_threat_violence",
] as const;

const STRATEGY_ANGLE_ID_SET = new Set<string>(ALL_STRATEGY_ANGLE_IDS);

/** Check if string is a valid strategy angle ID; filter to only known ones. */
export function normaliseStrategyAngles(angles: string[]): string[] {
  return angles.filter((a) => typeof a === "string" && STRATEGY_ANGLE_ID_SET.has(a.trim()));
}

/**
 * Per-offence method hints for the AI (step 16: method encoding).
 * Used in prompt to steer charge-specific reasoning; not legal advice.
 */
export const METHOD_HINTS_BY_OFFENCE: Record<OffenceType, string> = {
  assault_oapa: "Consider: level of harm (GBH/ABH), intent (s.18 vs s.20), self-defence, identification, medical evidence.",
  robbery: "Consider: theft (dishonesty, appropriation) plus force/threat; ID; intent to permanently deprive.",
  theft: "Consider: dishonesty (Ghosh), appropriation, intention to permanently deprive; claim of right; honest belief.",
  burglary: "Consider: entry as trespasser, intent at entry (theft/GBH/damage); dishonesty and intent as for theft.",
  drugs: "Consider: possession (knowledge, control); intent to supply vs personal use; chain of custody.",
  fraud: "Consider: false representation; dishonesty; intent to gain/cause loss; reliance.",
  sexual: "Consider: consent; reasonable belief in consent; identification; delay/complainant credibility (procedural only).",
  criminal_damage_arson: "Consider: intention/recklessness; lawful excuse (s.5); property belonging to another.",
  public_order: "Consider: use or threat of violence; affray/violent disorder; identification.",
  other: "Consider: actus reus and mens rea; disclosure and procedure; mitigation.",
};

/** Get strategy angles available for an offence type (generic + offence-specific). */
export function getStrategyAnglesForOffence(offenceType: OffenceType): readonly string[] {
  const base = [...GENERIC_STRATEGY_ANGLES];
  switch (offenceType) {
    case "assault_oapa":
      return [...base, "deny_intent_s18_alternative_s20", "accept_act_dispute_intent_s18_s20"];
    case "robbery":
      return [...base, "deny_theft_no_dishonesty", "deny_minimise_force", "no_intention_to_deprive"];
    case "theft":
    case "burglary":
      return [...base, "honest_belief_no_dishonesty", "claim_of_right", "no_intent_permanent_deprive"];
    case "drugs":
      return [...base, "deny_possession_not_mine", "deny_intent_to_supply_personal_use"];
    case "fraud":
      return [...base, "no_false_representation", "no_intent_gain_loss"];
    case "sexual":
      return [...base, "consent", "reasonable_belief_consent"];
    case "criminal_damage_arson":
      return [...base, "no_intent_recklessness", "lawful_excuse_s5"];
    case "public_order":
      return [...base, "no_use_threat_violence"];
    default:
      return base;
  }
}
