/**
 * Versioned evidence-dimension domain registry for EVS-01.
 *
 * Derived from accepted canonical five-answers schema + observed ESA packet tokens.
 * Does not invent tokens. Existence and reliability domains are disjoint by construction.
 *
 * Sources:
 * - lib/criminal/five-answers/types.ts (EvidenceExistence, EvidenceReliability)
 * - lib/criminal/evidence-state-reconcile.ts (other_defendant_only existence extension)
 * - Observed unique-valid ESA fiveAnswersEvidenceRows tokens (499 packets)
 */

export const EVIDENCE_DIMENSION_DOMAIN_REGISTRY_VERSION = "1.0.0" as const;

/** Canonical EvidenceExistence from five-answers/types.ts */
export const CANONICAL_EXISTENCE_TOKENS = [
  "served",
  "referred_only",
  "missing",
  "incomplete",
  "unknown",
  "not_safely_confirmed",
] as const;

/**
 * Observed/reconcile extension retained on ESA fiveAnswers rows.
 * canonicalizeEvidenceExistence may emit other_defendant_only; packets confirm it.
 * Not in EvidenceExistence type union — recorded here as an explicit extension.
 */
export const OBSERVED_EXISTENCE_EXTENSIONS = ["other_defendant_only"] as const;

/** Canonical EvidenceReliability from five-answers/types.ts */
export const CANONICAL_RELIABILITY_TOKENS = [
  "strong",
  "weak",
  "contested",
  "unsafe",
  "inference_only",
  "needs_review",
] as const;

/** Observed reliability tokens on ESA fiveAnswers (subset of canonical). */
export const OBSERVED_RELIABILITY_TOKENS = ["needs_review", "weak"] as const;

/** Observed existence tokens on ESA fiveAnswers. */
export const OBSERVED_EXISTENCE_TOKENS = [
  "unknown",
  "incomplete",
  "missing",
  "referred_only",
  "served",
  "other_defendant_only",
] as const;

export type ExistenceDomainToken =
  | (typeof CANONICAL_EXISTENCE_TOKENS)[number]
  | (typeof OBSERVED_EXISTENCE_EXTENSIONS)[number];

export type ReliabilityDomainToken = (typeof CANONICAL_RELIABILITY_TOKENS)[number];

export const EXISTENCE_DOMAIN: ReadonlySet<string> = new Set<string>([
  ...CANONICAL_EXISTENCE_TOKENS,
  ...OBSERVED_EXISTENCE_EXTENSIONS,
]);

export const RELIABILITY_DOMAIN: ReadonlySet<string> = new Set<string>([...CANONICAL_RELIABILITY_TOKENS]);

/** Tokens that appear in both domains — must be empty for unambiguous promotion. */
export function domainIntersection(): string[] {
  return [...EXISTENCE_DOMAIN].filter((t) => RELIABILITY_DOMAIN.has(t)).sort();
}

export function domainsAreDisjoint(): boolean {
  return domainIntersection().length === 0;
}

export function isExistenceToken(token: string): boolean {
  return EXISTENCE_DOMAIN.has(token.toLowerCase());
}

export function isReliabilityToken(token: string): boolean {
  return RELIABILITY_DOMAIN.has(token.toLowerCase());
}

export type DimensionTokenClass =
  | "existence"
  | "reliability"
  | "out_of_domain"
  | "empty";

export function classifyDimensionToken(token: string): DimensionTokenClass {
  const t = token.trim().toLowerCase();
  if (!t) return "empty";
  if (isExistenceToken(t) && isReliabilityToken(t)) {
    // Should never happen when domainsAreDisjoint(); treat as ambiguous out_of_domain.
    return "out_of_domain";
  }
  if (isExistenceToken(t)) return "existence";
  if (isReliabilityToken(t)) return "reliability";
  return "out_of_domain";
}

export type EvidenceDimensionDomainRegistryDoc = {
  schemaVersion: typeof EVIDENCE_DIMENSION_DOMAIN_REGISTRY_VERSION;
  title: string;
  sources: string[];
  existenceDomain: {
    canonical: readonly string[];
    observedExtensions: readonly string[];
    observedOnEsa: readonly string[];
    permitted: string[];
  };
  reliabilityDomain: {
    canonical: readonly string[];
    observedOnEsa: readonly string[];
    permitted: string[];
  };
  intersection: string[];
  domainsDisjoint: boolean;
  promotionEligible: boolean;
  ambiguityNote: string | null;
  hardRules: readonly string[];
};

export function buildEvidenceDimensionDomainRegistryDoc(): EvidenceDimensionDomainRegistryDoc {
  const intersection = domainIntersection();
  const disjoint = intersection.length === 0;
  return {
    schemaVersion: EVIDENCE_DIMENSION_DOMAIN_REGISTRY_VERSION,
    title: "Evidence dimension domain registry (existence vs reliability)",
    sources: [
      "lib/criminal/five-answers/types.ts#EvidenceExistence",
      "lib/criminal/five-answers/types.ts#EvidenceReliability",
      "lib/criminal/five-answers/evidence-trace.ts#FIVE_ANSWERS_HARD_RULES",
      "lib/criminal/evidence-state-reconcile.ts#canonicalizeEvidenceExistence",
      "ESA unique-valid fiveAnswersEvidenceRows token inventory (499)",
    ],
    existenceDomain: {
      canonical: CANONICAL_EXISTENCE_TOKENS,
      observedExtensions: OBSERVED_EXISTENCE_EXTENSIONS,
      observedOnEsa: OBSERVED_EXISTENCE_TOKENS,
      permitted: [...EXISTENCE_DOMAIN].sort(),
    },
    reliabilityDomain: {
      canonical: CANONICAL_RELIABILITY_TOKENS,
      observedOnEsa: OBSERVED_RELIABILITY_TOKENS,
      permitted: [...RELIABILITY_DOMAIN].sort(),
    },
    intersection,
    domainsDisjoint: disjoint,
    promotionEligible: disjoint,
    ambiguityNote: disjoint
      ? null
      : `Ambiguous cross-domain tokens: ${intersection.join(", ")} — EVS-01 must remain partially_implemented.`,
    hardRules: [
      "Served does not mean reliable.",
      "Missing does not mean irrelevant.",
      "Referred only does not mean usable.",
      "Inference must be labelled as inference.",
      "No line is sendable just because a source exists.",
    ],
  };
}
