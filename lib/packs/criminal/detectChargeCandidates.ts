/**
 * Violent offence "charge candidate" detector (soft classification)
 *
 * Deterministic, keyword-based. Never claims certainty.
 * Output is used to:
 * - pick offence-aware expected evidence sets
 * - drive Beast Mode scoring panels
 *
 * This module must NOT provide any advice to obstruct justice.
 */

import type { CaseContextTag, ViolentOffenceId, ViolentOffenceMeta } from "./violentCharges";
import { CONTEXT_TAGS, VIOLENT_CHARGES, getViolentChargeById } from "./violentCharges";

export type DetectedChargeCandidate = {
  /** Ship-ready name (requested) */
  chargeId: ViolentOffenceId;
  /** Back-compat alias */
  offenceId: ViolentOffenceId;
  label: string;
  category: ViolentOffenceMeta["category"];
  /** 0–1 */
  confidence: number;
  /** Evidence-driven reasons (matched terms/phrases). */
  why: string[];
};

export type DetectedContextTag = {
  tag: CaseContextTag;
  label: string;
  confidence: number;
  why: string[];
};

export type ChargeCandidateDetectionOutput = {
  candidates: DetectedChargeCandidate[];
  contextTags: DetectedContextTag[];
  proceduralSignals: Array<{
    id:
      | "bwv"
      | "999_audio"
      | "cad_log"
      | "cctv"
      | "mg_forms"
      | "disclosure_schedule"
      | "custody_record"
      | "interview_recording"
      | "continuity";
    confidence: number;
    why: string[];
  }>;
};

type TextSource = {
  id?: string;
  name?: string | null;
  created_at?: string | null;
  extracted_json?: unknown;
  /** Optional pre-extracted raw text. If not present, we string-ify extracted_json */
  raw_text?: string | null;
};

export type ChargeCandidateInput = {
  documents: TextSource[];
  timeline?: Array<{ date?: string; description: string }>;
};

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function safeStringifyExtracted(extracted: unknown): string {
  try {
    if (!extracted) return "";
    return typeof extracted === "string" ? extracted : JSON.stringify(extracted);
  } catch {
    return "";
  }
}

function buildCorpus(input: ChargeCandidateInput): string {
  const parts: string[] = [];
  for (const doc of input.documents) {
    if (doc.name) parts.push(doc.name);
    if (doc.raw_text) parts.push(doc.raw_text);
    parts.push(safeStringifyExtracted(doc.extracted_json));
    if (doc.created_at) parts.push(doc.created_at);
  }
  for (const t of input.timeline ?? []) {
    parts.push(t.description);
    if (t.date) parts.push(t.date);
  }
  return normalizeText(parts.join(" \n "));
}

