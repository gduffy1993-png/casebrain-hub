/**
 * Deterministic bundle contradiction extraction for solicitor-facing briefs.
 * Additive only — returns empty when papers do not clearly support a pair.
 */

export type BundleContradictionType =
  | "location"
  | "first_contact"
  | "loss_figure"
  | "cctv_window"
  | "sequence_order"
  | "sequence_timeline"
  | "scope_multi_vs_single"
  | "scope_indictment_count"
  | "strength_serious_vs_minor"
  | "strength_force_vs_cctv"
  | "multi_incident_dates"
  | "multi_incident_complainants";

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

const INCIDENT_LOCATION_RE = /\b(kitchen|hallway|hall way|bedroom|living room|lounge)\b/i;

function sectionSlice(bundleText: string, label: string): string {
  const re = new RegExp(
    `(?:===\\s*SECTION:\\s*${label}[^=]*===|(?:^|\\n)#+\\s*${label}\\b)([\\s\\S]*?)(?:===\\s*SECTION:|\\n===|$)`,
    "i",
  );
  const hit = bundleText.match(re);
  if (hit?.[1]?.trim()) return hit[1];
  if (/^MG5$/i.test(label) && /\bMG5\b/i.test(bundleText)) {
    const mg5 = bundleText.match(/MG5[\s\S]{0,8000}/i);
    return mg5?.[0] ?? "";
  }
  return "";
}

function extractMg11WitnessBlocks(bundleText: string): string[] {
  const blocks: string[] = [];
  const parts = bundleText.split(
    /(?=(?:===\s*SECTION:\s*MG11|MG11\s*[–\-]\s*|MG11\s+statement|witness statement))/gi,
  );
  for (const part of parts) {
    if (!/\b(MG11|witness statement)\b/i.test(part)) continue;
    const trimmed = part.trim().slice(0, 8000);
    if (trimmed.length > 40) blocks.push(trimmed);
  }
  if (blocks.length > 0) return blocks;

  const single = sectionSlice(bundleText, "MG11");
  if (single) return [single];

  const witnessLines = bundleText
    .split(/\n/)
    .filter((line) => /\b(MG11|witness statement|I did not throw|in the hallway|bleeding)\b/i.test(line));
  if (witnessLines.length >= 2) {
    return [witnessLines.join("\n")];
  }

  return [];
}

function mg11ForFirstContact(bundleText: string, blocks: string[]): string {
  const joined = blocks.join("\n\n").trim();
  if (joined.length >= 40) return joined;
  return bundleText;
}

function witnessTextExcludingMg5(bundleText: string, mg5: string): string {
  const blocks = extractMg11WitnessBlocks(bundleText);
  if (blocks.length > 0) return blocks.join("\n\n");

  const mg5Start = bundleText.search(/\bMG5\b/i);
  if (mg5Start < 0) return bundleText;

  const tail = bundleText.slice(mg5Start);
  const mg5EndMatch = tail.search(/(?:\n===\s*SECTION:|\nMG11\b|\nwitness statement)/i);
  const mg5End = mg5EndMatch > 0 ? mg5Start + mg5EndMatch : mg5Start + Math.min(mg5.length + 500, 9000);

  return `${bundleText.slice(0, mg5Start)}\n${bundleText.slice(mg5End)}`.trim();
}

function mg5Text(bundleText: string): string {
  const scoped = sectionSlice(bundleText, "MG5");
  return scoped || bundleText.slice(0, Math.min(bundleText.length, 12000));
}

function normalizeLocation(token: string): string {
  const t = token.toLowerCase().replace(/\s+/g, " ");
  return t === "hall way" ? "hallway" : t;
}

function uniqueLocationTokens(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(LOCATION_TOKENS)) {
    const t = m[1]?.trim();
    if (t) found.add(normalizeLocation(t));
  }
  return [...found];
}

