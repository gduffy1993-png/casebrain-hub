/**
 * Canonical offence resolution for criminal cases (England & Wales).
 * Resolves a single offence type from charges, matter (alleged offence), and optional bundle text.
 * Used by strategy engine and UI so offence-specific behaviour is consistent.
 */

import {
  type OffenceType,
  OFFENCE_TYPE_LABELS,
  normaliseOffenceType,
} from "@/lib/criminal/strategy-suggest/constants";

export type ResolvedOffence = {
  offenceType: OffenceType;
  label: string;
  source: "charges" | "matter" | "bundle" | "unknown" | "override";
};

export type OffenceResolutionInput = {
  charges: Array<{ offence: string; section?: string | null }>;
  allegedOffence?: string | null;
  bundleSnippet?: string;
};

const SECTION_OFFENCE_MAP: Array<{ pattern: RegExp; type: OffenceType }> = [
  { pattern: /\bs\.?\s*18\b|\boapa\s*18\b|wounding with intent|grievous bodily harm.*intent/i, type: "assault_oapa" },
  { pattern: /\bs\.?\s*20\b|\boapa\s*20\b|unlawful wounding|gbh\b/i, type: "assault_oapa" },
  { pattern: /\bs\.?\s*47\b|\boapa\s*47\b|abh\b|actual bodily harm/i, type: "assault_oapa" },
  { pattern: /\bs\.?\s*9\b|\btheft act.*9\b|burglary/i, type: "burglary" },
  { pattern: /\bs\.?\s*1\b.*theft|\btheft\b(?!\s*act)/i, type: "theft" },
  { pattern: /\brobbery\b/i, type: "robbery" },
  { pattern: /\barson\b|\bcriminal damage\b|s\.?\s*1\s*cda\b|s\.?\s*5\s*cda\b/i, type: "criminal_damage_arson" },
  { pattern: /\bdrugs?\b|possession.*controlled|supply.*controlled|misuse of drugs/i, type: "drugs" },
  { pattern: /\bfraud\b|false representation|fraud act/i, type: "fraud" },
  { pattern: /\bsexual\b|rape\b|assault.*sexual|indecent/i, type: "sexual" },
  { pattern: /\baffray\b|violent disorder|public order/i, type: "public_order" },
];

function inferOffenceTypeFromText(text: string): OffenceType | null {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (t.length < 2) return null;
  for (const { pattern, type } of SECTION_OFFENCE_MAP) {
    if (pattern.test(t)) return type;
  }
  return null;
}

/**
 * Resolve a single canonical offence from charges, matter alleged offence, and optional bundle text.
 * Priority: charges (first charge) > matter allegedOffence > bundle snippet. Returns "unknown" only if none yield a match.
 */
export function resolveOffence(input: OffenceResolutionInput): ResolvedOffence {
  const { charges, allegedOffence, bundleSnippet } = input;

  // 1) From charges (most authoritative)
  if (charges && charges.length > 0) {
    for (const c of charges) {
      const combined = [c.offence, c.section].filter(Boolean).join(" ");
      const type = inferOffenceTypeFromText(combined);
      if (type) {
        return {
          offenceType: normaliseOffenceType(type),
          label: OFFENCE_TYPE_LABELS[type],
          source: "charges",
        };
      }
    }
  }

  // 2) From matter alleged offence
  if (allegedOffence && typeof allegedOffence === "string") {
    const type = inferOffenceTypeFromText(allegedOffence);
    if (type) {
      return {
        offenceType: normaliseOffenceType(type),
        label: OFFENCE_TYPE_LABELS[type],
        source: "matter",
      };
    }
  }

  // 3) From bundle snippet (e.g. first 2000 chars of combined doc text)
  if (bundleSnippet && typeof bundleSnippet === "string") {
    const type = inferOffenceTypeFromText(bundleSnippet);
    if (type) {
      return {
        offenceType: normaliseOffenceType(type),
        label: OFFENCE_TYPE_LABELS[type],
        source: "bundle",
      };
    }
  }

  return {
    offenceType: "other",
    label: "Unknown – add charge sheet / evidence for offence-specific strategy",
    source: "unknown",
  };
}
