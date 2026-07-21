/**
 * Practice / offence-family isolation for solicitor-facing output.
 * Fail closed when mapping is uncertain — never inherit wrong-family templates.
 */

export type SolicitorOffenceFamily =
  | "harassment_digital"
  | "harassment_other"
  | "violence"
  | "drugs_possession"
  | "drugs_supply"
  | "theft"
  | "motoring"
  | "unknown";

export type OffenceFamilyResolution = {
  family: SolicitorOffenceFamily;
  confidence: "high" | "low" | "uncertain";
  /** When uncertain, solicitor outputs must fail closed. */
  failClosed: boolean;
  reason: string;
};

/** Family-forbidden patterns with explicit source support checks (mixed cases allowed). */
const FAMILY_FORBIDDEN_WITH_SUPPORT: Record<
  Exclude<SolicitorOffenceFamily, "unknown">,
  Array<{ concept: RegExp; requires: RegExp; label: string }>
> = {
  harassment_digital: [
    { concept: /\bintent to supply\b/i, requires: /\bdrug\b|pwits|intent to supply|controlled drug/i, label: "intent to supply" },
    { concept: /\bpwits\b/i, requires: /\bdrug\b|pwits|intent to supply|controlled drug/i, label: "pwits" },
    { concept: /\bpossession of (?:a )?controlled drug\b/i, requires: /\bdrug\b|controlled drug|pwits/i, label: "drug possession" },
    { concept: /\bdrug continuity\b/i, requires: /\bdrug\b|controlled drug|pwits/i, label: "drug continuity" },
    { concept: /\bdefensive force\b/i, requires: /defensive force|self[-\s]?defence|assault|gbh|abh/i, label: "defensive force" },
    { concept: /\bself[-\s]?defence\b/i, requires: /self[-\s]?defence|defensive force|assault|gbh|abh/i, label: "self-defence" },
    { concept: /\breasonable force\b/i, requires: /reasonable force|self[-\s]?defence|assault|gbh|abh/i, label: "reasonable force" },
    { concept: /\bvehicle ownership\b/i, requires: /vehicle|registration|vrm|number plate/i, label: "vehicle ownership" },
  ],
  harassment_other: [
    { concept: /\bintent to supply\b|\bpwits\b/i, requires: /\bdrug\b|pwits|intent to supply|controlled drug/i, label: "drugs supply" },
    { concept: /\bpossession of (?:a )?controlled drug\b/i, requires: /\bdrug\b|controlled drug/i, label: "drug possession" },
    { concept: /\bdefensive force\b|\bself[-\s]?defence\b/i, requires: /self[-\s]?defence|defensive force|assault|gbh|abh/i, label: "defensive force" },
    { concept: /\bvehicle ownership\b/i, requires: /vehicle|registration|vrm|number plate/i, label: "vehicle ownership" },
  ],
  violence: [
    { concept: /\bintent to supply\b|\bpwits\b/i, requires: /\bdrug\b|pwits|intent to supply|controlled drug/i, label: "drugs supply" },
    { concept: /\bpossession of (?:a )?controlled drug\b/i, requires: /\bdrug\b|controlled drug/i, label: "drug possession" },
    { concept: /\bphone extraction summary\b/i, requires: /phone|extraction|handset|whatsapp|sms|subscriber/i, label: "phone extraction" },
  ],
  drugs_possession: [
    { concept: /\bdefensive force\b|\bself[-\s]?defence\b/i, requires: /self[-\s]?defence|defensive force|assault|gbh|abh/i, label: "defensive force" },
    { concept: /\bprotection from harassment\b/i, requires: /harassment|stalking|protection from harassment/i, label: "harassment" },
  ],
  drugs_supply: [
    { concept: /\bdefensive force\b|\bself[-\s]?defence\b/i, requires: /self[-\s]?defence|defensive force|assault|gbh|abh/i, label: "defensive force" },
    { concept: /\bprotection from harassment\b/i, requires: /harassment|stalking|protection from harassment/i, label: "harassment" },
  ],
  theft: [
    { concept: /\bintent to supply\b|\bpwits\b/i, requires: /\bdrug\b|pwits|intent to supply|controlled drug/i, label: "drugs supply" },
    { concept: /\bdefensive force\b/i, requires: /defensive force|self[-\s]?defence|assault|gbh|abh/i, label: "defensive force" },
    { concept: /\bprotection from harassment\b/i, requires: /harassment|stalking/i, label: "harassment" },
  ],
  motoring: [
    { concept: /\bintent to supply\b|\bpwits\b/i, requires: /\bdrug\b|pwits|intent to supply|controlled drug/i, label: "drugs supply" },
    { concept: /\bdefensive force\b/i, requires: /defensive force|self[-\s]?defence|assault|gbh|abh/i, label: "defensive force" },
    { concept: /\bprotection from harassment\b/i, requires: /harassment|stalking/i, label: "harassment" },
  ],
};

/** Concepts that must never appear unless the bundle explicitly supports them. */
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

/**
 * Classify cross-family concepts:
 * - unsupported_template_leakage → block (no source support)
 * - source_backed_ok → allow (mixed case / explicit evidence)
 */
export function classifyWrongFamilyHits(
  text: string,
  resolution: OffenceFamilyResolution,
  bundleHay = "",
): WrongFamilyHit[] {
  const hits: WrongFamilyHit[] = [];
  const hay = bundleHay.toLowerCase();
  const seen = new Set<string>();

  const push = (label: string, supported: boolean) => {
    const key = `${label}:${supported ? "ok" : "leak"}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({
      label,
      kind: supported ? "source_backed_ok" : "unsupported_template_leakage",
    });
  };

  for (const rule of UNIVERSAL_WRONG_FAMILY_WITHOUT_SOURCE) {
    if (rule.concept.test(text)) {
      push(rule.label, rule.requires.test(hay));
    }
  }

  if (resolution.family !== "unknown") {
    const rules = FAMILY_FORBIDDEN_WITH_SUPPORT[resolution.family] ?? [];
    for (const rule of rules) {
      if (rule.concept.test(text)) {
        push(rule.label, rule.requires.test(hay));
      }
    }
  }

  return hits;
}

/** Unsupported leakage labels only (gates / filters). */
export function findWrongFamilyTerms(
  text: string,
  resolution: OffenceFamilyResolution,
  bundleHay = "",
): string[] {
  return classifyWrongFamilyHits(text, resolution, bundleHay)
    .filter((h) => h.kind === "unsupported_template_leakage")
    .map((h) => h.label);
}

/** Filter lines that introduce unsupported wrong-family concepts for this matter. */
export function filterWrongFamilyLines(
  lines: string[],
  resolution: OffenceFamilyResolution,
  bundleHay = "",
): string[] {
  if (resolution.failClosed) return [];
  return lines.filter((line) => findWrongFamilyTerms(line, resolution, bundleHay).length === 0);
}
