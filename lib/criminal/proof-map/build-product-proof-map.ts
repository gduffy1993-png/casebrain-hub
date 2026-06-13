import { generateProofMap } from "@/lib/eval/casebrain-auditor/proof-map-generate";
import type { ProofMapLink, ProofMapLinkType, ProofMapOffenceLens } from "@/lib/eval/casebrain-auditor/proof-map-types";
import { FORBIDDEN_PROOF_MAP_PHRASES } from "@/lib/eval/casebrain-auditor/proof-map-types";
import {
  assessBundleAvailability,
  type BundleAvailabilityInput,
} from "@/lib/criminal/reasoning-v2/bundle-availability";
import {
  gateChaseLine,
  gateMaterialLine,
  familiesInText,
  familySupport,
} from "@/lib/criminal/chase-source-gate";
import {
  containsDevRef,
  containsPublicDevLabel,
  isSafePublicDisplayLine,
  safeSolicitorCaseTitle,
  sanitizePublicDisplayLine,
  scrubDevRefs,
} from "@/lib/criminal/dev-ref-scrub";
import { resolveWorkflowProfileFromSignals } from "@/lib/criminal/pilot-workflow";
import {
  sanitizeHumanReviewReason,
  sanitizeReasoningPublicText,
  toProductConfidence,
} from "@/lib/criminal/reasoning-v2/sanitize-reasoning-text";
import type {
  ProductProofMapConfidence,
  ProductProofMapLink,
  ProductProofMapProofPoint,
  ProductProofMapResult,
  ProductProofMapTier,
  ProductProofMapViewModel,
} from "./product-proof-map-types";
import {
  FAMILY_OFFENCE_LENSES,
  PROOF_MAP_DO_NOT_RELY,
  PROOF_MAP_UNAVAILABLE_MESSAGE,
} from "./product-proof-map-types";

export type BuildProductProofMapInput = BundleAvailabilityInput & {
  matterLabel?: string;
  allegation?: string | null;
  workflowProfileHint?: string | null;
};

const NON_SUBSTANTIVE_BASIS = [
  /^charge unclear on papers$/i,
  /^pilot disclosure chase list$/i,
  /^n\/a$/i,
  /^verify on served papers\.?$/i,
];

const OFFENCE_LENS_LABELS: Record<ProofMapOffenceLens, string> = {
  fraud: "Fraud",
  pwits: "Possession with intent to supply",
  robbery_id: "Robbery / identification",
  motoring: "Motoring",
  violence_gbh: "Serious violence",
  generic_provisional: "Provisional offence map",
  unknown: "Provisional offence map",
};

const TIER_LABELS: Record<ProductProofMapTier, string> = {
  A: "Offence-family proof map",
  B: "Workflow profile proof map",
  C: "Generic provisional proof map",
  D: "Unavailable",
};

const STANDARD_WORKFLOW_PROFILES = new Set([
  "fraud_account_control",
  "pwits_phone_attribution",
  "robbery_identification",
  "violence_domestic_assault",
]);

const PRODUCT_BUNDLE_BANNER_PATTERNS = [
  /FICTIONAL TEST BUNDLE[^.\n]*/gi,
  /fictional\s+test\s+bundle[^.\n]*/gi,
  /pilot-\d+\s+export/gi,
  /not for real world use/gi,
];

function sanitizeField(text: string | null | undefined): string {
  let out = scrubDevRefs(sanitizeReasoningPublicText(text));
  for (const re of PRODUCT_BUNDLE_BANNER_PATTERNS) out = out.replace(re, " ");
  return out.replace(/\s{2,}/g, " ").trim();
}

/** All solicitor-visible proof-map lines — strips eval/dev labels; drops unsafe lines. */
function sanitizeVisibleField(text: string | null | undefined): string {
  const base = sanitizeField(text);
  if (!base) return "";
  const pub = sanitizePublicDisplayLine(base);
  if (pub && isSafePublicDisplayLine(pub)) return pub;
  if (isSafePublicDisplayLine(base)) return base;
  return pub;
}

function optionalBasis(text: string | null | undefined): string | undefined {
  const s = sanitizeVisibleField(text);
  return s || undefined;
}

export function isSubstantiveSourceBasis(basis: string | null | undefined): boolean {
  const s = (basis ?? "").trim();
  if (!s) return false;
  return !NON_SUBSTANTIVE_BASIS.some((re) => re.test(s));
}

export function isStrongConfidence(confidence: ProductProofMapConfidence): boolean {
  return confidence === "on_papers" || confidence === "likely";
}

