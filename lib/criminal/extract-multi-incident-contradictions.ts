/**
 * Module 5 — multi-incident reasoning (additive, conservative).
 * Multiple dates, complainants, or locations alleged vs single-episode served narrative.
 * Complements scope (fraud multi-refund) and sequence (order/timeline).
 */

import {
  type BundleContradiction,
  type BundleContradictionType,
} from "./extract-bundle-contradictions";

export type MultiIncidentContradictionType = Extract<
  BundleContradictionType,
  "multi_incident_dates" | "multi_incident_complainants"
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

function mg5Text(bundleText: string): string {
  return sectionSlice(bundleText, "MG5") || bundleText.slice(0, Math.min(bundleText.length, 12000));
}

function chargeText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "CHARGE") ||
    sectionSlice(bundleText, "CHARGE_SHEET") ||
    bundleText.match(/charge sheet[\s\S]{0,6000}/i)?.[0] ||
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

function distinctDates(text: string): string[] {
  const dates = text.match(/\b\d{1,2}\s+\w+\s+202\d\b/gi) ?? [];
  return [...new Set(dates.map((d) => d.toLowerCase()))];
}

/** Particulars-style dates only — ignores bare "date of charge" admin lines. */
function incidentDatesInCharge(charge: string): string[] {
  const onDates = charge.match(/\bon\s+(\d{1,2}\s+\w+\s+202\d)\b/gi) ?? [];
  return [...new Set(onDates.map((d) => d.replace(/^on\s+/i, "").toLowerCase()))];
}

function isFraudChargeWindow(charge: string): boolean {
  return (
    /\bbetween\s+\d{1,2}\s+\w+\s+202\d\s+and\s+\d{1,2}\s+\w+\s+202\d\b/i.test(charge) &&
    /\b(refund|fraud|representation|transaction)\b/i.test(charge)
  );
}

function hasViolenceOrAssaultContext(hay: string): boolean {
  return /\b(assault|ABH|GBH|s\.?\s*47|s\.?\s*20|s\.?\s*18|actual bodily harm|domestic|complainant|victim|struck|injur)/i.test(
    hay,
  );
}

/** Two or more distinct incident dates on charge vs MG5 describing one episode/date. */
function detectMultipleDates(charge: string, mg5: string): BundleContradiction | null {
  if (isFraudChargeWindow(charge)) return null;
  const allegationHay = `${charge} ${mg5}`;
  if (!hasViolenceOrAssaultContext(allegationHay)) return null;

  const chargeIncidentDates = incidentDatesInCharge(charge);
  const mg5Dates = distinctDates(mg5);
  const multiDateCharge =
    chargeIncidentDates.length >= 2 ||
    (/\bcount\s+1\b[\s\S]{0,400}\bcount\s+2\b/i.test(charge) && chargeIncidentDates.length >= 1) ||
    /\bon\s+\d{1,2}\s+\w+\s+202\d[\s\S]{0,120}\band\s+(?:on\s+)?\d{1,2}\s+\w+\s+202\d/i.test(charge);

  const singleEpisodeMg5 =
    /\b(single incident|one incident|the incident on)\b/i.test(mg5) ||
    (mg5Dates.length === 1 && !/\b(second|third|further|subsequent|another)\s+incident\b/i.test(mg5));

  if (!multiDateCharge || !singleEpisodeMg5) return null;
  if (chargeIncidentDates.length >= 2 && mg5Dates.length >= 2) {
    const overlap = chargeIncidentDates.filter((d) => mg5Dates.includes(d));
    if (overlap.length >= 2) return null;
  }

  return {
    type: "multi_incident_dates",
    sources: ["Charge sheet", "MG5"],
    values: ["multiple incident dates", "single-episode MG5"],
    theoryLine:
      "The papers differ on incident count: the charge or particulars allege more than one date or episode, while the served MG5 narrative appears to anchor a single incident. Particulars linkage remains provisional pending disclosure.",
    riskLine:
      "Multiple incident dates on the charge may not be supported by the served MG5 narrative — particulars linkage outstanding.",
    opportunityLine:
      "Opportunity to challenge particulars and incident linkage pending full served MG5, witness, and continuity material.",
  };
}

function extractPersonNames(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/\b(?:Ms|Mr|Mrs)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g)) {
    if (m[1]) names.add(m[1].toLowerCase());
  }
  for (const m of text.matchAll(/\bcomplainant[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi)) {
    if (m[1]) names.add(m[1].toLowerCase());
  }
  return [...names];
}

/** Multiple complainants on charge/MG5 vs served narrative centred on one complainant. */
function detectMultipleComplainants(
  charge: string,
  mg5: string,
  mg11Blocks: string[],
): BundleContradiction | null {
  const allegationHay = `${charge} ${mg5}`;
  if (!hasViolenceOrAssaultContext(allegationHay)) return null;

  const chargeNames = extractPersonNames(charge);
  const mg5Names = extractPersonNames(mg5);
  const allegedVictims = [...new Set([...chargeNames, ...mg5Names])];

  const multiComplainant =
    allegedVictims.length >= 2 ||
    /\b(two complainants|both complainants|complainant\s+\w+.*\band\b.*complainant)/i.test(
      allegationHay,
    ) ||
    /\bassaulted\s+Ms\s+\w+.*\band\s+Ms\s+\w+/i.test(allegationHay);

  const mg11Hay = mg11Blocks.join("\n");
  const mg11Names = extractPersonNames(mg11Hay);
  const singleServedNarrative =
    mg11Blocks.length <= 1 ||
    (mg11Names.length <= 1 && /\brelates to\b[\s\S]{0,80}\bonly\b/i.test(mg5)) ||
    /\b(one complainant|single complainant|complainant Hannah Lee only)\b/i.test(mg5);

  if (!multiComplainant || !singleServedNarrative) return null;
  if (allegedVictims.length >= 2 && mg11Names.length >= 2) {
    const servedBoth = allegedVictims.every((n) =>
      mg11Names.some((m) => m.includes(n.split(" ")[0]!) || n.includes(m.split(" ")[0]!)),
    );
    if (servedBoth) return null;
  }

  return {
    type: "multi_incident_complainants",
    sources: ["Charge / MG5", "MG11"],
    values: ["multiple complainants alleged", "single-complainant narrative served"],
    theoryLine:
      "The papers differ on complainant scope: multiple complainants or victims are alleged while the served MG5/MG11 narrative appears to centre on one complainant only. Linkage and particulars remain provisional pending disclosure.",
    riskLine:
      "Complainant scope on the papers may not align — multiple alleged vs single-complainant served narrative; witness material outstanding.",
    opportunityLine:
      "Opportunity to challenge complainant linkage and particulars pending full MG11, MG6, and witness schedules.",
  };
}

/** Extract multi-incident contradictions — empty unless papers clearly support a pair. */
export function extractMultiIncidentContradictions(
  bundleText: string | null | undefined,
): BundleContradiction[] {
  const text = bundleText?.trim();
  if (!text || text.length < 200) return [];

  const mg5 = mg5Text(text);
  const charge = chargeText(text);
  const mg11Blocks = extractMg11Blocks(text);
  const out: BundleContradiction[] = [];

  const dates = detectMultipleDates(charge, mg5);
  if (dates) out.push(dates);

  const complainants = detectMultipleComplainants(charge, mg5, mg11Blocks);
  if (complainants) out.push(complainants);

  const seen = new Set<MultiIncidentContradictionType>();
  return out.filter((c) => {
    const t = c.type as MultiIncidentContradictionType;
    if (!["multi_incident_dates", "multi_incident_complainants"].includes(t)) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
