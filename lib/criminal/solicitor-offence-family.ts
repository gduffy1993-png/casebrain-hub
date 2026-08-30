/**
 * Practice / offence-family isolation for solicitor-facing output.
 * Fail closed when mapping is uncertain — never inherit wrong-family templates.
 *
 * Phase 4: source-backed / conditional concepts require structured evidence IDs
 * via offence-family-concept-registry. Keyword hay alone is not sufficient.
 */

import {
  classifyTextsAgainstConceptRegistry,
  type ProvenanceContext,
  type StructuredProvenanceRef,
} from "@/lib/criminal/offence-family-concept-registry";

export type SolicitorOffenceFamily =
  | "harassment_digital"
  | "harassment_other"
  | "violence"
  | "drugs_possession"
  | "drugs_supply"
  | "theft"
  | "robbery"
  | "motoring"
  | "unknown";

export type OffenceFamilyResolution = {
  family: SolicitorOffenceFamily;
  confidence: "high" | "low" | "uncertain";
  /** When uncertain, solicitor outputs must fail closed. */
  failClosed: boolean;
  reason: string;
};

/** @deprecated Prefer OFFENCE_FAMILY_CONCEPT_REGISTRY — kept for legacy readers. */
export const UNIVERSAL_WRONG_FAMILY_WITHOUT_SOURCE: Array<{
  concept: RegExp;
  requires: RegExp;
  label: string;
}> = [
  {
    concept: /\bvehicle ownership\b/i,
    requires: /vehicle|registration|vrm|number plate|motor vehicle/i,
    label: "vehicle ownership",
  },
  {
    concept: /\bintent to supply\b|\bpwits\b/i,
    requires: /\bdrug\b|pwits|intent to supply|controlled drug/i,
    label: "drugs supply / PWITS",
  },
  {
    concept: /\bpossession of (?:a )?controlled drug\b|\bdrug continuity\b/i,
    requires: /\bdrug\b|controlled drug|pwits|possession/i,
    label: "drugs possession",
  },
  {
    concept: /\bdefensive force\b|\bself[-\s]?defence\b|\breasonable force\b/i,
    requires: /self[-\s]?defence|defensive force|reasonable force|assault|gbh|abh|violence/i,
    label: "defensive force / self-defence",
  },
];

export function resolveSolicitorOffenceFamily(input: {
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
}): OffenceFamilyResolution {
  const hay = `${input.allegation ?? ""} ${input.chargeWording ?? ""} ${input.bundleHay ?? ""}`.toLowerCase();
  if (!hay.trim()) {
    return {
      family: "unknown",
      confidence: "uncertain",
      failClosed: true,
      reason: "No allegation or bundle text to map offence family.",
    };
  }

  const digitalHarassment =
    /harassment|protection from harassment/i.test(hay) &&
    /screenshot|phone|message|whatsapp|sms|subscriber|attribution|mg6|mg11|extraction|digital|handset/i.test(
      hay,
    );
  if (digitalHarassment) {
    return {
      family: "harassment_digital",
      confidence: "high",
      failClosed: false,
      reason: "Digital / phone harassment cues on papers.",
    };
  }

  if (/harassment|protection from harassment|stalking/i.test(hay)) {
    return {
      family: "harassment_other",
      confidence: "high",
      failClosed: false,
      reason: "Harassment / stalking charge on papers.",
    };
  }

  if (/\bpwits\b|intent to supply|supply of (?:a )?controlled drug/i.test(hay)) {
    return {
      family: "drugs_supply",
      confidence: "high",
      failClosed: false,
      reason: "Supply / PWITS cues on papers.",
    };
  }

  if (/possession of (?:a )?controlled drug|\bdrug possession\b|misuse of drugs/i.test(hay)) {
    return {
      family: "drugs_possession",
      confidence: "high",
      failClosed: false,
      reason: "Drug possession cues on papers.",
    };
  }

  if (/\bgbh\b|\babh\b|s\.?\s*18|s\.?\s*20|assault occasioning|wounding|violence/i.test(hay)) {
    return {
      family: "violence",
      confidence: "high",
      failClosed: false,
      reason: "Violence / assault cues on papers.",
    };
  }

  if (/sexual (?:assault|offence)|sexual offences act|\babe\b|indecent assault/i.test(hay)) {
    return {
      family: "violence",
      confidence: "high",
      failClosed: false,
      reason: "Sexual offence / ABE cues on papers (mapped to violence practice family).",
    };
  }

  if (/\brobbery\b/i.test(hay)) {
    return {
      family: "robbery",
      confidence: "high",
      failClosed: false,
      reason: "Robbery on the charge line.",
    };
  }

  if (/\btheft\b|dishonest(?:ly)? appropriat|shoplift/i.test(hay)) {
    return {
      family: "theft",
      confidence: "high",
      failClosed: false,
      reason: "Theft cues on papers.",
    };
  }

  if (/drink.?drive|dangerous driving|speeding|road traffic|motoring|breath|intoxilyser/i.test(hay)) {
    return {
      family: "motoring",
      confidence: "high",
      failClosed: false,
      reason: "Motoring cues on papers.",
    };
  }

  return {
    family: "unknown",
    confidence: "uncertain",
    failClosed: true,
    reason: "Offence family could not be mapped with confidence — solicitor review required.",
  };
}

export type WrongFamilyHitKind = "unsupported_template_leakage" | "source_backed_ok";

export type WrongFamilyHit = {
  label: string;
  kind: WrongFamilyHitKind;
};

export type ClassifyWrongFamilyOptions = {
  /** Structured evidence with IDs — required for source_backed_ok. */
  evidence?: StructuredProvenanceRef[];
  allegation?: string | null;
  chargeWording?: string | null;
  auditFamily?: string | null;
};

