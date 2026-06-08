/**
 * Violent Offences Charge Taxonomy (UK)
 *
 * Canonical offence list + metadata for deterministic, court-safe strategy generation.
 * This is used for:
 * - soft "charge candidate" detection (keyword-based, never certainty)
 * - offence-aware expected evidence selection
 * - charge stability scoring (what tends to make a charge stick/collapse)
 *
 * IMPORTANT: This module must not be used to generate advice to obstruct justice.
 */

export type ViolentOffenceCategory =
  | "assault_battery"
  | "abh"
  | "gbh_s20"
  | "gbh_s18"
  | "robbery"
  | "public_order"
  | "threats"
  | "weapons_possession"
  | "strangulation"
  | "generic_violent";

export type MensReaType = "intent" | "reckless" | "mixed";

export type CoreIssue =
  | "identification"
  | "intent"
  | "selfDefence"
  | "causation"
  | "medicalCausation"
  | "credibility"
  | "continuity"
  | "disclosure"
  | "forensics"
  | "badCharacter"
  | "hearsay"
  | "domesticContext"
  | "injurySeverity";

export type ChargeStabilitySignal =
  | "weaponRecovered"
  | "admissions"
  | "repeatedBlows"
  | "targetedVitalArea"
  | "seriousHarm"
  | "premeditationIndicators"
  | "threats"
  | "cctvClarity"
  | "forensics"
  | "medicalCausation"
  | "independentWitnesses"
  | "continuityComplete";

export type ViolentOffenceId =
  | "common_assault_battery"
  | "abh_s47"
  | "gbh_s20"
  | "gbh_s18_intent"
  | "robbery_violent_theft"
  | "affray"
  | "violent_disorder"
  | "threats_to_kill"
  | "possession_bladed_article"
  | "possession_offensive_weapon"
  | "threatening_with_weapon_or_blade"
  | "non_fatal_strangulation"
  | "generic_violent_incident";

/**
 * Ship-ready stability inputs shape (requested)
 * These are *signals that matter* for whether a more serious charge tends to hold up.
 */
export type ChargeStabilityInputs = {
  weaponRecovered: boolean;
  admissions: boolean;
  injurySeverity: boolean;
  repetition: boolean;
  targeting: boolean;
  CCTVClarity: boolean;
  firstAccountConsistency: boolean;
};

export type ViolentOffenceMeta = {
  id: ViolentOffenceId;
  label: string;
  category: ViolentOffenceCategory;
  /** Plain-language statute reference for UX (keep accurate; avoid over-detail if unsure) */
  statuteHint?: string;
  mensRea: MensReaType;
  /** Free-form tags to help offence-aware evidence selection (e.g. "knife", "strangulation", "public_order") */
  violenceTags: string[];
  coreIssues: CoreIssue[];
  /** Ship-ready inputs (requested) */
  chargeStabilityInputs: ChargeStabilityInputs;
  /** Back-compat / internal signals list (optional) */
  chargeStabilitySignals?: ChargeStabilitySignal[];
};

/**
 * Domestic abuse context tag (NOT a charge)
 */
export type CaseContextTag = "domestic_context";

export const CONTEXT_TAGS: Array<{
  id: CaseContextTag;
  label: string;
  keywords: string[];
}> = [
  {
    id: "domestic_context",
    label: "Domestic abuse context",
    keywords: [
      "domestic",
      "partner",
      "ex-partner",
      "girlfriend",
      "boyfriend",
      "husband",
      "wife",
      "coercive",
      "controlling",
      "da marker",
      "dash",
      "stalking",
    ],
  },
];

/**
 * Canonical violent offence list (minimum required set).
 * Note: labels are solicitor-facing; statuteHint is optional and used only for context.
 */
