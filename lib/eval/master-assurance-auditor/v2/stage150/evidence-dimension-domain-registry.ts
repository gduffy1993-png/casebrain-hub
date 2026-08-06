/**
 * Versioned evidence-dimension domain registry for EVS-01 (v2.0.0).
 *
 * Orthogonal domains — tokens must not silently satisfy foreign dimensions:
 * - existence/service
 * - lifecycle/version
 * - access/confidentiality
 * - attribution/defendant scope
 * - reliability
 *
 * `other_defendant_only` belongs to attribution/scope, NOT existence.
 * Lifecycle tokens (draft/signed/operative/superseded/amended) never satisfy existence.
 * Access tokens (privileged/restricted) never satisfy existence.
 */
export const EVIDENCE_DIMENSION_DOMAIN_REGISTRY_VERSION = "2.0.0" as const;

export const EXISTENCE_SERVICE_TOKENS = [
  "served",
  "referred_only",
  "missing",
  "incomplete",
  "unknown",
  "not_safely_confirmed",
] as const;

export const LIFECYCLE_VERSION_TOKENS = [
  "draft",
  "signed",
  "superseded",
  "operative",
  "amended",
  "draft_superseded",
] as const;

export const ACCESS_CONFIDENTIALITY_TOKENS = [
  "privileged",
  "restricted",
  "ordinary_disclosure",
] as const;

export const ATTRIBUTION_DEFENDANT_SCOPE_TOKENS = [
  "other_defendant_only",
  "defendant_0",
  "multi_defendant",
] as const;

export const RELIABILITY_TOKENS = [
  "strong",
  "weak",
  "contested",
  "unsafe",
  "inference_only",
  "needs_review",
] as const;

/** @deprecated Use EXISTENCE_SERVICE_TOKENS — kept for import compatibility. */
export const CANONICAL_EXISTENCE_TOKENS = EXISTENCE_SERVICE_TOKENS;
/** @deprecated — other_defendant_only moved to attribution domain in v2.0.0 */
export const OBSERVED_EXISTENCE_EXTENSIONS = [] as const;
/** @deprecated */
export const CANONICAL_RELIABILITY_TOKENS = RELIABILITY_TOKENS;
/** @deprecated */
export const OBSERVED_RELIABILITY_TOKENS = ["needs_review", "weak"] as const;
/** @deprecated */
export const OBSERVED_EXISTENCE_TOKENS = EXISTENCE_SERVICE_TOKENS;

export type ExistenceDomainToken = (typeof EXISTENCE_SERVICE_TOKENS)[number];
export type ReliabilityDomainToken = (typeof RELIABILITY_TOKENS)[number];
export type LifecycleDomainToken = (typeof LIFECYCLE_VERSION_TOKENS)[number];
export type AccessDomainToken = (typeof ACCESS_CONFIDENTIALITY_TOKENS)[number];
export type AttributionDomainToken = (typeof ATTRIBUTION_DEFENDANT_SCOPE_TOKENS)[number];

export const EXISTENCE_DOMAIN: ReadonlySet<string> = new Set<string>([...EXISTENCE_SERVICE_TOKENS]);
export const LIFECYCLE_DOMAIN: ReadonlySet<string> = new Set<string>([...LIFECYCLE_VERSION_TOKENS]);
export const ACCESS_DOMAIN: ReadonlySet<string> = new Set<string>([...ACCESS_CONFIDENTIALITY_TOKENS]);
export const ATTRIBUTION_DOMAIN: ReadonlySet<string> = new Set<string>([
  ...ATTRIBUTION_DEFENDANT_SCOPE_TOKENS,
]);
export const RELIABILITY_DOMAIN: ReadonlySet<string> = new Set<string>([...RELIABILITY_TOKENS]);

export function domainIntersection(): string[] {
  const all = [
    EXISTENCE_DOMAIN,
    LIFECYCLE_DOMAIN,
    ACCESS_DOMAIN,
    ATTRIBUTION_DOMAIN,
    RELIABILITY_DOMAIN,
  ];
  const seen = new Map<string, number>();
  for (const dom of all) {
    for (const t of dom) seen.set(t, (seen.get(t) || 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([t]) => t).sort();
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
export function isLifecycleToken(token: string): boolean {
  return LIFECYCLE_DOMAIN.has(token.toLowerCase());
}
export function isAccessToken(token: string): boolean {
  return ACCESS_DOMAIN.has(token.toLowerCase());
}
export function isAttributionToken(token: string): boolean {
  return ATTRIBUTION_DOMAIN.has(token.toLowerCase());
}

export type DimensionTokenClass =
  | "existence"
  | "lifecycle"
  | "access"
  | "attribution"
  | "reliability"
  | "out_of_domain"
  | "empty";

export function classifyDimensionToken(token: string): DimensionTokenClass {
  const t = token.trim().toLowerCase();
  if (!t) return "empty";
  const hits: DimensionTokenClass[] = [];
  if (isExistenceToken(t)) hits.push("existence");
  if (isLifecycleToken(t)) hits.push("lifecycle");
  if (isAccessToken(t)) hits.push("access");
  if (isAttributionToken(t)) hits.push("attribution");
  if (isReliabilityToken(t)) hits.push("reliability");
  if (hits.length === 1) return hits[0]!;
  if (hits.length > 1) return "out_of_domain";
  return "out_of_domain";
}

/**
 * True when a token from a foreign domain is placed in an existence field.
 * Lifecycle/access/attribution tokens must not satisfy existence silently.
 */
export function existenceFieldRejectsForeignToken(token: string): boolean {
  const c = classifyDimensionToken(token);
  return c === "lifecycle" || c === "access" || c === "attribution" || c === "reliability";
}

export type EvidenceDimensionDomainRegistryDoc = {
  schemaVersion: typeof EVIDENCE_DIMENSION_DOMAIN_REGISTRY_VERSION;
  title: string;
  sources: string[];
  domains: Record<string, string[]>;
  intersection: string[];
  domainsDisjoint: boolean;
  hardRules: readonly string[];
};

export function buildEvidenceDimensionDomainRegistryDoc(): EvidenceDimensionDomainRegistryDoc {
  return {
    schemaVersion: EVIDENCE_DIMENSION_DOMAIN_REGISTRY_VERSION,
    title: "Evidence dimension domain registry (five orthogonal domains)",
    sources: [
      "lib/criminal/five-answers/types.ts",
      "V2.1.1 review blocker E — dimension ownership",
    ],
    domains: {
      existence_service: [...EXISTENCE_SERVICE_TOKENS],
      lifecycle_version: [...LIFECYCLE_VERSION_TOKENS],
      access_confidentiality: [...ACCESS_CONFIDENTIALITY_TOKENS],
      attribution_defendant_scope: [...ATTRIBUTION_DEFENDANT_SCOPE_TOKENS],
      reliability: [...RELIABILITY_TOKENS],
    },
    intersection: domainIntersection(),
    domainsDisjoint: domainsAreDisjoint(),
    hardRules: [
      "other_defendant_only belongs to attribution/scope — never existence.",
      "draft/signed/operative/superseded/amended belong only to lifecycle.",
      "privileged/restricted belong only to access.",
      "Existence remains served/referred_only/missing/incomplete/unknown/not_safely_confirmed.",
      "Cross-dimension tokens must be rejected or explicitly migrated — never silently allowlisted into existence.",
    ],
  };
}
