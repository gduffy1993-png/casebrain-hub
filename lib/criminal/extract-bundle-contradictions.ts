/**
 * Deterministic bundle contradiction extraction for solicitor-facing briefs.
 * Additive only — returns empty when papers do not clearly support a pair.
 */

export type BundleContradictionType =
  | "location"
  | "first_contact"
  | "loss_figure"
  | "cctv_window";

export type BundleContradiction = {
  type: BundleContradictionType;
  sources: string[];
  values: string[];
  theoryLine: string;
  riskLine: string;
  opportunityLine: string;
};

const LOCATION_TOKENS =
  /\b(kitchen|hallway|hall way|bedroom|living room|lounge|bathroom|garden|street|doorway)\b/gi;

function snippet(text: string, max = 120): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function sectionSlice(bundleText: string, label: string): string {
  const re = new RegExp(
    `(?:===\\s*SECTION:\\s*${label}[^=]*===|(?:^|\\n)#+\\s*${label}\\b)([\\s\\S]*?)(?:===\\s*SECTION:|\\n===|$)`,
    "i",
  );
  const hit = bundleText.match(re);
  if (hit?.[1]?.trim()) return hit[1];
  if (/^MG5$/i.test(label) && /\bMG5\b/i.test(bundleText)) {
    const mg5 = bundleText.match(/MG5[\s\S]{0,8000}/i);
    return mg5?.[0] ?? bundleText;
  }
  if (/^MG11$/i.test(label)) {
    const mg11 = bundleText.match(/MG11[\s\S]*/i);
    return mg11?.[0] ?? "";
  }
  return "";
}

function mg5Text(bundleText: string): string {
  const scoped = sectionSlice(bundleText, "MG5");
  return scoped || bundleText.slice(0, Math.min(bundleText.length, 12000));
}

function mg11Text(bundleText: string): string {
  const scoped = sectionSlice(bundleText, "MG11");
  return scoped || bundleText;
}

function uniqueLocationTokens(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(LOCATION_TOKENS)) {
    const t = m[1]?.toLowerCase().replace(/\s+/g, " ");
    if (t) found.add(t === "hall way" ? "hallway" : t);
  }
  return [...found];
}

function detectLocation(mg5: string, mg11: string): BundleContradiction | null {
  const mg5Locs = uniqueLocationTokens(mg5);
  const mg11Locs = uniqueLocationTokens(mg11);
  const mg5Incident = mg5Locs.find((l) => /kitchen|hallway|bedroom|lounge|living room/i.test(l));
  const mg11Incident = mg11Locs.find((l) => /kitchen|hallway|bedroom|lounge|living room/i.test(l));
  if (!mg5Incident || !mg11Incident || mg5Incident === mg11Incident) return null;
  if (!/\b(struggl|injur|assault|incident|hit|threw|bleed|mug)\b/i.test(`${mg5} ${mg11}`)) return null;

  const a = mg5Incident;
  const b = mg11Incident;
  return {
    type: "location",
    sources: ["MG5", "MG11"],
    values: [a, b],
    theoryLine: `The papers differ on where the incident occurred (${a} vs ${b}). This may reflect movement or incomplete disclosure. The defence position remains provisional pending BWV and medical evidence.`,
    riskLine: `Location differs between MG5 (${a}) and MG11 (${b}) — sequence and causation remain unclear pending served material.`,
    opportunityLine: `Opportunity to challenge location consistency (${a} vs ${b}) pending BWV, medical evidence, and full disclosure.`,
  };
}

