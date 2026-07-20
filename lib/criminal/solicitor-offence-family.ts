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

const FAMILY_FORBIDDEN: Record<
  Exclude<SolicitorOffenceFamily, "unknown">,
  RegExp[]
> = {
  harassment_digital: [
    /\bintent to supply\b/i,
    /\bpwits\b/i,
    /\bpossession of (?:a )?controlled drug\b/i,
    /\bdrug continuity\b/i,
    /\bdefensive force\b/i,
    /\bself[-\s]?defence\b/i,
    /\breasonable force\b/i,
    /\bvehicle ownership\b/i,
    /\bVRM\b/,
    /\bnumber plate\b/i,
  ],
  harassment_other: [
    /\bintent to supply\b/i,
    /\bpwits\b/i,
    /\bpossession of (?:a )?controlled drug\b/i,
    /\bdefensive force\b/i,
    /\bself[-\s]?defence\b/i,
    /\bvehicle ownership\b/i,
  ],
  violence: [
    /\bintent to supply\b/i,
    /\bpwits\b/i,
    /\bpossession of (?:a )?controlled drug\b/i,
    /\bphone extraction summary\b/i,
  ],
  drugs_possession: [
    /\bdefensive force\b/i,
    /\bself[-\s]?defence\b/i,
    /\bprotection from harassment\b/i,
  ],
  drugs_supply: [
    /\bdefensive force\b/i,
    /\bself[-\s]?defence\b/i,
    /\bprotection from harassment\b/i,
  ],
  theft: [
    /\bintent to supply\b/i,
    /\bpwits\b/i,
    /\bdefensive force\b/i,
    /\bprotection from harassment\b/i,
  ],
  motoring: [
    /\bintent to supply\b/i,
    /\bpwits\b/i,
    /\bdefensive force\b/i,
    /\bprotection from harassment\b/i,
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

export function findWrongFamilyTerms(
  text: string,
  resolution: OffenceFamilyResolution,
  bundleHay = "",
): string[] {
  const hits: string[] = [];
  const hay = bundleHay.toLowerCase();

  for (const rule of UNIVERSAL_WRONG_FAMILY_WITHOUT_SOURCE) {
    if (rule.concept.test(text) && !rule.requires.test(hay)) {
      hits.push(rule.label);
    }
  }

  if (resolution.family === "unknown") {
    return hits;
  }

  const forbidden = FAMILY_FORBIDDEN[resolution.family] ?? [];
  for (const re of forbidden) {
    if (re.test(text)) {
      const label = re.source.replace(/\\b/g, "").replace(/\(\?:|\)|\?/g, "").slice(0, 48);
      if (!hits.includes(label)) hits.push(label);
    }
  }

  return hits;
}

/** Filter lines that introduce wrong-family concepts for this matter. */
export function filterWrongFamilyLines(
  lines: string[],
  resolution: OffenceFamilyResolution,
  bundleHay = "",
): string[] {
  if (resolution.failClosed) return [];
  return lines.filter((line) => findWrongFamilyTerms(line, resolution, bundleHay).length === 0);
}
