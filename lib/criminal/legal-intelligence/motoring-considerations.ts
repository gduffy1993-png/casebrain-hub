/**
 * Motoring practitioner considerations (PROOF-11 class).
 * Case-specific advisory from actual source facts — not generic "motoring ⇒ X should exist".
 */

import type { AdvisoryConsideration } from "./types";
import { familyPositivelyMentioned } from "./evidence-mention";

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
  partial: Omit<AdvisoryConsideration, "supportClass" | "allowedSurfaces" | "recoverySource">,
): AdvisoryConsideration {
  return {
    supportClass: "PRACTITIONER_CONSIDERATION",
    allowedSurfaces: [...SURFACES],
    recoverySource: "real_life_strategies_pack",
    ...partial,
  };
}

export function buildMotoringConsiderations(input: {
  allegation?: string;
  offenceType?: string;
  bundleText?: string;
}): AdvisoryConsideration[] {
  const charge = n([input.allegation, input.offenceType].filter(Boolean).join(" "));
  const bundle = n(input.bundleText);
  const hay = `${charge} ${bundle}`;
  const isMotoring =
    /\b(dangerous\s+driving|careless\s+driving|drink\s+driv|drug\s+driv|speeding|s\.?\s*172|nip|motoring|driving\s+without)\b/.test(
      hay,
    );
  if (!isMotoring) return [];

  const out: AdvisoryConsideration[] = [];
  const rawBundle = input.bundleText ?? "";

  // Driving standard — keyed to charge elements actually present
  if (/\bdangerous\s+driving\b|\bcareless\s+driving\b/.test(hay)) {
    out.push(
      base({
        id: "consider:driving-standard",
        what: /\bdangerous\b/.test(charge)
          ? "Pin the Crown to the precise driving acts said to fall far below the careful and competent driver standard — separate outcome (collision/injury) from the driving acts."
          : "Pin the Crown to the precise driving acts said to fall below the careful and competent driver standard.",
        why: "Driving-standard cases collapse when outcome is treated as proof of the standard itself.",
        canonicalTriggers: [`offence:${charge.slice(0, 60) || "motoring"}`],
        provenance: ["motoring_intelligence", "case_moves:driving_standard"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Source description of the driving acts relied on",
          "Any reconstruction / expert opinion before asserting standard",
        ],
        category: "driving_standard",
        confidence: "high",
      }),
    );
  }

  // Driver identification / s.172 / NIP when referenced
  if (/\bnip\b|\bs\.?\s*172\b|\bdriver\s+(?:id|identity|identification)\b|\bwho\s+was\s+driving\b/.test(hay)) {
    out.push(
      base({
        id: "consider:driver-identification",
        what: "Consider driver identification / s.172 response integrity against the NIP and any nomination trail before conceding who was driving.",
        why: "Where NIP / s.172 material is on the papers, identity of the driver is often a live element — not invented from the motoring label alone.",
        canonicalTriggers: ["source:nip_or_s172"],
        provenance: ["motoring_intelligence"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "NIP / s.172 notice content and any response",
        ],
        category: "identification",
        confidence: "high",
      }),
    );
  }

  // Conditions / speed / location when referenced
  if (/\bspeed\b|\blocation\b|\bweather\b|\broad\s+conditions?\b|\bvisibility\b|\btraffic\b/.test(hay)) {
    out.push(
      base({
        id: "consider:driving-conditions",
        what: "Weigh speed, location, and road/traffic conditions as described in the papers against the alleged driving standard.",
        why: "Conditions evidence is only useful when source-backed; do not invent telemetry from the charge.",
        canonicalTriggers: ["source:conditions_or_speed_reference"],
        provenance: ["motoring_intelligence"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Source for speed / location / conditions figures",
        ],
        category: "driving_standard",
        confidence: "medium",
      }),
    );
  }

  // Dashcam / CCTV only when positively referenced (not "No CCTV")
  if (
    /\bdashcam\b/.test(hay) ||
    familyPositivelyMentioned("cctv", rawBundle)
  ) {
    out.push(
      base({
        id: "consider:motoring-video-export",
        what: /\bdashcam\b/.test(hay)
          ? "Distinguish dashcam clip referral from full export / master product before asserting completeness of the driving footage."
          : "Where CCTV is positively referenced, distinguish clip/stills from master export before asserting completeness of the driving footage.",
        why: "Motoring video product splits mirror the CCTV clip/master discipline — only when papers engage the product.",
        canonicalTriggers: [/\bdashcam\b/.test(hay) ? "source:dashcam" : "source:cctv_mention"],
        provenance: ["motoring_intelligence", "offence_family_knowledge:cctv_clip_master_split"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Explicit source language on export / master status",
        ],
        category: "disclosure",
        confidence: "high",
      }),
    );
  }

  // Collision / observations / experts when relevant
  if (/\bcollision\b|\bcrash\b|\brta\b|\binjury\b/.test(hay)) {
    out.push(
      base({
        id: "consider:collision-observations",
        what: "Separate collision outcome and observer accounts from the driving-acts analysis; consider whether collision investigation / expert material is actually on the papers.",
        why: "Outcome bias is a known motoring risk; experts must not be invented from the charge alone.",
        canonicalTriggers: ["source:collision_or_injury_reference"],
        provenance: ["motoring_intelligence"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Whether a collision investigator / expert report is served or outstanding",
        ],
        category: "driving_standard",
        confidence: "medium",
      }),
    );
  }

  if (/\bexpert\b|\breconstruction\b|\bcollision\s+investigat/.test(hay)) {
    out.push(
      base({
        id: "consider:motoring-expert",
        what: "Review any collision investigator / reconstruction expert product against the driving acts the Crown relies on.",
        why: "Expert material is useful only when source-referenced — never assumed from dangerous-driving labelling.",
        canonicalTriggers: ["source:expert_or_reconstruction"],
        provenance: ["motoring_intelligence"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: ["Expert report status on papers"],
        category: "driving_standard",
        confidence: "high",
      }),
    );
  }

  return out;
}
