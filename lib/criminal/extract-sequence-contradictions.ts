/**
 * Module 2 — sequence / timeline contradictions (additive, conservative).
 * Complements first_contact: focuses on event order, not denial alone.
 */

import {
  type BundleContradiction,
  type BundleContradictionType,
} from "./extract-bundle-contradictions";

export type SequenceContradictionType = Extract<
  BundleContradictionType,
  "sequence_order" | "sequence_timeline"
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
  return "";
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
  if (blocks.length > 0) return blocks;

  const single = sectionSlice(bundleText, "MG11");
  if (single) return [single];

  const statement = bundleText.match(
    /(?:witness statement|MG11)[\s\S]{0,6000}?(?=\n(?:MG11|witness statement|===\s*SECTION:)|$)/gi,
  );
  return statement?.map((s) => s.trim()).filter((s) => s.length > 40) ?? [];
}

function mg5Text(bundleText: string): string {
  return sectionSlice(bundleText, "MG5") || bundleText.slice(0, Math.min(bundleText.length, 12000));
}

function pickComplainantBlock(blocks: string[]): string {
  const scored = blocks.map((block) => {
    let score = 0;
    if (/\b(did not throw|walked away|bleed|hit my face|I felt)\b/i.test(block)) score += 3;
    if (/\b(neighbour|heard shouting|did not see)\b/i.test(block)) score -= 2;
    return { block, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.block ?? blocks[0] ?? "";
}

/** MG5 initiation account vs complainant walk-away-then-followed sequence. */
function detectRetreatVsInitiation(mg5: string, mg11: string): BundleContradiction | null {
  const mg5Init =
    /\b(says|states|reports)\b[\s\S]{0,120}\b(threw|struck|hit|pushed)\b[\s\S]{0,60}\bfirst\b/i.test(mg5) ||
    /\bthrew the mug first\b/i.test(mg5) ||
    /\bstruck first\b/i.test(mg5);

  const retreatThenFollow =
    /\b(walked away|walked off|left the)\b[\s\S]{0,120}\b(followed|came after|she followed|he followed)\b/i.test(
      mg11,
    ) || /\bwalked away\b[\s\S]{0,100}\bfollowed\b/i.test(mg11);

  const injuryAfter =
    /\b(felt something hit|hit my face|bleeding|bleed|mug on the floor)\b/i.test(mg11);

  if (!mg5Init || !retreatThenFollow || !injuryAfter) return null;
  if (!/\b(struggl|assault|incident|argument|mug|injur)\b/i.test(`${mg5} ${mg11}`)) return null;

  return {
    type: "sequence_order",
    sources: ["MG5", "MG11"],
    values: ["MG5 initiation account", "complainant walk-away then followed"],
    theoryLine:
      "The papers differ on incident sequence: MG5 records an account of the complainant initiating; the complainant describes walking away before being followed and injured. Sequence remains unclear pending BWV and 999 audio.",
    riskLine:
      "Incident sequence is disputed on the served papers — BWV and 999 audio may affect reconstruction if served.",
    opportunityLine:
      "Opportunity to challenge incident sequence and reconstruction pending BWV, 999 audio, and full disclosure.",
  };
}

/** Charge window spans multiple dates but MG5/CCTV narrative anchors a single incident date. */
function detectChargeWindowVsSingleIncident(bundleText: string, mg5: string): BundleContradiction | null {
  const chargeWindow = bundleText.match(
    /between\s+\d{1,2}\s+\w+\s+\d{4}\s+and\s+\d{1,2}\s+\w+\s+\d{4}/i,
  );
  if (!chargeWindow) return null;

  const singleIncident =
    /\bon\s+\d{1,2}\s+\w+\s+202\d\b/i.test(mg5) &&
    !/\b(on\s+\d{1,2}\s+\w+\s+202\d[\s\S]{0,200}){2,}/i.test(mg5);

  const multiMonthCharge =
    /\b(two months|8 weeks|charge period|between\s+\w+\s+and\s+\w+)\b/i.test(
      `${mg5} ${bundleText}`,
    ) || chargeWindow[0].length > 20;

  const cctvLimited = /\btwo dates\b|\blimited to\s+(?:only\s+)?two\b/i.test(`${mg5} ${bundleText}`);

  if (!singleIncident || !multiMonthCharge) return null;
  if (!cctvLimited && !/\b(refund|fraud|multiple)\b/i.test(mg5)) return null;

  return {
    type: "sequence_timeline",
    sources: ["Charge sheet / MG5", "CCTV schedule"],
    values: ["multi-date charge window", "single-incident / limited-date narrative"],
    theoryLine:
      "The papers differ on timeline scope: the charge spans a longer period while served narrative and CCTV focus on limited dates. The defence position remains provisional pending full export.",
    riskLine:
      "Timeline scope on the papers may not align with the full charge window — continuity and further disclosure outstanding.",
    opportunityLine:
      "Opportunity to challenge timeline scope and continuity pending full export for the charge period.",
  };
}

/** Extract sequence contradictions — empty when papers do not clearly support a pair. */
export function extractSequenceContradictions(
  bundleText: string | null | undefined,
): BundleContradiction[] {
  const text = bundleText?.trim();
  if (!text || text.length < 200) return [];

  const mg5 = mg5Text(text);
  const blocks = extractMg11Blocks(text);
  const complainant = pickComplainantBlock(blocks);
  const mg11 = complainant || blocks.join("\n\n") || text;

  const out: BundleContradiction[] = [];
  const retreat = detectRetreatVsInitiation(mg5, mg11);
  if (retreat) out.push(retreat);

  const timeline = detectChargeWindowVsSingleIncident(text, mg5);
  if (timeline) out.push(timeline);

  const seen = new Set<SequenceContradictionType>();
  return out.filter((c) => {
    const t = c.type as SequenceContradictionType;
    if (!["sequence_order", "sequence_timeline"].includes(t)) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
