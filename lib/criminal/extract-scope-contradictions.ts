/**
 * Module 3 — scope contradictions (additive, conservative).
 * Charge / MG5 scope vs served narrative scope — not CCTV-specific (see cctv_window).
 */

import {
  type BundleContradiction,
  type BundleContradictionType,
} from "./extract-bundle-contradictions";

export type ScopeContradictionType = Extract<
  BundleContradictionType,
  "scope_multi_vs_single" | "scope_indictment_count"
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
  if (/^CHARGE$/i.test(label) && /\b(charge|indictment|particulars)\b/i.test(bundleText)) {
    return bundleText.match(/(?:charge|indictment|particulars)[\s\S]{0,4000}/i)?.[0] ?? "";
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
    bundleText.slice(0, Math.min(bundleText.length, 6000))
  );
}

function countDistinctIncidentDates(text: string): number {
  const dates = text.match(/\b\d{1,2}\s+\w+\s+202\d\b/gi) ?? [];
  return new Set(dates.map((d) => d.toLowerCase())).size;
}

/** Multiple incidents/refunds alleged vs single-episode narrative on MG5. */
function detectMultiVsSingle(charge: string, mg5: string): BundleContradiction | null {
  const scopeHay = `${charge} ${mg5}`;
  const multiAlleged =
    /\b(multiple|repeated|series of|various|several|on more than one occasion)\b[\s\S]{0,80}\b(refund|transaction|incident|occasion|representation)/i.test(
      scopeHay,
    ) ||
    /\b(?:two|three|four)\s+(?:separate\s+)?(?:refunds|transactions|incidents)\b/i.test(
      scopeHay,
    ) ||
    /\b\d+\s+separate\s+(?:refunds|transactions|incidents)\b/i.test(scopeHay);

  const singleEpisode =
    /\b(single incident|one incident|single refund|one refund|one transaction|relates to one)\b/i.test(
      mg5,
    ) ||
    (/\bon\s+\d{1,2}\s+\w+\s+202\d\b/i.test(mg5) &&
      countDistinctIncidentDates(mg5) === 1 &&
      !/\b(second|third|another|further|subsequent)\s+(incident|refund|transaction)\b/i.test(mg5));

  if (!multiAlleged || !singleEpisode) return null;
  if (!/\b(refund|fraud|incident|representation|transaction)\b/i.test(scopeHay)) return null;

  return {
    type: "scope_multi_vs_single",
    sources: ["Charge / MG5", "MG5 narrative"],
    values: ["multiple alleged", "single episode on papers"],
    theoryLine:
      "The papers differ on scope: the charge or summary alleges multiple incidents or transactions, while the served narrative anchors a single episode. The defence position remains provisional pending full disclosure.",
    riskLine:
      "Scope on the papers may not align — multiple allegations vs single-episode narrative; reconciliation outstanding.",
    opportunityLine:
      "Opportunity to challenge scope and particulars reconciliation pending served accounting and transaction material.",
  };
}

/** Two or more counts on charge sheet vs MG5 describing one episode only. */
function detectIndictmentCount(charge: string, mg5: string): BundleContradiction | null {
  const countN =
    charge.match(/\bcount\s+(\d+)\b/gi)?.length ??
    (/\b(two|three|four)\s+counts?\b/i.test(charge) ? 2 : 0);
  const multiCount = countN >= 2 || /\b(\d+)\s+counts?\s+of\b/i.test(charge);
  if (!multiCount) return null;

  const singleMg5 =
    /\b(single incident|one incident|relates to one|one refund)\b/i.test(mg5) ||
    (countDistinctIncidentDates(mg5) === 1 &&
      !/\bcounts?\s+(two|2|three|3)\b/i.test(mg5) &&
      /\b(incident|refund|transaction|assault)\b/i.test(mg5));

  if (!singleMg5) return null;

  return {
    type: "scope_indictment_count",
    sources: ["Charge sheet", "MG5"],
    values: ["multiple counts", "single-episode MG5"],
    theoryLine:
      "The papers differ on count scope: multiple counts are laid while the served MG5 narrative appears to describe a single episode. Particulars and count linkage remain provisional pending disclosure.",
    riskLine:
      "Count scope may not be supported by the served MG5 narrative — particulars linkage outstanding.",
    opportunityLine:
      "Opportunity to challenge count scope and particulars linkage pending full served material.",
  };
}

/** Extract scope contradictions — empty when papers do not clearly support a pair. */
export function extractScopeContradictions(
  bundleText: string | null | undefined,
): BundleContradiction[] {
  const text = bundleText?.trim();
  if (!text || text.length < 200) return [];

  const mg5 = mg5Text(text);
  const charge = chargeText(text);
  const out: BundleContradiction[] = [];

  const multi = detectMultiVsSingle(charge, mg5);
  if (multi) out.push(multi);

  const counts = detectIndictmentCount(charge, mg5);
  if (counts) out.push(counts);

  const seen = new Set<ScopeContradictionType>();
  return out.filter((c) => {
    const t = c.type as ScopeContradictionType;
    if (!["scope_multi_vs_single", "scope_indictment_count"].includes(t)) return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