const FAMILY_SEED: Record<Exclude<SolicitorOffenceFamily, "unknown">, string> = {
  harassment_digital: "Harassment Protection from Harassment Act phone WhatsApp screenshots",
  harassment_other: "Harassment Protection from Harassment Act stalking",
  violence: "GBH assault occasioning actual bodily harm",
  drugs_possession: "Possession of a controlled drug",
  drugs_supply: "PWITS intent to supply controlled drug",
  theft: "Theft dishonest appropriation",
  robbery: "Robbery theft act force",
  motoring: "Drink drive road traffic intoxilyser",
};

/**
 * Family from the charge / short title only. Narrative hay is not used —
 * MG5 mentioning "theft" must not relabel a Robbery + s.47 charge.
 */
export function classifyFamilyFromChargeLine(chargeText: string | null | undefined): OffenceFamilyResolution {
  const hay = chargeText ?? "";
  if (!hay.trim()) {
    return {
      family: "unknown",
      confidence: "uncertain",
      failClosed: true,
      reason: "No charge line to map offence family.",
    };
  }

  const cues: Array<{ re: RegExp; family: SolicitorOffenceFamily; reason: string }> = [
    { re: /harassment|protection from harassment|stalking/i, family: "harassment_other", reason: "Harassment / stalking on the charge line." },
    { re: /\bpwits\b|intent to supply|supply of (?:a )?controlled drug/i, family: "drugs_supply", reason: "Supply / PWITS on the charge line." },
    { re: /possession of (?:a )?controlled drug|\bdrug possession\b|misuse of drugs/i, family: "drugs_possession", reason: "Drug possession on the charge line." },
    { re: /\brobbery\b/i, family: "robbery", reason: "Robbery on the charge line." },
    { re: /\bburglary\b/i, family: "theft", reason: "Burglary on the charge line." },
    { re: /\btheft\b|dishonest(?:ly)? appropriat|shoplift/i, family: "theft", reason: "Theft on the charge line." },
    {
      re: /\bgbh\b|\babh\b|grievous bodily harm|actual bodily harm|s\.?\s*18|s\.?\s*20|s\.?\s*47|s\.?\s*39|section\s*1[478]|section\s*20|section\s*39|assault occasioning|wounding|\bviolence\b|common assault|assaults? on emergency workers|assault an emergency worker/i,
      family: "violence",
      reason: "Violence / assault on the charge line.",
    },
    { re: /sexual (?:assault|offence)|sexual offences act|\babe\b|indecent assault/i, family: "violence", reason: "Sexual offence on the charge line (legacy violence map)." },
    { re: /drink.?drive|dangerous driving|speeding|road traffic|motoring|intoxilyser|driving a motor|motor vehicle|alcohol in breath|prescribed limit/i, family: "motoring", reason: "Motoring on the charge line." },
  ];

  let best: { index: number; family: SolicitorOffenceFamily; reason: string } | null = null;
  for (const cue of cues) {
    const m = hay.match(cue.re);
    if (m?.index == null) continue;
    if (!best || m.index < best.index) {
      best = { index: m.index, family: cue.family, reason: cue.reason };
    }
  }
  if (!best) {
    return {
      family: "unknown",
      confidence: "uncertain",
      failClosed: true,
      reason: "Charge line does not map a family.",
    };
  }
  return {
    family: best.family,
    confidence: "high",
    failClosed: false,
    reason: best.reason,
  };
}

/**
 * Classify cross-family concepts via the Phase-4 concept registry.
 * - unsupported_template_leakage → block (no structured provenance)
 * - source_backed_ok → allow only when evidence IDs activate the concept
 *
 * Keyword matches in bundleHay alone do NOT produce source_backed_ok.
 */
export function classifyWrongFamilyHits(
  text: string,
  resolution: OffenceFamilyResolution,
  bundleHay = "",
  options?: ClassifyWrongFamilyOptions,
): WrongFamilyHit[] {
  const allegation =
    options?.allegation ??
    (resolution.family !== "unknown"
      ? FAMILY_SEED[resolution.family as Exclude<SolicitorOffenceFamily, "unknown">]
      : null);

  const ctx: ProvenanceContext = {
    evidence: options?.evidence ?? [],
    allegation,
    chargeWording: options?.chargeWording,
    bundleHay,
    auditFamily: options?.auditFamily,
  };

  const classification = classifyTextsAgainstConceptRegistry([text], ctx);
  return classification.conceptVerdicts
    .filter((v) => v.kind === "unsupported_template_leakage" || v.kind === "source_backed_ok")
    .map((v) => ({
      label: v.label,
      kind: v.kind as WrongFamilyHitKind,
    }));
}

/** Unsupported leakage labels only (gates / filters). */
export function findWrongFamilyTerms(
  text: string,
  resolution: OffenceFamilyResolution,
  bundleHay = "",
  options?: ClassifyWrongFamilyOptions,
): string[] {
  return classifyWrongFamilyHits(text, resolution, bundleHay, options)
    .filter((h) => h.kind === "unsupported_template_leakage")
    .map((h) => h.label);
}

/**
 * Filter lines that introduce unsupported wrong-family concepts.
 * Scoped: only drops affected lines — does not empty the whole list on one optional failure
 * unless failClosed (uncertain primary family).
 */
export function filterWrongFamilyLines(
  lines: string[],
  resolution: OffenceFamilyResolution,
  bundleHay = "",
  options?: ClassifyWrongFamilyOptions,
): string[] {
  if (resolution.failClosed) return [];
  return lines.filter((line) => findWrongFamilyTerms(line, resolution, bundleHay, options).length === 0);
}
