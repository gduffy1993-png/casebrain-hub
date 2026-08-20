/**
 * Real-life strategies knowledge pack → PRACTITIONER_CONSIDERATION overlays.
 * Docs-only knowledge restored as advisory; never evidence facts.
 */

import type { AdvisoryConsideration } from "./types";

const SURFACES = ["overview", "court", "papers", "client", "file", "hearing_mode", "export"] as const;

function n(s: string | undefined | null): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type PackEntry = {
  id: string;
  match: RegExp;
  what: string;
  why: string;
  category: string;
};

const PACK: PackEntry[] = [
  {
    id: "rls:public-order-sequence",
    match: /\baffray\b|\bpublic.?order\b|\bfear of violence\b/,
    what: "Consider sequence, participation, and whether the Crown can prove the statutory fear-of-violence element from served accounts/CCTV.",
    why: "Real-life public-order strategy emphasises participation and sequence — restored as consideration, not a live self-defence finding.",
    category: "public_order",
  },
  {
    id: "rls:assault-intent-reduction",
    match: /\bs\.?\s*18\b|\bgbh\b.*intent|\bwounding with intent\b/,
    what: "Consider whether intent is provable or whether a lesser alternative (e.g. s.20) remains a live charge-reduction discussion.",
    why: "Assault/OAPA real-life strategies frequently turn on intent reduction — advisory until instructions/source support.",
    category: "intent",
  },
  {
    id: "rls:theft-dishonesty",
    match: /\btheft\b|\bshoplift\b|\bdishonest\b/,
    what: "Consider dishonesty / belief in right to property and identification of appropriation on the served papers.",
    why: "Theft strategies hinge on dishonesty and appropriation elements.",
    category: "dishonesty",
  },
  {
    id: "rls:drugs-supply-inference",
    match: /\bsupply\b|\bpsa\b|\bintent to supply\b|\bdrugs?\b/,
    what: "Consider whether possession is personal use versus supply inference, and what packaging/weight/phone evidence actually proves.",
    why: "Drugs strategies often turn on supply inference — must not invent phone downloads from offence alone.",
    category: "supply_inference",
  },
  {
    id: "rls:digital-attribution",
    match: /\bphone\b|\bmessage\b|\bwhatsapp\b|\bencro\b|\battribution\b/,
    what: "Consider attribution: screenshots vs full download / subscriber mapping before any definitive attribution wording.",
    why: "Digital matters collapse when attribution is overstated from screenshots alone.",
    category: "phone_evidence",
  },
];

export function buildRealLifeStrategyConsiderations(input: {
  allegation?: string;
  bundleText?: string;
}): AdvisoryConsideration[] {
  const hay = n([input.allegation, input.bundleText].filter(Boolean).join(" \n "));
  if (!hay) return [];
  return PACK.filter((p) => p.match.test(hay)).map((p) => ({
    id: p.id,
    what: p.what,
    why: p.why,
    canonicalTriggers: [`knowledge_pack_match:${p.id}`],
    provenance: ["real_life_strategies_pack", "docs/REAL_LIFE_STRATEGIES_AND_OUTCOMES_BY_CHARGE.md"],
    scope: "general_professional" as const,
    mustConfirmBeforeFactualLanguage: [
      "Source-backed element evidence before asserting the defence as case theory",
    ],
    supportClass: "PRACTITIONER_CONSIDERATION" as const,
    allowedSurfaces: [...SURFACES],
    category: p.category,
    confidence: "medium" as const,
    offenceShapeOnly: true,
    recoverySource: "real_life_strategies_pack" as const,
  }));
}
