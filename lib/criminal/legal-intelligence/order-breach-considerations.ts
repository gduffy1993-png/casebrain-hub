/**
 * Order-breach practitioner considerations (PROOF-08 class).
 * Conditional on canonical/source signals — never invents evidence from playbook alone.
 */

import type { AdvisoryConsideration } from "./types";

const SURFACES = [
  "overview",
  "court",
  "papers",
  "client",
  "file",
  "hearing_mode",
  "export",
] as const;

function n(s: string | undefined | null): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function base(
  partial: Omit<AdvisoryConsideration, "supportClass" | "allowedSurfaces" | "recoverySource"> & {
    recoverySource?: AdvisoryConsideration["recoverySource"];
  },
): AdvisoryConsideration {
  return {
    supportClass: "PRACTITIONER_CONSIDERATION",
    allowedSurfaces: [...SURFACES],
    recoverySource: partial.recoverySource ?? "offence_family_knowledge",
    ...partial,
  };
}

export function buildOrderBreachConsiderations(input: {
  allegation?: string;
  offenceType?: string;
  bundleText?: string;
}): AdvisoryConsideration[] {
  const charge = n([input.allegation, input.offenceType].filter(Boolean).join(" "));
  const bundle = n(input.bundleText);
  const hay = `${charge} ${bundle}`;
  const isOrderBreach =
    /\bbreach\b/.test(hay) &&
    /\b(restraining\s+order|non[-\s]?molestation|protective\s+order|court\s+order|injunction)\b/.test(
      hay,
    );
  if (!isOrderBreach && !/\brestraining\s+order\b/.test(hay)) return [];

  const out: AdvisoryConsideration[] = [];

  // Order terms / extract
  if (/\border\s+extract\b|\bterms?\s+of\s+(?:the\s+)?order\b|\brestraining\s+order\b/.test(hay)) {
    out.push(
      base({
        id: "consider:order-terms-map",
        what: "Map the alleged act against the precise order prohibition(s) on the served order extract before any breach admission wording.",
        why: "Order-breach cases turn on whether the proved conduct falls inside a live prohibition — not on domestic context alone.",
        canonicalTriggers: ["source:order_extract_or_charge"],
        provenance: ["order_breach_intelligence", "historical:service_proof_gaps"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Exact sealed order wording and operative dates",
          "Which prohibition is said to be engaged",
        ],
        category: "order_breach",
        confidence: "high",
      }),
    );
  }

  // Service / knowledge
  if (
    /\bproof\s+of\s+service\b|\bsealed\s+order\b|\bservice\b|\bknowledge\b|\baware\b|\bserved\s+(?:with\s+)?(?:the\s+)?order\b/.test(
      hay,
    )
  ) {
    out.push(
      base({
        id: "consider:order-service-knowledge",
        what: "Consider whether service / knowledge of the order is proved (sealed order, proof of service, or admission of knowledge) before treating breach as made out.",
        why: "Knowledge and service are often the live proof gap on restraining-order breach — restored as consideration, not invented chase from domestic labels.",
        canonicalTriggers: ["source:service_or_knowledge_reference"],
        provenance: ["order_breach_intelligence", "historical:service_proof_gaps"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Sealed order / proof of service status on papers",
          "Any admission of knowledge in interview or statement",
        ],
        category: "order_breach",
        confidence: "high",
      }),
    );
  }

  // Prohibited conduct / act mapping
  if (/\bprohibit|contact|approach|attend|exclude|non[-\s]?molest/i.test(hay)) {
    out.push(
      base({
        id: "consider:order-prohibited-conduct",
        what: "Identify the specific prohibited conduct alleged and what source evidence proves that act (date, place, method of contact).",
        why: "Act-to-prohibition mapping prevents over-broad breach admissions.",
        canonicalTriggers: ["source:prohibition_or_contact_language"],
        provenance: ["order_breach_intelligence"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Source-backed description of the alleged act",
        ],
        category: "order_breach",
        confidence: "medium",
      }),
    );
  }

  // Timing / location / attribution
  if (/\bdate\b|\btime\b|\blocation\b|\battribution\b|\bwho\b|\bidentity\b/.test(hay) || isOrderBreach) {
    out.push(
      base({
        id: "consider:order-timing-attribution",
        what: "Check timing, location, and attribution of the alleged breach event against order operative dates and any amendments / expiry.",
        why: "Expired, varied, or mis-attributed events collapse breach proof without inventing missing media evidence.",
        canonicalTriggers: ["offence:order_breach"],
        provenance: ["order_breach_intelligence"],
        scope: isOrderBreach ? "source_specific" : "general_professional",
        mustConfirmBeforeFactualLanguage: [
          "Order start / variation / expiry dates",
          "Source for who did the alleged act",
        ],
        category: "order_breach",
        confidence: "medium",
        offenceShapeOnly: !/\bdate\b|\bexpir|amend|variation\b/.test(hay),
      }),
    );
  }

  // Complainant MG11 / witness product when sourced
  if (/\bmg11\b|\bcomplainant\b|\bwitness\s+statement\b/.test(hay)) {
    out.push(
      base({
        id: "consider:order-breach-mg11",
        what: "Treat complainant MG11 / witness statement status as a disclosure and proof issue for the breach allegation — not as proof of service of the order itself.",
        why: "MG11 and sealed-order service are distinct proof strands; conflating them creates false readiness.",
        canonicalTriggers: ["source:mg11_or_complainant"],
        provenance: ["order_breach_intelligence"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Whether MG11 is served vs outstanding",
          "Whether sealed order / proof of service is separately outstanding",
        ],
        category: "disclosure",
        confidence: "high",
      }),
    );
  }

  return out;
}