function mapLinkType(linkType: ProofMapLinkType): ProductProofMapLink["linkType"] {
  switch (linkType) {
    case "supports":
      return "supports";
    case "weakens":
      return "weakens";
    case "missing":
      return "missing";
    case "disclosure_chase":
      return "disclosure_chase";
    case "contradiction":
      return "contradiction";
    default:
      return "other";
  }
}

function gateDisclosureChaseText(text: string, bundleText: string): string | undefined {
  const sanitized = sanitizeVisibleField(text);
  if (!sanitized) return undefined;
  const chase = gateChaseLine(sanitized, bundleText);
  if (chase.action === "drop") return undefined;
  if (chase.action === "replace") return sanitizeField(chase.replacement);
  return sanitized;
}

function gateLinkLabel(text: string, bundleText: string): string | undefined {
  const sanitized = sanitizeVisibleField(text);
  if (!sanitized) return undefined;
  const mat = gateMaterialLine(sanitized, bundleText);
  if (mat.action === "drop") return undefined;
  if (mat.action === "replace") return sanitizeField(mat.replacement);
  return sanitized;
}

function linkPassesNegationGate(link: ProofMapLink, bundleText: string): boolean {
  const probe = [link.label, link.disclosureChase ?? ""].join(" ");
  const fams = familiesInText(probe);
  for (const family of fams) {
    if (familySupport(family, bundleText) === "negated") return false;
  }
  return true;
}

function mapProofPoint(p: ReturnType<typeof generateProofMap>["proofPoints"][number]): ProductProofMapProofPoint {
  const confidence = toProductConfidence(p.confidenceTag);
  const sourceBasis = optionalBasis(p.sourceBasis);
  return {
    id: p.id,
    label: sanitizeVisibleField(p.label),
    crownMustProve: sanitizeVisibleField(p.crownMustProve),
    confidence,
    humanReviewRequired: p.humanReviewRequired || confidence === "needs_solicitor_review",
    sourceSection: sanitizeVisibleField(p.sourceSection),
    sourceBasis: isStrongConfidence(confidence) && !isSubstantiveSourceBasis(sourceBasis) ? undefined : sourceBasis,
    doNotOverstate: optionalBasis(p.doNotOverstate),
  };
}

function mapLink(link: ProofMapLink, bundleText: string): ProductProofMapLink | null {
  if (!linkPassesNegationGate(link, bundleText)) return null;

  const label = gateLinkLabel(link.label, bundleText);
  if (!label) return null;

  const confidence = toProductConfidence(link.confidenceTag);
  const disclosureChase =
    link.disclosureChase != null ? gateDisclosureChaseText(link.disclosureChase, bundleText) : undefined;

  if (link.linkType === "disclosure_chase" && link.disclosureChase && !disclosureChase) return null;

  return {
    proofPointId: link.proofPointId,
    linkType: mapLinkType(link.linkType),
    label,
    sourceSection: sanitizeVisibleField(link.sourceSection),
    sourceBasis: optionalBasis(link.sourceBasis),
    status: link.status,
    disclosureChase,
    doNotOverstate: optionalBasis(link.doNotOverstate),
    confidence,
  };
}

function resolveTier(
  offenceLens: ProofMapOffenceLens,
  workflowProfile: string,
  chargeUnclear: boolean,
): ProductProofMapTier {
  if (chargeUnclear && offenceLens === "generic_provisional") return "C";
  if (FAMILY_OFFENCE_LENSES.includes(offenceLens)) return "A";
  if (STANDARD_WORKFLOW_PROFILES.has(workflowProfile)) return "B";
  if (
    workflowProfile === "generic_motoring_provisional" ||
    workflowProfile === "generic_serious_violence_provisional" ||
    workflowProfile === "generic_provisional"
  ) {
    return "C";
  }
  if (offenceLens === "generic_provisional" || offenceLens === "unknown") return "C";
  return "C";
}

function chargeIsUnclear(charge: string): boolean {
  return /charge unclear on papers/i.test(charge);
}

function collectPublicText(vm: ProductProofMapViewModel): string {
  return [
    vm.charge,
    ...vm.humanReviewReasons,
    ...vm.proofPoints.flatMap((p) => [p.label, p.crownMustProve, p.sourceBasis ?? "", p.doNotOverstate ?? ""]),
    ...vm.supportsLinks.flatMap((l) => [l.label, l.disclosureChase ?? "", l.doNotOverstate ?? ""]),
    ...vm.missingLinks.flatMap((l) => [l.label, l.disclosureChase ?? ""]),
    ...vm.disclosureChaseLinks.flatMap((l) => [l.label, l.disclosureChase ?? ""]),
  ].join("\n");
}