function countMatches(text: string, patterns: readonly string[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    const needle = normalizeText(p);
    if (!needle) continue;
    if (text.includes(needle)) hits.push(p);
  }
  return hits;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Soft keyword triggers (kept in data structure so we don't hardcode logic in one-off places)
 */
const KEYWORDS = {
  knife: ["knife", "blade", "bladed", "stab", "stabbing", "thrust", "slash", "machete", "kitchen knife"],
  strangulation: [
    "strangle",
    "strangulation",
    "choke",
    "choking",
    "neck compression",
    "couldn't breathe",
    "could not breathe",
    "voice change",
    "petechiae",
    "swallowing pain",
    "neck pain",
  ],
  robbery: ["robbery", "stole", "stolen", "took phone", "took wallet", "snatch", "demanded", "threatened"],
  publicOrder: ["affray", "violent disorder", "riot", "public order", "group fight", "crowd", "disorder"],
  threats: ["threats to kill", "i will kill", "kill you", "threatened to kill", "threaten to kill"],
  weaponsPossession: ["possession", "found in possession", "had a knife", "offensive weapon", "bladed article", "lock knife"],
  injurySeriousness: ["fracture", "surgery", "operation", "icu", "life-threatening", "severe bleeding", "stitches", "gbh", "serious injury"],
  intentSignals: ["intent", "with intent", "aimed", "targeted", "planned", "premeditated", "threatened", "chased", "repeated blows", "multiple blows"],
  selfDefence: ["self-defence", "self defence", "defence of another", "reasonable force", "attacked first", "provoked"],
  admissions: ["admitted", "confessed", "i did", "in interview", "no comment", "partial admission"],
  cctv: ["cctv", "camera", "footage", "ring doorbell", "dashcam"],
  bwv: ["bwv", "body worn", "body-worn", "bodyworn", "bodycam", "body cam"],
  audio999: ["999", "999 audio", "call recording", "emergency call"],
  cad: ["cad", "computer aided dispatch", "dispatch log"],
  mg: ["mg6", "mg 6", "mg5", "mg 5", "mg11", "mg 11", "mg4", "mg 4"],
  // Include MG6 references too: teams often say "MG6 schedule" rather than "disclosure schedule"
  disclosure: ["disclosure schedule", "mg6 schedule", "mg6", "mg 6", "unused material", "mg6c", "mg6d", "mg6a", "mg6b"],
  custody: ["custody record", "custody", "detention", "pace", "reviews", "legal advice"],
  interview: ["interview recording", "audio interview", "video interview", "tape", "transcript"],
  continuity: ["continuity", "exhibit log", "chain of custody", "seal", "exhibit label"],
} as const;

/**
 * Detect likely violent offence candidates (soft classification).
 */
export function detectViolentChargeCandidates(input: ChargeCandidateInput): ChargeCandidateDetectionOutput {
  const text = buildCorpus(input);

  const contextTags: DetectedContextTag[] = CONTEXT_TAGS.map((tag) => {
    const hits = countMatches(text, tag.keywords);
    const confidence = clamp01(hits.length >= 3 ? 0.85 : hits.length === 2 ? 0.65 : hits.length === 1 ? 0.45 : 0);
    return {
      tag: tag.id,
      label: tag.label,
      confidence,
      why: hits.map((h) => `Matched: "${h}"`),
    };
  }).filter((t) => t.confidence > 0);

  const candidates: DetectedChargeCandidate[] = [];

  // Knife violence: suggests weapon-related + GBH candidates depending on seriousness / intent indicators
  const knifeHits = countMatches(text, KEYWORDS.knife);
  const seriousHits = countMatches(text, KEYWORDS.injurySeriousness);
  const intentHits = countMatches(text, KEYWORDS.intentSignals);
  if (knifeHits.length > 0) {
    // Possession / threatening with weapon can sit alongside injury offences
    candidates.push(makeCandidate("possession_bladed_article", knifeHits, 0.45, 0.8));
    candidates.push(makeCandidate("threatening_with_weapon_or_blade", [...knifeHits, ...countMatches(text, KEYWORDS.threats)], 0.35, 0.75));

    // GBH candidates
    const base = 0.35 + Math.min(0.25, knifeHits.length * 0.05) + Math.min(0.2, seriousHits.length * 0.06);
    const s20Conf = clamp01(base);
    candidates.push({
      chargeId: "gbh_s20",
      offenceId: "gbh_s20",
      label: getViolentChargeById("gbh_s20")?.label ?? "s.20 wounding / inflicting GBH",
      category: "gbh_s20",
      confidence: s20Conf,
      why: [
        ...knifeHits.map((h) => `Matched knife signal: "${h}"`),
        ...seriousHits.map((h) => `Matched seriousness signal: "${h}"`),
      ].slice(0, 6),
    });

    const s18Conf = clamp01(base + (intentHits.length > 0 ? 0.2 : 0));
    candidates.push({
      chargeId: "gbh_s18_intent",
      offenceId: "gbh_s18_intent",
      label: getViolentChargeById("gbh_s18_intent")?.label ?? "s.18 GBH with intent",
      category: "gbh_s18",
      confidence: s18Conf,
      why: [
        ...knifeHits.map((h) => `Matched knife signal: "${h}"`),
        ...seriousHits.map((h) => `Matched seriousness signal: "${h}"`),
        ...(intentHits.length > 0 ? intentHits.slice(0, 3).map((h) => `Matched intent signal: "${h}"`) : ["No clear intent phrases detected in the extracted text bundle."]),
      ].slice(0, 7),
    });
  }

  // Strangulation candidate
  const strangHits = countMatches(text, KEYWORDS.strangulation);
  if (strangHits.length > 0) {
    const conf = clamp01(0.4 + Math.min(0.4, strangHits.length * 0.08) + (contextTags.some((t) => t.tag === "domestic_context") ? 0.1 : 0));
    candidates.push({
      chargeId: "non_fatal_strangulation",
      offenceId: "non_fatal_strangulation",
      label: getViolentChargeById("non_fatal_strangulation")?.label ?? "Non-fatal strangulation / suffocation",
      category: "strangulation",
      confidence: conf,
      why: strangHits.slice(0, 6).map((h) => `Matched strangulation signal: "${h}"`),
    });
  }

  // Robbery candidate (violent theft)
  const robberyHits = countMatches(text, KEYWORDS.robbery);
  if (robberyHits.length > 0) {
    const conf = clamp01(0.35 + Math.min(0.35, robberyHits.length * 0.07) + (knifeHits.length > 0 ? 0.1 : 0));
    candidates.push({
      chargeId: "robbery_violent_theft",
      offenceId: "robbery_violent_theft",
      label: getViolentChargeById("robbery_violent_theft")?.label ?? "Robbery (violent theft)",
      category: "robbery",
      confidence: conf,
      why: robberyHits.slice(0, 6).map((h) => `Matched robbery signal: "${h}"`),
    });
  }

  // Public order violence
  const poHits = countMatches(text, KEYWORDS.publicOrder);
  if (poHits.length > 0) {
    const conf = clamp01(0.3 + Math.min(0.35, poHits.length * 0.08));
    candidates.push({
      chargeId: "affray",
      offenceId: "affray",
      label: getViolentChargeById("affray")?.label ?? "Affray",
      category: "public_order",
      confidence: conf,
      why: poHits.slice(0, 5).map((h) => `Matched public order signal: "${h}"`),
    });
    candidates.push({
      chargeId: "violent_disorder",
      offenceId: "violent_disorder",
      label: getViolentChargeById("violent_disorder")?.label ?? "Violent disorder",
      category: "public_order",
      confidence: clamp01(conf - 0.05),
      why: poHits.slice(0, 5).map((h) => `Matched public order signal: "${h}"`),
    });
  }

  // Threats to kill candidate
  const threatsHits = countMatches(text, KEYWORDS.threats);
  if (threatsHits.length > 0) {
    const conf = clamp01(0.4 + Math.min(0.35, threatsHits.length * 0.12));
    candidates.push({
      chargeId: "threats_to_kill",
      offenceId: "threats_to_kill",
      label: getViolentChargeById("threats_to_kill")?.label ?? "Threats to kill",
      category: "threats",
      confidence: conf,
      why: threatsHits.slice(0, 5).map((h) => `Matched threats signal: "${h}"`),
    });
  }

  // ABH/common assault candidates if general assault language present
  const assaultHits = countMatches(text, ["assault", "punched", "hit", "slapped", "kicked", "fight", "altercation"]);
  if (assaultHits.length > 0) {
    const confCommon = clamp01(0.25 + Math.min(0.25, assaultHits.length * 0.06));
    candidates.push({
      chargeId: "common_assault_battery",
      offenceId: "common_assault_battery",
      label: getViolentChargeById("common_assault_battery")?.label ?? "Common assault / battery",
      category: "assault_battery",
      confidence: confCommon,
      why: assaultHits.slice(0, 5).map((h) => `Matched assault signal: "${h}"`),
    });

    // ABH escalator if injury seriousness present but not necessarily GBH-level
    if (seriousHits.length > 0 && knifeHits.length === 0 && strangHits.length === 0) {
      const confAbh = clamp01(0.3 + Math.min(0.3, seriousHits.length * 0.08));
      candidates.push({
        chargeId: "abh_s47",
        offenceId: "abh_s47",
        label: getViolentChargeById("abh_s47")?.label ?? "ABH (assault occasioning actual bodily harm)",
        category: "abh",
        confidence: confAbh,
        why: [
          ...assaultHits.slice(0, 3).map((h) => `Matched assault signal: "${h}"`),
          ...seriousHits.slice(0, 3).map((h) => `Matched injury signal: "${h}"`),
        ],
      });
    }
  }

  // Generic violent incident fallback (requested): if we have *some* violence signal but no confident specific candidate
  const hasAnyViolenceSignal =
    knifeHits.length > 0 ||
    strangHits.length > 0 ||
    robberyHits.length > 0 ||
    poHits.length > 0 ||
    threatsHits.length > 0 ||
    assaultHits.length > 0;

  if (hasAnyViolenceSignal && candidates.length === 0) {
    candidates.push({
      chargeId: "generic_violent_incident",
      offenceId: "generic_violent_incident",
      label: getViolentChargeById("generic_violent_incident")?.label ?? "Generic violent incident (fallback)",
      category: "generic_violent",
      confidence: 0.3,
      why: [
        "General violence indicators detected in the bundle, but no single specific offence signal dominates.",
        "This is a placeholder classification until the bundle clarifies offence type (e.g., weapon, injury, intent).",
      ],
    });
  }

  // Weapons possession signal if knife/offensive weapon language appears without injury framing
  const weaponPossHits = countMatches(text, KEYWORDS.weaponsPossession);
  if (weaponPossHits.length > 0 && knifeHits.length > 0) {
    candidates.push(makeCandidate("possession_offensive_weapon", weaponPossHits, 0.25, 0.65));
  }

  // De-duplicate, keep highest confidence per offenceId
  const dedup = new Map<ViolentOffenceId, DetectedChargeCandidate>();
  for (const c of candidates) {
    const existing = dedup.get(c.chargeId);
    if (!existing || c.confidence > existing.confidence) {
      dedup.set(c.chargeId, c);
    }
  }

  const finalCandidates = Array.from(dedup.values())
    .filter((c) => c.confidence >= 0.25)
    .sort((a, b) => b.confidence - a.confidence);

  const proceduralSignals = detectProceduralSignals(text);

  return {
    candidates: finalCandidates,
    contextTags,
    proceduralSignals,
  };
}

function makeCandidate(
  offenceId: ViolentOffenceId,
  hits: string[],
  base: number,
  cap: number,
): DetectedChargeCandidate {
  const meta = getViolentChargeById(offenceId);
  const conf = clamp01(Math.min(cap, base + Math.min(0.4, hits.length * 0.08)));
  return {
    chargeId: offenceId,
    offenceId,
    label: meta?.label ?? offenceId,
    category: meta?.category ?? "assault_battery",
    confidence: conf,
    why: hits.slice(0, 6).map((h) => `Matched: "${h}"`),
  };
}

function detectProceduralSignals(text: string): ChargeCandidateDetectionOutput["proceduralSignals"] {
  const signals: ChargeCandidateDetectionOutput["proceduralSignals"] = [];

  const add = (
    id: ChargeCandidateDetectionOutput["proceduralSignals"][number]["id"],
    patterns: readonly string[],
    base: number,
  ) => {
    const hits = countMatches(text, patterns);
    if (hits.length === 0) return;
    signals.push({
      id,
      confidence: clamp01(base + Math.min(0.4, hits.length * 0.12)),
      why: hits.slice(0, 6).map((h) => `Matched: "${h}"`),
    });
  };

  add("bwv", KEYWORDS.bwv, 0.35);
  add("999_audio", KEYWORDS.audio999, 0.35);
  add("cad_log", KEYWORDS.cad, 0.35);
  add("cctv", KEYWORDS.cctv, 0.35);
  add("mg_forms", KEYWORDS.mg, 0.35);
  add("disclosure_schedule", KEYWORDS.disclosure, 0.4);
  add("custody_record", KEYWORDS.custody, 0.4);
  add("interview_recording", KEYWORDS.interview, 0.35);
  add("continuity", KEYWORDS.continuity, 0.35);

  return signals.sort((a, b) => b.confidence - a.confidence);
}