function detectFirstContact(mg5: string, mg11: string): BundleContradiction | null {
  const mg5Init =
    /\b(threw the mug first|threw.*first|initiated|struck first|hit first)\b/i.test(mg5) ||
    /\bsays\b[\s\S]{0,80}\bthrew\b/i.test(mg5);
  const mg11Deny =
    /\b(did not throw|denies throwing|I did not throw anything|didn't throw)\b/i.test(mg11);
  if (!mg5Init || !mg11Deny) return null;

  return {
    type: "first_contact",
    sources: ["MG5", "MG11"],
    values: ["MG5 account of first contact", "complainant denial"],
    theoryLine:
      "The papers differ on who initiated the incident. MG5 records one account; the complainant denies throwing anything. Sequence remains unclear pending BWV and 999 audio.",
    riskLine:
      "First contact is disputed on the served papers — BWV and 999 audio may affect sequence if served.",
    opportunityLine:
      "Opportunity to challenge sequence and first contact pending BWV, 999 audio, and full disclosure.",
  };
}

function parseMoney(text: string): number | null {
  const m = text.match(/£?\s*([\d,]+(?:\.\d{2})?)/);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectLossFigure(bundleText: string, mg5: string, mg11: string): BundleContradiction | null {
  const mg5Loss =
    mg5.match(/(?:total\s+)?(?:alleged\s+)?loss[\s\S]{0,80}?£?\s*([\d,]+(?:\.\d{2})?)/i) ??
    mg5.match(/loss[\s\S]{0,40}?([\d,]+\.\d{2})/i);
  const mg11Loss =
    mg11.match(/(?:schedule\s+)?totals?\s*£?\s*([\d,]+(?:\.\d{2})?)/i) ??
    mg11.match(/£?\s*([\d,]+\.\d{2})/);

  const a = mg5Loss ? parseMoney(mg5Loss[0]) : null;
  const b = mg11Loss ? parseMoney(mg11Loss[0]) : null;
  if (a == null || b == null || Math.abs(a - b) < 0.01) return null;
  if (!/\b(loss|fraud|refund|total)\b/i.test(`${mg5} ${mg11}`)) return null;

  const aStr = a.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bStr = b.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return {
    type: "loss_figure",
    sources: ["MG5", "MG11"],
    values: [aStr, bStr],
    theoryLine: `The papers differ on the loss figure (£${aStr} vs £${bStr}). Continuity and reconciliation are required before the defence can confirm position.`,
    riskLine: `Loss figure differs between served documents (£${aStr} vs £${bStr}) — reconciliation outstanding.`,
    opportunityLine: `Opportunity to challenge loss figure reconciliation (£${aStr} vs £${bStr}) pending served accounting material.`,
  };
}

function detectCctvWindow(bundleText: string, mg5: string): BundleContradiction | null {
  const chargeWindow = bundleText.match(
    /between\s+\d{1,2}\s+\w+\s+\d{4}\s+and\s+\d{1,2}\s+\w+\s+\d{4}/i,
  );
  const explicitGap =
    /cctv[\s\S]{0,200}limited to\s+two dates[\s\S]{0,120}two months/i.test(bundleText) ||
    /cctv[\s\S]{0,200}two dates[\s\S]{0,120}charge covers[\s\S]{0,40}two months/i.test(
      `${mg5} ${bundleText}`,
    );
  const monthSpan =
    chargeWindow &&
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
      chargeWindow[0],
    );

  if (!explicitGap && !(chargeWindow && monthSpan && /\btwo dates\b/i.test(`${mg5} ${bundleText}`))) {
    return null;
  }

  return {
    type: "cctv_window",
    sources: ["Charge sheet / MG5", "CCTV schedule"],
    values: ["charge window", "served CCTV dates"],
    theoryLine:
      "CCTV served covers only two dates, while the charge window spans a longer period. Continuity and full coverage are required before the defence can confirm position.",
    riskLine:
      "CCTV coverage on the papers may not match the full charge window — continuity and further disclosure outstanding.",
    opportunityLine:
      "Opportunity to challenge CCTV coverage and continuity pending full export for the charge period.",
  };
}

/** Extract high-confidence document contradictions from bundle text. */
export function extractBundleContradictions(bundleText: string | null | undefined): BundleContradiction[] {
  const text = bundleText?.trim();
  if (!text || text.length < 200) return [];

  const mg5 = mg5Text(text);
  const mg11 = mg11Text(text);
  const out: BundleContradiction[] = [];

  const location = detectLocation(mg5, mg11);
  if (location) out.push(location);

  const firstContact = detectFirstContact(mg5, mg11);
  if (firstContact) out.push(firstContact);

  const loss = detectLossFigure(text, mg5, mg11);
  if (loss) out.push(loss);

  const cctv = detectCctvWindow(text, mg5);
  if (cctv) out.push(cctv);

  const seen = new Set<BundleContradictionType>();
  return out.filter((c) => {
    if (seen.has(c.type)) return false;
    seen.add(c.type);
    return true;
  });
}

export function contradictionSummaryForDebug(contradictions: BundleContradiction[]): string {
  return contradictions.map((c) => `${c.type}: ${c.values.join(" vs ")} (${c.sources.join(", ")})`).join("; ");
}
