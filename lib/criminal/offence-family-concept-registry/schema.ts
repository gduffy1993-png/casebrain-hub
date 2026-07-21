/**
 * Versioned offence-family concept registry (Phase 4).
 * Source-backed / conditional concepts require structured provenance + evidence IDs —
 * keyword presence in free-text hay alone is insufficient.
 */

import type { SolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";

export const OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION = "1.0.0" as const;

/** Allowance tiers for a concept relative to an activated family set. */
export type ConceptAllowanceTier =
  | "allowed"
  | "conditional_provenance"
  | "forbidden"
  | "uncertain_fail_closed";

export type ConceptId =
  | "harassment_pfha"
  | "digital_comms_attribution"
  | "phone_extraction"
  | "drugs_supply_pwits"
  | "drugs_possession"
  | "defensive_force_self_defence"
  | "vehicle_ownership_motoring"
  | "violence_assault"
  | "theft_dishonesty";

export type StructuredProvenanceRef = {
  /** Stable evidence id (canonical ev_* or truth-key derived). */
  evidenceId: string;
  label: string;
  existence?: string | null;
  sourceDocument?: string | null;
  sourcePage?: string | null;
};

export type FamilyActivationSource =
  | "allegation"
  | "charge_wording"
  | "evidence_item"
  | "truth_key_offence_family"
  | "audit_scenario_family"
  | "explicit_registry";

export type FamilyActivation = {
  family: SolicitorOffenceFamily;
  source: FamilyActivationSource;
  /** Human-readable activation reason (no case PII beyond family labels). */
  reason: string;
  provenance: StructuredProvenanceRef[];
};

export type ConceptRegistryEntry = {
  conceptId: ConceptId;
  label: string;
  /** Detects the concept in solicitor-generated wording. */
  detectInOutput: RegExp;
  /**
   * Evidence-label patterns that can *activate* this concept when matched against
   * a structured evidence item (id required). Not used alone on free-text hay.
   */
  activateFromEvidenceLabel: RegExp;
  /** Families for which this concept is native (allowed without extra provenance). */
  nativeFamilies: SolicitorOffenceFamily[];
  /**
   * Families that may use the concept only with structured provenance linking
   * an evidenceId whose label matches activateFromEvidenceLabel.
   */
  conditionalFamilies: SolicitorOffenceFamily[];
  /** If true, concept is always forbidden unless native or conditional+provenance. */
  defaultForbiddenOutsideNative: boolean;
};

export const OFFENCE_FAMILY_CONCEPT_REGISTRY: ConceptRegistryEntry[] = [
  {
    conceptId: "harassment_pfha",
    label: "harassment / PFHA",
    detectInOutput: /\bprotection from harassment\b|\bharassment\b|\bstalking\b/i,
    activateFromEvidenceLabel: /harassment|stalking|protection from harassment|pfha|mg11|whatsapp|message/i,
    nativeFamilies: ["harassment_digital", "harassment_other"],
    conditionalFamilies: ["violence", "drugs_possession", "drugs_supply", "theft", "motoring"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "digital_comms_attribution",
    label: "digital / attribution",
    detectInOutput: /\battribution\b|\bsubscriber\b|\bhandset\b|\bwho sent\b/i,
    activateFromEvidenceLabel: /attribution|subscriber|handset|whatsapp|sms|phone|screenshot/i,
    nativeFamilies: ["harassment_digital"],
    conditionalFamilies: ["harassment_other", "violence", "theft"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "phone_extraction",
    label: "phone extraction",
    detectInOutput: /\bphone extraction\b|\bphone download\b|\bextraction summary\b/i,
    activateFromEvidenceLabel: /phone|extraction|handset|download|whatsapp|sms|subscriber/i,
    nativeFamilies: ["harassment_digital"],
    conditionalFamilies: ["harassment_other", "violence", "theft", "drugs_possession", "drugs_supply"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "drugs_supply_pwits",
    label: "drugs supply / PWITS",
    detectInOutput: /\bintent to supply\b|\bpwits\b|\bsupply of (?:a )?controlled drug\b/i,
    activateFromEvidenceLabel: /\bdrug\b|pwits|intent to supply|controlled drug|wrap|dealer/i,
    nativeFamilies: ["drugs_supply"],
    conditionalFamilies: ["drugs_possession", "theft", "violence", "motoring", "harassment_digital", "harassment_other"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "drugs_possession",
    label: "drugs possession",
    detectInOutput: /\bpossession of (?:a )?controlled drug\b|\bdrug continuity\b|\bdrug possession\b/i,
    activateFromEvidenceLabel: /\bdrug\b|controlled drug|pwits|possession|wrap/i,
    nativeFamilies: ["drugs_possession", "drugs_supply"],
    conditionalFamilies: ["theft", "violence", "motoring", "harassment_digital", "harassment_other"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "defensive_force_self_defence",
    label: "defensive force / self-defence",
    detectInOutput: /\bdefensive force\b|\bself[-\s]?defence\b|\breasonable force\b/i,
    activateFromEvidenceLabel: /self[-\s]?defence|defensive force|reasonable force|assault|gbh|abh|violence|injury/i,
    nativeFamilies: ["violence"],
    conditionalFamilies: ["theft", "harassment_other", "harassment_digital", "drugs_possession", "drugs_supply", "motoring"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "vehicle_ownership_motoring",
    label: "vehicle ownership / motoring",
    detectInOutput: /\bvehicle ownership\b|\bnumber plate\b|\bvrm\b|\bintoxilyser\b|\bdrink[-\s]?drive\b/i,
    activateFromEvidenceLabel: /vehicle|registration|vrm|number plate|motoring|breath|intoxilyser|driving/i,
    nativeFamilies: ["motoring"],
    conditionalFamilies: ["theft", "violence", "drugs_possession", "drugs_supply"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "violence_assault",
    label: "violence / assault",
    detectInOutput: /\bgbh\b|\babh\b|\bassault occasioning\b|\bwounding\b/i,
    activateFromEvidenceLabel: /gbh|abh|assault|wounding|violence|injury|s\.?\s*18|s\.?\s*20/i,
    nativeFamilies: ["violence"],
    conditionalFamilies: ["theft", "harassment_other", "harassment_digital"],
    defaultForbiddenOutsideNative: true,
  },
  {
    conceptId: "theft_dishonesty",
    label: "theft / dishonesty",
    detectInOutput: /\btheft\b|\bdishonest(?:ly)? appropriat|\bshoplift/i,
    activateFromEvidenceLabel: /theft|dishonest|shoplift|stolen|appropriat/i,
    nativeFamilies: ["theft"],
    conditionalFamilies: ["violence", "drugs_possession", "drugs_supply", "motoring"],
    defaultForbiddenOutsideNative: true,
  },
];

export function getConceptEntry(conceptId: ConceptId): ConceptRegistryEntry | undefined {
  return OFFENCE_FAMILY_CONCEPT_REGISTRY.find((c) => c.conceptId === conceptId);
}

/** Map messy-pdf / ESA audit scenario family strings → solicitor families (explicit adapter). */
export const AUDIT_FAMILY_TO_SOLICITOR: Record<string, SolicitorOffenceFamily> = {
  // Direct ESA / legacy
  harassment_digital: "harassment_digital",
  harassment_other: "harassment_other",
  harassment: "harassment_other",
  pwits: "drugs_supply",
  drugs_supply: "drugs_supply",
  drugs_possession: "drugs_possession",
  possession: "drugs_possession",
  violence: "violence",
  assault: "violence",
  gbh: "violence",
  theft: "theft",
  motoring: "motoring",
  "drink-drive": "motoring",
  // Messy v9 scenario families
  "domestic-harassment": "harassment_digital",
  "domestic-stalking": "harassment_other",
  "domestic-order-stack": "harassment_other",
  "phone-attribution": "harassment_digital",
  "phone-wrong-suspect": "harassment_digital",
  "edited-screenshots-metadata": "harassment_digital",
  "translated-messages": "harassment_digital",
  "social-media-handles": "harassment_digital",
  "prison-calls-attribution": "harassment_digital",
  "encro-handle-attribution": "harassment_digital",
  "encro-social-overlap": "harassment_digital",
  "restraining-order-breach": "harassment_other",
  "civil-order-overlap": "harassment_other",
  "drugs-county-lines": "drugs_supply",
  "drugs-runner-lab": "drugs_supply",
  "lab-continuity-conflict": "drugs_supply",
  "motoring-sjp": "motoring",
  "medical-gap-motoring": "motoring",
  "vehicle-telematics": "motoring",
  "anpr-attribution": "motoring",
  "robbery-cctv": "theft",
  "robbery-bwv-custody": "theft",
  "robbery-cctv-anpr": "theft",
  "fraud-bank-device": "theft",
  "fraud-device-subscriber": "theft",
  "public-order-bwv": "violence",
  "assault-public-order-bwv": "violence",
  "abe-first-account-third-party": "violence",
  "edited-bwv-footage": "violence",
  "bwv-transcript-no-video": "violence",
  "complainant-first-account": "violence",
  "witness-statement-conflict": "violence",
  "vulnerable-complainant": "violence",
  "forensic-dna-gap": "violence",
  "forensic-fingerprint-gap": "violence",
  "bail-condition-breach": "violence",
  // Process / layout traps — no offence cue → leave unmapped (unknown / fail-closed)
};

/**
 * Heuristic adapter for audit scenario family strings not in the explicit map.
 * Returns null when the string is process-only (no offence cue).
 */
export function mapAuditScenarioFamilyToSolicitor(
  raw: string | null | undefined,
): SolicitorOffenceFamily | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (key in AUDIT_FAMILY_TO_SOLICITOR) return AUDIT_FAMILY_TO_SOLICITOR[key]!;
  if (/harass|stalk|pfha|restraining|domestic-order|screenshot|whatsapp|encro|attribution|phone|message|sms|subscriber/.test(key)) {
    return /phone|screenshot|whatsapp|encro|attribution|sms|subscriber|message|digital/.test(key)
      ? "harassment_digital"
      : "harassment_other";
  }
  if (/pwits|county-lines|drugs|runner-lab|controlled.drug|intent.to.supply/.test(key)) {
    return /supply|pwits|county|runner|dealer/.test(key) ? "drugs_supply" : "drugs_possession";
  }
  if (/gbh|abh|assault|violence|wounding|public-order|bwv|abe|injury/.test(key)) return "violence";
  if (/theft|robbery|fraud|shoplift|dishonest/.test(key)) return "theft";
  if (/motoring|drink|drive|sjp|telematics|anpr|vehicle|intoxilyser|rta/.test(key)) return "motoring";
  return null;
}