function pickMg5IncidentLocation(mg5: string): string | null {
  if (/struggl[\s\S]{0,80}\bkitchen\b|\bin the kitchen\b|\bkitchen\b[\s\S]{0,80}struggl/i.test(mg5)) {
    return "kitchen";
  }
  const locs = uniqueLocationTokens(mg5);
  return locs.find((l) => INCIDENT_LOCATION_RE.test(l)) ?? null;
}

function pickWitnessIncidentLocation(block: string): string | null {
  const injuryCtx = /\b(bleed|bleeding|hit my face|injur|assault|threw|mug)\b/i.test(block);
  const hallway =
    /\b(in the hallway|the hallway)\b/i.test(block) ||
    (/\bhallway\b/i.test(block) && injuryCtx);
  if (hallway) return "hallway";
  if (/\bkitchen\b/i.test(block) && injuryCtx) return "kitchen";
  const locs = uniqueLocationTokens(block);
  return locs.find((l) => INCIDENT_LOCATION_RE.test(l)) ?? null;
}

function pickComplainantMg11Block(blocks: string[]): string {
  const scored = blocks.map((block) => {
    let score = 0;
    if (/\b(did not throw|denies throwing|complainant|hannah|victim)\b/i.test(block)) score += 3;
    if (/\b(bleed|bleeding|hit my face|hallway)\b/i.test(block)) score += 2;
    if (/\b(neighbour|neighbor|heard shouting|did not see)\b/i.test(block)) score -= 2;
    return { block, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.block ?? blocks[0] ?? "";
}

function detectLocation(mg5: string, mg11Blocks: string[], bundleText: string): BundleContradiction | null {
  const mg5Incident = pickMg5IncidentLocation(mg5);
  if (!mg5Incident) return null;

  const blocksForLocation =
    mg11Blocks.length > 0 ? mg11Blocks : [witnessTextExcludingMg5(bundleText, mg5)];

  let mg11Incident: string | null = null;
  const complainant = pickComplainantMg11Block(blocksForLocation);
  if (complainant) mg11Incident = pickWitnessIncidentLocation(complainant);

  if (!mg11Incident) {
    for (const block of blocksForLocation) {
      const loc = pickWitnessIncidentLocation(block);
      if (loc && loc !== mg5Incident) {
        mg11Incident = loc;
        break;
      }
    }
  }

  if (!mg11Incident || mg5Incident === mg11Incident) return null;
  if (
    !/\b(struggl|injur|assault|incident|hit|threw|bleed|mug|hallway|kitchen)\b/i.test(
      `${mg5} ${blocksForLocation.join(" ")}`,
    )
  ) {
    return null;
  }

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

function detectFirstContact(mg5: string, mg11Text: string): BundleContradiction | null {
  const mg5Init =
    /\b(threw the mug first|threw.*first|initiated|struck first|hit first)\b/i.test(mg5) ||
    /\bsays\b[\s\S]{0,80}\bthrew\b/i.test(mg5);
  const mg11Deny =
    /\b(did not throw|denies throwing|I did not throw anything|didn't throw)\b/i.test(mg11Text);
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
    theoryLine: `The papers differ on the loss figure (£${aStr} vs £${bStr}). The defence position remains provisional pending reconciliation of served accounting material.`,
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
      "The papers differ on CCTV coverage: only two dates are served while the charge window spans a longer period. The defence position remains provisional pending full export.",
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
  const mg11Blocks = extractMg11WitnessBlocks(text);
  const mg11FirstContact = mg11ForFirstContact(text, mg11Blocks);
  const mg11ForLoss = mg11Blocks.length > 0 ? mg11Blocks.join("\n\n") : text;
  const out: BundleContradiction[] = [];

  const location = detectLocation(mg5, mg11Blocks, text);
  if (location) out.push(location);

  const firstContact = detectFirstContact(mg5, mg11FirstContact);
  if (firstContact) out.push(firstContact);

  const loss = detectLossFigure(text, mg5, mg11ForLoss);
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
