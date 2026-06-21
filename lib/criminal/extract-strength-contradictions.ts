/**
 * Module 4 — strength contradictions (additive, conservative).
 * Severity / force alleged vs injury narrative or served CCTV behaviour — violence cases only.
 */

import {
  type BundleContradiction,
  type BundleContradictionType,
} from "./extract-bundle-contradictions";

export type StrengthContradictionType = Extract<
  BundleContradictionType,
  "strength_serious_vs_minor" | "strength_force_vs_cctv"
>;

function sectionSlice(bundleText: string, label: string): string {
  const re = new RegExp(
    `(?:===\\s*SECTION:\\s*${label}[^=]*===|(?:^|\\n)#+\\s*${label}\\b)([\\s\\S]*?)(?:===\\s*SECTION:|\\n===|$)`,
    "i",
  );
  const hit = bundleText.match(re);
  if (hit?.[1]?.trim()) return hit[1];
  if (/^MG5$/i.test(label) && /\bMG5\b/i.test(bundleText)) {
    return bundleText.match(/MG5[\s\S]{0,8000}/i)?.[0] ?? "";
  }
  if (/^CCTV$/i.test(label) && /\bCCTV\b/i.test(bundleText)) {
    return bundleText.match(/CCTV[\s\S]{0,6000}/i)?.[0] ?? "";
  }
  return "";
}

function mg5Text(bundleText: string): string {
  return sectionSlice(bundleText, "MG5") || bundleText.slice(0, Math.min(bundleText.length, 12000));
}

function chargeText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "CHARGE") ||
    sectionSlice(bundleText, "CHARGE_SHEET") ||
    bundleText.match(/charge sheet[\s\S]{0,4000}/i)?.[0] ||
    ""
  );
}

function cctvText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "CCTV") ||
    bundleText.match(/CCTV[\s\S]{0,6000}/i)?.[0] ||
    ""
  );
}

function extractMg11Blocks(bundleText: string): string[] {
  const blocks: string[] = [];
  const parts = bundleText.split(
    /(?=(?:===\s*SECTION:\s*MG11|MG11\s*[–\-]\s*|MG11\s+witness statement|witness statement))/gi,
  );
  for (const part of parts) {
    if (!/\b(MG11|witness statement)\b/i.test(part)) continue;
    const trimmed = part.trim().slice(0, 8000);
    if (trimmed.length > 40) blocks.push(trimmed);
  }
  return blocks;
}

function medicalText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "MEDICAL") ||
    sectionSlice(bundleText, "SRE") ||
    bundleText.match(/(?:medical|hospital|A&E|triage)[\s\S]{0,4000}/i)?.[0] ||
    ""
  );
}

function hasViolenceContext(...chunks: string[]): boolean {
  const hay = chunks.join(" ");
  return /\b(ABH|assault|GBH|s\.?\s*47|s\.?\s*20|s\.?\s*18|actual bodily harm|grievous bodily harm|strike|struck|punch|kick|weapon|mug|wound|injur)/i.test(
    hay,
  );
}

const SERIOUS_INJURY_RE =
  /\b(significant injury|serious injury|serious harm|grievous bodily harm|GBH|required hospital|hospital treatment|stitches|surgery|fracture|deep laceration|severe bleeding)\b/i;

const MINOR_INJURY_RE =
  /\b(minor cut|small cut|superficial|minor injury|small wound|bleeding (?:was )?controlled|no stitches|did not attend hospital|not attend hospital|no hospital|graze only)\b/i;

const FORCE_ALLEGED_RE =
  /\b(struck with|struck the|hit (?:her|him|them) with|weapon|mug|glass|bottle|punch|kick|forceful blow|significant force)\b/i;

const CCTV_LIMITED_RE =
  /\b(push(?:ed)?|shov(?:e|ed)|raised arm|no clear contact|no visible injury|minor contact|brief altercation|limited contact|does not show (?:a )?strike|no object visible)\b/i;

/** Serious harm alleged on MG5/charge vs minor injury on witness/medical. */
function detectSeriousVsMinor(
  charge: string,
  mg5: string,
  witnessHay: string,
): BundleContradiction | null {
  const allegationHay = `${charge} ${mg5}`;
  if (!hasViolenceContext(allegationHay, witnessHay)) return null;
  if (!SERIOUS_INJURY_RE.test(allegationHay)) return null;
  if (!MINOR_INJURY_RE.test(witnessHay)) return null;
  if (SERIOUS_INJURY_RE.test(witnessHay) && !MINOR_INJURY_RE.test(witnessHay)) return null;

  return {
    type: "strength_serious_vs_minor",
    sources: ["MG5 / charge", "Witness / medical"],
    values: ["serious harm alleged", "minor injury described"],
    theoryLine:
      "The papers differ on injury strength: the charge or MG5 frames significant or hospital-level harm, while the served witness or medical account describes a minor or superficial injury. The defence position remains provisional pending full medical and imaging disclosure.",
    riskLine:
      "Injury strength on the papers may not align — serious harm alleged vs minor injury described; medical reconciliation outstanding.",
    opportunityLine:
      "Opportunity to challenge injury strength and causation pending served medical records, imaging, and continuity material.",
  };
}

/** Forceful / weapon allegation vs served CCTV showing limited contact. */
function detectForceVsCctv(charge: string, mg5: string, cctv: string): BundleContradiction | null {
  const allegationHay = `${charge} ${mg5}`;
  if (!hasViolenceContext(allegationHay, cctv)) return null;
  if (!FORCE_ALLEGED_RE.test(allegationHay)) return null;
  if (!CCTV_LIMITED_RE.test(cctv)) return null;
  if (FORCE_ALLEGED_RE.test(cctv) && !CCTV_LIMITED_RE.test(cctv)) return null;

  return {
    type: "strength_force_vs_cctv",
    sources: ["MG5 / charge", "CCTV note"],
    values: ["force / weapon alleged", "limited contact on CCTV"],
    theoryLine:
      "The papers differ on force strength: the prosecution narrative alleges a forceful strike or weapon use, while the served CCTV material describes limited contact or no clear strike. The defence position remains provisional pending full footage and continuity.",
    riskLine:
      "Force on the papers may not match served CCTV — strike/weapon allegation vs limited contact on clip; continuity and full export outstanding.",
    opportunityLine:
      "Opportunity to challenge force and mechanism pending full CCTV export, continuity statements, and engineer notes.",
  };
}

/** Extract strength contradictions — empty unless violence context and a clear pair. */
export function extractStrengthContradictions(
  bundleText: string | null | undefined,
): BundleContradiction[] {
  const text = bundleText?.trim();
  if (!text || text.length < 200) return [];

  const mg5 = mg5Text(text);
  const charge = chargeText(text);
  const mg11 = extractMg11Blocks(text).join("\n\n");
  const medical = medicalText(text);
  const witnessHay = `${mg11} ${medical}`.trim();
  const cctv = cctvText(text);

  const out: BundleContradiction[] = [];

  const seriousMinor = detectSeriousVsMinor(charge, mg5, witnessHay);
  if (seriousMinor) out.push(seriousMinor);

  const forceCctv = detectForceVsCctv(charge, mg5, cctv);
  if (forceCctv) out.push(forceCctv);

  const seen = new Set<StrengthContradictionType>();
  return out.filter((c) => {
    const t = c.type as StrengthContradictionType;
    if (!["strength_serious_vs_minor", "strength_force_vs_cctv"].includes(t)) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