export function lintProductProofMapText(text: string): string[] {
  const issues: string[] = [];
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PROOF_MAP_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden phrase: ${phrase}`);
  }
  for (const line of text.split("\n").filter(Boolean)) {
    if (containsDevRef(line) || containsPublicDevLabel(line)) {
      issues.push("dev/eval reference leak");
      break;
    }
  }
  return issues;
}

export function lintProductProofMapResult(
  result: ProductProofMapResult,
  bundleText: string,
): string[] {
  if (!result.available) return [];
  const issues = lintProductProofMapText(collectPublicText(result));
  for (const p of result.proofPoints) {
    if (isStrongConfidence(p.confidence) && !isSubstantiveSourceBasis(p.sourceBasis)) {
      issues.push(`strong proof point ${p.id} without substantive sourceBasis`);
    }
  }
  for (const link of [...result.disclosureChaseLinks, ...result.missingLinks]) {
    const probe = [link.label, link.disclosureChase ?? ""].join(" ");
    for (const family of familiesInText(probe)) {
      if (familySupport(family, bundleText) === "negated") {
        issues.push(`negated material in proof map link: ${link.label}`);
      }
    }
  }
  return issues;
}

export function buildProductProofMap(input: BuildProductProofMapInput): ProductProofMapResult {
  const assessment = assessBundleAvailability(input);
  if (assessment.unavailableReason) {
    return { available: false, tier: "D", message: PROOF_MAP_UNAVAILABLE_MESSAGE };
  }

  const bundleText = assessment.bundleText;
  const matterLabel = sanitizeField(safeSolicitorCaseTitle(input.matterLabel ?? "Current matter"));
  const raw = generateProofMap("matter", matterLabel, bundleText);

  if (!raw.proofPoints.length) {
    return { available: false, tier: "D", message: PROOF_MAP_UNAVAILABLE_MESSAGE };
  }

  let charge = sanitizeVisibleField(raw.charge);
  if (!charge || !isSafePublicDisplayLine(charge)) {
    charge = sanitizeVisibleField(input.allegation ?? "") || "Charge — solicitor review on served papers";
  }
  if (chargeIsUnclear(charge) && bundleText.length < 1200) {
    return { available: false, tier: "D", message: PROOF_MAP_UNAVAILABLE_MESSAGE };
  }

  const workflowProfile = resolveWorkflowProfileFromSignals({
    caseTitle: matterLabel,
    allegation: input.allegation ?? charge,
    bundleText,
    profileHint: (input.workflowProfileHint as never) ?? null,
  });

  const tier = resolveTier(raw.offenceLens, workflowProfile, chargeIsUnclear(charge));
  const proofPoints = raw.proofPoints.map(mapProofPoint);
  const links = raw.links
    .map((l) => mapLink(l, bundleText))
    .filter((l): l is ProductProofMapLink => l != null);

  const supportsLinks = links.filter((l) => l.linkType === "supports" && l.status === "served");
  const missingLinks = links.filter((l) => l.linkType === "missing" || l.status === "outstanding");
  const disclosureChaseLinks = links.filter((l) => l.linkType === "disclosure_chase" || Boolean(l.disclosureChase));

  const humanReviewReasons = [
    ...new Set(
      [...raw.humanReviewReasons, tier === "C" ? "Thin or generic bundle — solicitor review before fixing position." : ""]
        .map(sanitizeHumanReviewReason)
        .filter(Boolean),
    ),
  ];

  const thinBundle = bundleText.length < 4000 || /thin|provisional|outstanding|not yet served/i.test(bundleText);
  const humanReviewRequired =
    raw.humanReviewRequired || humanReviewReasons.length > 0 || (thinBundle && tier === "C");

  const viewModel: ProductProofMapViewModel = {
    available: true,
    tier,
    tierLabel: TIER_LABELS[tier],
    offenceLensLabel: OFFENCE_LENS_LABELS[raw.offenceLens],
    charge,
    stage: raw.stage ? sanitizeField(raw.stage) : null,
    humanReviewRequired,
    humanReviewReasons,
    proofPoints,
    supportsLinks,
    missingLinks,
    disclosureChaseLinks,
    solicitorReviewNote: humanReviewRequired
      ? "Solicitor review required before relying on this proof map at hearing."
      : "Review served material before fixing hearing position.",
    doNotRelyWarning: PROOF_MAP_DO_NOT_RELY,
  };

  return viewModel;
}
