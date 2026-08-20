/**
 * Rank case-specific considerations ahead of generic boilerplate and
 * dedupe semantic overlap across offence-family / fight-engine / RLS / Case Moves.
 */

import type { AdvisoryConsideration } from "./types";

/** Generic Case Moves that dilute case-specificity when over-emitted. */
const GENERIC_MOVE_IDS = new Set([
  "case-move:move:no-safe-strategy",
  "case-move:move:disclosure-exhibit-list",
  "case-move:move:disclosure-interview",
]);

function confidenceRank(c: AdvisoryConsideration): number {
  if (c.confidence === "high") return 0;
  if (c.confidence === "medium") return 1;
  if (c.confidence === "low") return 2;
  return 3;
}

function specificityRank(c: AdvisoryConsideration): number {
  if (GENERIC_MOVE_IDS.has(c.id)) return 50;
  if (c.offenceShapeOnly) return 20;
  if (c.scope === "general_professional") return 15;
  if (c.scope === "source_specific") return 0;
  return 10;
}

function sourceRank(c: AdvisoryConsideration): number {
  switch (c.recoverySource) {
    case "offence_family_knowledge":
      return 0;
    case "real_life_strategies_pack":
      return 1;
    case "strategy_fight_engine_advisory":
      return 2;
    case "case_moves_engine_6de1c4c24":
      return 3;
    case "playbooks_by_offence":
      return 4;
    default:
      return 5;
  }
}

/** Coarse semantic key for overlap collapse (keeps the higher-ranked item). */
function semanticKey(c: AdvisoryConsideration): string | null {
  const w = `${c.what} ${c.category ?? ""}`.toLowerCase();
  if (/clip|master|stills|export|dashcam/.test(w) && /cctv|footage|video|dashcam/.test(w)) {
    return "video-clip-vs-master";
  }
  if (/attribution/.test(w) && /screenshot|download|handle|phone|message/.test(w)) {
    return "digital-attribution";
  }
  if (/self-defence|first-contact/.test(w)) return "self-defence-first-contact";
  if (/pace|custody\s+safeguard/.test(w)) return "pace-custody";
  if (/interview/.test(w) && /summary|recording|transcript|modality|roti|rovi/.test(w)) {
    return "interview-modality";
  }
  if (/identification|turnbull|participation/.test(w)) return "identification";
  if (/medical|causation|injury/.test(w) && !/collision/.test(w)) return "medical-causation";
  if (/supply\s+inference|personal\s+use/.test(w)) return "supply-inference";
  if (/intent/.test(w) && /s\.?\s*20|charge-reduction|mens\s+rea/.test(w)) return "intent-reduction";
  // Order-breach items stay distinct from each other; only collapse vs generic disclosure.
  if (/exhibit\s+schedule/.test(w)) return "exhibit-schedule";
  if (/full\s+interview\s+record/.test(w)) return "interview-disclosure-move";
  if (/defer\s+final\s+strategy|thin\s+bundle|consolidated\s+disclosure\s+request/.test(w)) {
    return "no-safe-strategy";
  }
  if (/disclosure\s+request\s+pack|structured\s+disclosure\s+request\s+pack/.test(w)) {
    return "disclosure-pack";
  }
  return null;
}

export function rankAndDedupeConsiderations(
  items: AdvisoryConsideration[],
): AdvisoryConsideration[] {
  const scored = items.map((item, index) => ({
    item,
    index,
    score:
      specificityRank(item) * 100 +
      confidenceRank(item) * 10 +
      sourceRank(item) +
      index * 0.001,
  }));
  scored.sort((a, b) => a.score - b.score || a.index - b.index);

  const seenIds = new Set<string>();
  const seenSemantic = new Set<string>();
  const out: AdvisoryConsideration[] = [];

  for (const { item } of scored) {
    if (seenIds.has(item.id)) continue;
    const key = semanticKey(item);
    if (key && seenSemantic.has(key)) continue;
    seenIds.add(item.id);
    if (key) seenSemantic.add(key);
    out.push(item);
  }

  return out;
}