export const VIOLENT_CHARGES: ViolentOffenceMeta[] = [
  {
    id: "common_assault_battery",
    label: "Common assault / battery",
    category: "assault_battery",
    statuteHint: "Common law offence (assault/battery)",
    mensRea: "mixed",
    violenceTags: ["assault", "violence"],
    coreIssues: [
      "identification",
      "intent",
      "selfDefence",
      "credibility",
      "continuity",
      "disclosure",
    ],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: false,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["cctvClarity", "independentWitnesses", "continuityComplete"],
  },
  {
    id: "abh_s47",
    label: "ABH (assault occasioning actual bodily harm)",
    category: "abh",
    statuteHint: "OAPA 1861 s.47 (ABH)",
    mensRea: "reckless",
    violenceTags: ["abh", "violence", "injury"],
    coreIssues: [
      "injurySeverity",
      "causation",
      "identification",
      "selfDefence",
      "credibility",
      "medicalCausation",
      "disclosure",
    ],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: true,
      injurySeverity: true,
      repetition: false,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["seriousHarm", "medicalCausation", "cctvClarity", "admissions"],
  },
  {
    id: "gbh_s20",
    label: "s.20 wounding / inflicting GBH",
    category: "gbh_s20",
    statuteHint: "OAPA 1861 s.20",
    mensRea: "reckless",
    violenceTags: ["gbh", "wounding", "violence", "injury"],
    coreIssues: [
      "injurySeverity",
      "causation",
      "identification",
      "selfDefence",
      "credibility",
      "forensics",
      "medicalCausation",
      "continuity",
      "disclosure",
    ],
    chargeStabilityInputs: {
      weaponRecovered: true,
      admissions: false,
      injurySeverity: true,
      repetition: false,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: [
      "seriousHarm",
      "medicalCausation",
      "weaponRecovered",
      "forensics",
      "continuityComplete",
      "cctvClarity",
    ],
  },
  {
    id: "gbh_s18_intent",
    label: "s.18 GBH with intent",
    category: "gbh_s18",
    statuteHint: "OAPA 1861 s.18",
    mensRea: "intent",
    violenceTags: ["gbh", "intent", "serious_violence", "injury"],
    coreIssues: [
      "intent",
      "injurySeverity",
      "causation",
      "identification",
      "selfDefence",
      "credibility",
      "forensics",
      "medicalCausation",
      "continuity",
      "disclosure",
    ],
    chargeStabilityInputs: {
      weaponRecovered: true,
      admissions: true,
      injurySeverity: true,
      repetition: true,
      targeting: true,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: [
      "seriousHarm",
      "targetedVitalArea",
      "repeatedBlows",
      "premeditationIndicators",
      "threats",
      "weaponRecovered",
      "admissions",
      "cctvClarity",
      "continuityComplete",
    ],
  },
  {
    id: "robbery_violent_theft",
    label: "Robbery (violent theft)",
    category: "robbery",
    statuteHint: "Theft Act 1968 s.8 (robbery)",
    mensRea: "intent",
    violenceTags: ["robbery", "theft", "violence", "threats"],
    coreIssues: [
      "identification",
      "intent",
      "credibility",
      "continuity",
      "disclosure",
      "forensics",
    ],
    chargeStabilityInputs: {
      weaponRecovered: true,
      admissions: true,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: [
      "cctvClarity",
      "independentWitnesses",
      "weaponRecovered",
      "continuityComplete",
      "admissions",
    ],
  },
  {
    id: "affray",
    label: "Affray",
    category: "public_order",
    statuteHint: "Public Order Act 1986 s.3 (affray)",
    mensRea: "mixed",
    violenceTags: ["public_order", "violence", "crowd"],
    coreIssues: ["identification", "credibility", "continuity", "disclosure"],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: false,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["cctvClarity", "independentWitnesses", "continuityComplete"],
  },
  {
    id: "violent_disorder",
    label: "Violent disorder",
    category: "public_order",
    statuteHint: "Public Order Act 1986 s.2 (violent disorder)",
    mensRea: "mixed",
    violenceTags: ["public_order", "violence", "crowd"],
    coreIssues: ["identification", "credibility", "continuity", "disclosure"],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: false,
      injurySeverity: false,
      repetition: true,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["cctvClarity", "independentWitnesses", "continuityComplete"],
  },
  {
    id: "threats_to_kill",
    label: "Threats to kill",
    category: "threats",
    statuteHint: "OAPA 1861 s.16 (threats to kill)",
    mensRea: "intent",
    violenceTags: ["threats", "violence", "domestic_context"],
    coreIssues: ["intent", "credibility", "disclosure", "hearsay", "domesticContext"],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: true,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: false,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["threats", "admissions", "independentWitnesses", "cctvClarity"],
  },
  {
    id: "possession_bladed_article",
    label: "Possession of bladed article",
    category: "weapons_possession",
    statuteHint: "CJA 1988 s.139/s.139A (bladed article)",
    mensRea: "mixed",
    violenceTags: ["weapon", "knife"],
    coreIssues: ["continuity", "forensics", "disclosure", "credibility"],
    chargeStabilityInputs: {
      weaponRecovered: true,
      admissions: false,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: false,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["weaponRecovered", "continuityComplete", "forensics", "cctvClarity"],
  },
  {
    id: "possession_offensive_weapon",
    label: "Possession of offensive weapon",
    category: "weapons_possession",
    statuteHint: "Prevention of Crime Act 1953 s.1 (offensive weapon)",
    mensRea: "mixed",
    violenceTags: ["weapon"],
    coreIssues: ["continuity", "forensics", "disclosure", "credibility"],
    chargeStabilityInputs: {
      weaponRecovered: true,
      admissions: false,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: false,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["weaponRecovered", "continuityComplete", "forensics", "cctvClarity"],
  },
  {
    id: "threatening_with_weapon_or_blade",
    label: "Threatening with weapon / bladed article",
    category: "weapons_possession",
    statuteHint: "Threatening with article (bladed/offensive weapon) – statutory offence (label only)",
    mensRea: "intent",
    violenceTags: ["weapon", "threats", "knife"],
    coreIssues: ["intent", "identification", "credibility", "disclosure", "continuity"],
    chargeStabilityInputs: {
      weaponRecovered: true,
      admissions: false,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: true,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["weaponRecovered", "cctvClarity", "independentWitnesses", "threats", "continuityComplete"],
  },
  {
    id: "non_fatal_strangulation",
    label: "Non-fatal strangulation / suffocation",
    category: "strangulation",
    statuteHint: "Domestic Abuse Act 2021 (non-fatal strangulation) – label only",
    mensRea: "intent",
    violenceTags: ["strangulation", "domestic_context", "injury"],
    coreIssues: ["injurySeverity", "causation", "credibility", "domesticContext", "disclosure"],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: true,
      injurySeverity: true,
      repetition: false,
      targeting: true,
      CCTVClarity: false,
      firstAccountConsistency: true,
    },
    chargeStabilitySignals: ["medicalCausation", "independentWitnesses", "admissions", "cctvClarity"],
  },
  {
    id: "generic_violent_incident",
    label: "Generic violent incident (fallback)",
    category: "generic_violent",
    statuteHint: "Fallback classification (no specific charge asserted)",
    mensRea: "mixed",
    violenceTags: ["violence", "fallback"],
    coreIssues: [
      "identification",
      "intent",
      "selfDefence",
      "causation",
      "credibility",
      "continuity",
      "disclosure",
      "forensics",
      "domesticContext",
      "injurySeverity",
    ],
    chargeStabilityInputs: {
      weaponRecovered: false,
      admissions: false,
      injurySeverity: false,
      repetition: false,
      targeting: false,
      CCTVClarity: false,
      firstAccountConsistency: true,
    },
  },
];

export function getViolentChargeById(id: ViolentOffenceId): ViolentOffenceMeta | undefined {
  return VIOLENT_CHARGES.find((c) => c.id === id);
}


