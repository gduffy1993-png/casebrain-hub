/**
 * Safe extraction of criminal case header fields from combined bundle text.
 * Does not invent values — returns null when anchors are not clearly present.
 */

import type { ParsedBundleHeader } from "@/lib/bundle/parse-bundle-display";
import { repairDisplayWordSpacing } from "@/lib/criminal/display-text";

/** Front matter + high-value procedural sections (not full 1000-page scan). */
const FRONT_MATTER_CHARS = 80_000;
const SECTION_BLOCK_CHARS = 6_000;

const HIGH_VALUE_SECTIONS = [
  "COVER_INDEX",
  "COVER",
  "INDEX",
  "CHARGE",
  "CHARGE_SHEET",
  "CHARGES",
  "INDICTMENT",
  "PROCEDURAL",
  "PROCEDURAL_STATUS",
  "CASE_SUMMARY",
  "SUMMARY",
  "HEARING",
  "HEARING_NOTE",
  "MG5",
  "CUSTODY",
] as const;

export type MetadataFieldSource =
  | "structured_field"
  | "extracted_cover_fallback"
  | "extracted_charge_fallback"
  | "extracted_procedural_fallback"
  | "unavailable";

export type ExtractedBundleCaseMetadata = {
  defendantName: string | null;
  defendantSource: MetadataFieldSource;
  complainant: string | null;
  complainantSource: MetadataFieldSource;
  court: string | null;
  courtSource: MetadataFieldSource;
  nextHearingRaw: string | null;
  nextHearingIso: string | null;
  nextHearingSource: MetadataFieldSource;
  stage: string | null;
  stageSource: MetadataFieldSource;
  offenceWording: string | null;
  offenceDisplay: string | null;
  offenceSource: MetadataFieldSource;
  bailStatus: string | null;
  bailStatusSource: MetadataFieldSource;
  defencePosition: string | null;
  defencePositionSource: MetadataFieldSource;
};

function cleanLineValue(raw: string): string | null {
  const t = repairDisplayWordSpacing(raw.replace(/\[[^\]]{0,80}\]/g, ""));
  if (!t || t.length < 2) return null;
  if (/^(?:n\/a|none|unknown|—|-|\?)$/i.test(t)) return null;
  if (t.length > 280) return `${t.slice(0, 277)}…`;
  return t;
}

/** Strip markdown emphasis/heading markers so fictional gold bundles label-match reliably. */
export function normalizeMetadataScanText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "");
}

function extractLabeledValue(scan: string, labelPatterns: string[]): string | null {
  for (const label of labelPatterns) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `^\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:\\-–]\\s*(.+)$`,
      "im",
    );
    const m = scan.match(re);
    if (m?.[1]) {
      const v = cleanLineValue(m[1]);
      if (v) return v;
    }
  }
  return null;
}

/** Label followed by value on same line (optional colon), stopping at pipe or next label. */
function extractInlineLabeled(scan: string, labels: string[], maxLen = 200): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `\\b${escaped}\\s*:?\\s*([^\\n|]{3,${maxLen}}?)(?=\\s*\\||\\s+(?:DOB|Stage|Court|Charge|Defence|Defense|Next\\s+hearing|Bundle\\s+size)\\b|$)`,
      "i",
    );
    const m = scan.match(re);
    if (m?.[1]) {
      const v = cleanLineValue(m[1]);
      if (v) return v;
    }
  }
  return null;
}

function extractSectionBlock(full: string, sectionNames: string[], maxLen = SECTION_BLOCK_CHARS): string | null {
  for (const name of sectionNames) {
    const re = new RegExp(`===\\s*SECTION:\\s*${name}\\s*===([\\s\\S]{0,${maxLen}})`, "i");
    const m = full.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

/** Remove ingestion JSON banner blocks from eval/gold paste bundles. */
function stripIngestionMetadataBlock(text: string): string {
  const marker = /CASEBRAIN_BUNDLE_METADATA/i;
  const idx = text.search(marker);
  if (idx < 0) return text;
  const braceStart = text.indexOf("{", idx);
  if (braceStart < 0) return text;
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  let start = idx;
  while (start > 0 && /[=\s\n\r]/.test(text[start - 1]!)) start--;
  return `${text.slice(0, start)}${text.slice(end)}`.replace(/^\s*={3,}\s*$/gm, "").trim();
}

/** Highest-value text for metadata: front pages + cover/charge/hearing sections. */
export function buildMetadataScan(fullText: string): string {
  if (!fullText?.trim()) return "";
  const cleaned = stripIngestionMetadataBlock(fullText);
  const parts: string[] = [cleaned.slice(0, FRONT_MATTER_CHARS)];
  const front = parts[0]!;
  for (const section of HIGH_VALUE_SECTIONS) {
    const block = extractSectionBlock(cleaned, [section]);
    if (block && block.length >= 24) {
      const anchor = block.slice(0, Math.min(120, block.length));
      if (!front.includes(anchor)) parts.push(block);
    }
  }
  return normalizeMetadataScanText(parts.join("\n\n"));
}

/** Stop before these tokens when trimming a person-name capture from table-style PDF text. */
const PERSON_CAPTURE_STOP =
  /\s*(?:\||\s+DOB\b|Complainant\b|Victim\b|Venue\b|Court\b|Stage\b|Bail\b|Offence\b|Offense\b|Charge\b|Allegation\b|Next\s+hearing\b|[\n\r])/i;

const PERSON_NAME_TOKEN = `[A-Za-z][A-Za-z'’.\-]+`;
const PERSON_NAME_CAPTURE = `(${PERSON_NAME_TOKEN}(?:\\s+${PERSON_NAME_TOKEN}){0,3})`;

function normalizeCapturedPersonTokens(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z]{2,}$/.test(w) && w.length <= 24) {
        return w.charAt(0) + w.slice(1).toLowerCase();
      }
      return w;
    })
    .join(" ");
}

function trimPersonCapture(raw: string): string {
  let t = raw.replace(/^\|+|\|+$/g, "").replace(/\s+/g, " ").trim();
  t = t.replace(/([A-Za-z])DOB(?=\d|\b)/i, "$1");
  t = t.replace(/\bDOB\b.*$/i, "").trim();
  t = t.replace(/\bMatter reference\b.*$/i, "").trim();
  t = t.replace(/\bURN[A-Z0-9]+\b.*$/i, "").trim();
  t = t.replace(/\bPrimary\b.*$/i, "").trim();
  t = t.replace(/([a-z])([A-Z])/g, "$1 $2");
  t = normalizeCapturedPersonTokens(t);
  const stop = t.search(PERSON_CAPTURE_STOP);
  if (stop >= 0) t = t.slice(0, stop).trim();
  t = t.replace(/\|.+$/, "").trim();
  const dob = t.search(/\s+DOB\b/i);
  if (dob >= 0) t = t.slice(0, dob).trim();
  return t;
}

/** Strip MG11/document-role tokens glued onto person-name captures (keep real surnames). */
function stripPersonNameDocumentRoleTail(words: string[]): string[] {
  let w = [...words];
  for (let i = 0; i < 4 && w.length > 0; i++) {
    if (
      w.length >= 2 &&
      /^witness$/i.test(w[w.length - 2]!) &&
      /^statement$/i.test(w[w.length - 1]!)
    ) {
      w = w.slice(0, -2);
      continue;
    }
    const last = w[w.length - 1]!.toLowerCase();
    if (/^(?:mg11|draft|unsigned|final|not|primary)$/i.test(last)) {
      w = w.slice(0, -1);
      continue;
    }
    if ((last === "statement" || last === "witness") && w.length >= 3) {
      w = w.slice(0, -1);
      continue;
    }
    break;
  }
  return w;
}

/** Reject label tokens, fragments, and non name-like captures. */
function sanitizePersonName(value: string): string | null {
  const trimmed = trimPersonCapture(value);
  const t = stripPersonNameDocumentRoleTail(trimmed.split(/\s+/).filter(Boolean)).join(" ");
  if (!t || t.length < 3 || t.length > 60) return null;
  if (/^(?:defendant|accused|client|complainant|victim|name|unknown|n\/a|not\s+safely)/i.test(t)) {
    return null;
  }
  if (/not\s+safely\s+extracted/i.test(t)) return null;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) return null;
  const labelWords =
    /^(?:defendant|accused|client|complainant|victim|name|the|and|or|dob|doi|mr|mrs|ms|dr)$/i;
  const verbWords =
    /^(?:contacted|communicated|alleged|denied|admitted|is|was|has|had|that|which|against|contrary|witness|victim|complainant|swung|states|alleges|reports|identified|during|struggle|bottle|injury|first)$/i;
  if (words.some((w) => labelWords.test(w) || verbWords.test(w))) return null;
  if (!words.every((w) => /^[A-Za-z][A-Za-z'’.\-]{1,}$/.test(w))) return null;
  if (words.length >= 3 && /\b(was|is|has|had|that|which|against|contrary)\b/i.test(t)) return null;
  return words.join(" ");
}

function extractDefendantName(scan: string): string | null {
  const colonFirst =
    extractLabeledValue(scan, ["Defendant", "Accused", "Defendant name", "Client"]) ?? null;
  if (colonFirst) {
    const v = sanitizePersonName(colonFirst);
    if (v) return v;
  }

  const tablePatterns: RegExp[] = [
    new RegExp(`\\bDefendant\\s+name\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bDefendant\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bDefendant\\s+${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bAccused\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bClient\\s+${PERSON_NAME_CAPTURE}`, "i"),
  ];

  for (const re of tablePatterns) {
    const m = scan.match(re);
    if (m?.[1]) {
      const v = sanitizePersonName(m[1]);
      if (v) return v;
    }
  }

  const rv = scan.match(/\bR\s+v\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (rv?.[1]) {
    const v = sanitizePersonName(rv[1]);
    if (v) return v;
  }

  return null;
}

/** Strip scan/OCR junk glued onto offence labels (gauntlet bundles). */
export function stripGluedOffenceJunk(value: string): string {
  return value
    .trim()
    .replace(/\bagainst swung first\b.*$/i, "")
    .replace(/\.\s*MG\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeComplainantName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return sanitizePersonName(value.trim());
}

function extractComplainantFromParticulars(scan: string): string | null {
  const harm = scan.match(
    /\b(?:inflicted|caused|unlawfully and maliciously inflicted)\s+(?:grievous bodily harm|gbh|actual bodily harm|abh)\s+on\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i,
  );
  if (harm?.[1]) {
    const v = sanitizePersonName(harm[1]);
    if (v) return v;
  }
  const stole = scan.match(
    /\bstole\s+goods[^.\n]{0,120}?\bproperty of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i,
  );
  if (stole?.[1]) {
    const v = sanitizePersonName(stole[1]);
    if (v) return v;
  }
  return null;
}

function extractComplainantName(scan: string): string | null {
  const colon =
    extractLabeledValue(scan, ["Complainant", "Victim", "Other party / key witness", "Key witness"]) ??
    null;
  if (colon) {
    const v = sanitizePersonName(colon);
    if (v) return v;
  }

  const particulars = extractComplainantFromParticulars(scan);
  if (particulars) return particulars;

  const mg11 = scan.match(
    /\bMG11\b[^\n]{0,120}\bComplainant\b\s*[-–]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
  );
  if (mg11?.[1]) {
    const v = sanitizePersonName(mg11[1]);
    if (v) return v;
  }
  const mg11Witness = scan.match(
    /\bMG11\b[^\n]{0,80}(?:Witness statement|WITNESS STATEMENT)\s*[-–—]\s*(?!PC\b)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
  );
  if (mg11Witness?.[1]) {
    const v = sanitizePersonName(mg11Witness[1]);
    if (v) return v;
  }

  const tablePatterns: RegExp[] = [
    new RegExp(`\\bComplainant\\s*:\\s*${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bVictim\\s*:\\s*${PERSON_NAME_CAPTURE}`, "i"),
  ];

  for (const re of tablePatterns) {
    const m = scan.match(re);
    if (m?.[1]) {
      const v = sanitizePersonName(m[1]);
      if (v) return v;
    }
  }

  return null;
}

export function parseUkHearingDateTime(raw: string): { iso: string | null; display: string } | null {
  const t = raw.trim();
  if (!t) return null;

  const atMatch = t.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{4})(?:\s+(?:at\s+)?(\d{1,2}):(\d{2}))?/i,
  );
  if (atMatch) {
    const day = parseInt(atMatch[1], 10);
    const monthStr = atMatch[2];
    const year = parseInt(atMatch[3], 10);
    const hour = atMatch[4] != null ? parseInt(atMatch[4], 10) : 10;
    const minute = atMatch[5] != null ? parseInt(atMatch[5], 10) : 0;
    const monthMap: Record<string, number> = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
      may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
      september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
      december: 11, dec: 11,
    };
    const month = monthMap[monthStr.toLowerCase()];
    if (month == null || Number.isNaN(day) || Number.isNaN(year)) return null;
    const d = new Date(year, month, day, hour, minute, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    const datePart = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timePart =
      atMatch[4] != null
        ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
        : null;
    return {
      iso: d.toISOString(),
      display: timePart ? `${datePart} at ${timePart}` : datePart,
    };
  }

  const slashMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10) - 1;
    let y = parseInt(slashMatch[3], 10);
    if (y < 100) y += 2000;
    const dt = new Date(y, m, d, 10, 0, 0, 0);
    if (!Number.isNaN(dt.getTime())) {
      return {
        iso: dt.toISOString(),
        display: dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      };
    }
  }

  return null;
}

/** Hearing/court line glued into offence label (messy scan bundles). */
export function isGluedHearingCourtOffenceLabel(value: string): boolean {
  const t = value.trim();
  if (!t || t.length < 12) return false;
  if (/^\d{4}\s+at\s+\d{1,2}:\d{2}\s+at\s+/i.test(t)) return true;
  if (/\bCrown Court\b/i.test(t) && /\bAllegation:\s*/i.test(t) && /\d{4}\s+at\s+/i.test(t)) return true;
  if (/\bagainst swung first\b/i.test(t)) return true;
  if (/\.\s*MG\.?\s*$/i.test(t)) return true;
  return false;
}

/** Pull charge wording out of glued hearing/court/offence lines. */
export function repairGluedOffenceLabel(value: string): string | null {
  const t = value.trim();
  if (!t) return null;

  const allegationTail = t.match(/\bAllegation:\s*(.+)$/i)?.[1];
  if (allegationTail) {
    const stripped = stripGluedOffenceJunk(allegationTail);
    const v = cleanLineValue(stripped);
    if (v && v.length >= 8 && !isGluedHearingCourtOffenceLabel(v)) {
      return formatOffenceDisplayFromBundle(v);
    }
  }

  const s20 = t.match(/\b((?:section|s\.?)\s*20\s+unlawful\s+wounding)/i)?.[1];
  if (s20) {
    const v = cleanLineValue(stripGluedOffenceJunk(s20));
    if (v) return formatOffenceDisplayFromBundle(v);
  }

  if (/\bunlawful\s+wounding\b/i.test(t) && /\b(?:section|s\.?)\s*20\b/i.test(t)) {
    const inner = t.match(/\b((?:section|s\.?)\s*20\s+unlawful\s+wounding)/i)?.[1];
    if (inner) return formatOffenceDisplayFromBundle(cleanLineValue(stripGluedOffenceJunk(inner))!);
  }

  const strippedOnly = stripGluedOffenceJunk(t);
  if (strippedOnly && strippedOnly.length >= 8 && !isGluedHearingCourtOffenceLabel(strippedOnly)) {
    return formatOffenceDisplayFromBundle(strippedOnly);
  }

  return null;
}

export function formatOffenceDisplayFromBundle(raw: string): string {
  let t = raw.trim();
  if (!t) return t;

  const asTag = normalizeOffenceAsTagLine(t);
  if (asTag) t = asTag;

  if (isGluedHearingCourtOffenceLabel(t)) {
    const repaired = repairGluedOffenceLabel(t);
    if (repaired) return repaired;
  }

  if (/\bmurder\b/i.test(t) && /contrary to common law/i.test(t)) {
    return "Murder, contrary to common law";
  }

  const hasS47 = /\bsection\s*47\b|\bs\.?\s*47\b/i.test(t);
  const hasAbh = /\bactual bodily harm\b|\bABH\b/i.test(t);
  if (hasS47 && hasAbh) {
    if (/assault occasioning actual bodily harm/i.test(t)) {
      return "Assault occasioning actual bodily harm, s.47 OAPA 1861";
    }
    return "ABH, s.47 OAPA 1861";
  }

  const hasS20 = /\bsection\s*20\b|\bs\.?\s*20\b/i.test(t);
  if (hasS20 && /\bunlawful wounding\b|\bgbh\b|\bgrievous bodily harm\b/i.test(t)) {
    let normalized = t.replace(/\s+/g, " ").trim();
    normalized = normalized.replace(/^section\s*(\d+)/i, "Section $1");
    if (/unlawful wounding/i.test(normalized)) return normalized;
    return "Unlawful wounding / GBH, s.20 OAPA 1861";
  }

  if (/\bfraud by false representation\b/i.test(t)) {
    return "Fraud by false representation, s.2 Fraud Act 2006";
  }
  if (/\bhandling stolen goods\b/i.test(t) && /theft act 1968/i.test(t)) {
    return "Handling stolen goods, contrary to s.22 Theft Act 1968";
  }
  if (/\bpossession with intent to supply\b/i.test(t) && /\bclass\s*a\b/i.test(t)) {
    return "Possession with intent to supply Class A controlled drugs";
  }
  if (/\bpossession of a controlled drug\b/i.test(t) && /\bintent to supply\b/i.test(t)) {
    return t.replace(/\s+/g, " ").trim();
  }
  if (/\baggravated burglary\b/i.test(t) && /theft act 1968/i.test(t)) {
    return "Aggravated burglary, contrary to s.10 Theft Act 1968";
  }
  if (/\bburglary\b/i.test(t) && /theft act 1968/i.test(t)) {
    const normalized = t.replace(/\s+/g, " ").trim();
    if (normalized.length <= 180) return normalized;
    return "Burglary, contrary to s.9 Theft Act 1968";
  }
  if (/\brobbery\b/i.test(t) && /theft act 1968/i.test(t)) {
    return "Robbery, contrary to s.8 Theft Act 1968";
  }
  if (
    /\btheft\b/i.test(t) &&
    /theft act 1968/i.test(t) &&
    /;\s*(?:possession|bladed article)/i.test(t)
  ) {
    return t.replace(/\s+/g, " ").trim();
  }
  if (
    /\btheft\b/i.test(t) &&
    /theft act 1968/i.test(t) &&
    !/\brobbery\b/i.test(t) &&
    !/\bburglary\b/i.test(t)
  ) {
    return "Theft, contrary to s.1 Theft Act 1968";
  }
  if (/\bdangerous driving\b/i.test(t) && /road traffic|rta/i.test(t)) {
    return "Dangerous driving, contrary to section 2 Road Traffic Act 1988";
  }
  if (/\baffray\b/i.test(t) && /public order/i.test(t)) {
    return t.replace(/\s+/g, " ").trim();
  }
  if (/\bsection\s*3\b/i.test(t) && /public order act 1986/i.test(t)) {
    return "Affray, contrary to section 3 Public Order Act 1986";
  }

  const hasS18 = /\bsection\s*18\b|\bs\.?\s*18\b/i.test(t);
  if (
    (hasS18 || /\bwounding with intent\b/i.test(t)) &&
    /\bgrievous bodily harm\b|\bwounding with intent\b/i.test(t)
  ) {
    return "Wounding with intent to cause grievous bodily harm, s.18 OAPA 1861";
  }
  if (/\bwounding with intent\b/i.test(t)) {
    return "Wounding with intent to cause grievous bodily harm, s.18 OAPA 1861";
  }

  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

/** Golden-10 / fictional charge sheets: "Offence(s) as tag: …" or OCR-broken "(s) as tag: …". */
export function normalizeOffenceAsTagLine(raw: string): string | null {
  const m = raw.match(/(?:offence\s*)?\(?s\)?\s*as\s*tag\s*:\s*(.+)/i);
  if (!m?.[1]) return null;
  let tag = cleanLineValue(trimChargeAllegationBoundary(m[1]));
  if (!tag) return null;
  tag = tag.replace(/\s*\(fictional charge drafting[^)]*\)/gi, "").trim();
  tag = tag.replace(/\s*\(fictional[^)]*\)/gi, "").trim();
  return tag.length >= 4 ? tag : null;
}

function isProvisionalOffenceTagWording(value: string): boolean {
  return /^\(s\)\s*as\s*tag:/i.test(value.trim()) || /\bfictional charge drafting\b/i.test(value);
}

function extractCorrectedIndictmentWording(scan: string): string | null {
  const m = scan.match(/\b(?:Corrected indictment|Latest indictment)\s*:\s*([^\n]{8,220})/i);
  if (m?.[1]) {
    const v = cleanLineValue(trimChargeAllegationBoundary(m[1]));
    if (v && !isSpuriousChargeLabelValue(v) && !/OLD VERSION/i.test(v) && !/^Corrected indictment\s+s\.?\s*(18|20)$/i.test(v)) {
      return v;
    }
  }

  if (/\bCorrected indictment\s+s\.?\s*(18|20)\b/i.test(scan)) {
    const flat = scan.replace(/\s*\n\s*/g, " ");
    const full = flat.match(
      /\b((?:Unlawful wounding|Wounding with intent)[^.\n]{0,160}contrary to section\s*(18|20)[^.\n]{0,120})/i,
    );
    if (full?.[1]) return cleanLineValue(full[1]);
    const partial = flat.match(
      /\b((?:Unlawful )?wounding,\s*contrary to section\s*(18|20)[^.\n]{0,120})/i,
    );
    if (partial?.[1]) {
      const v = partial[1].trim();
      return cleanLineValue(/^wounding,/i.test(v) ? v.replace(/^wounding,/i, "Unlawful wounding,") : v);
    }
  }

  return null;
}

function isTrackerCategoryOffenceLabel(value: string): boolean {
  const t = value.trim();
  if (!t || t.length < 8) return true;
  if (/\b(contrary to|section\s*\d|s\.?\s*\d+\s*\(|common law|act 19|misuse of drugs)\b/i.test(t)) {
    return false;
  }
  if (/disclosure-heavy|pub incident|wording|multi-def|count-specific violence|money laundering$/i.test(t)) {
    return true;
  }
  if (/^corrected indictment\s+s\.?\s*(18|20)$/i.test(t)) return true;
  if (/^mixed counts$/i.test(t)) return true;
  if (/^gbh disclosure-heavy$/i.test(t)) return true;
  return false;
}

function isSpuriousChargeLabelValue(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (!t || t.length < 8) return true;
  if (/^charge\s*sheet$/i.test(t) || t === "sheet") return true;
  if (/^count\s*\d+$/i.test(t)) return true;
  if (isTrackerCategoryOffenceLabel(value)) return true;
  return false;
}

/** MG5-style incident narrative — not a charge-sheet offence label. */
function isNarrativeAllegationValue(value: string): boolean {
  const t = value.trim();
  if (!t || t.length < 16) return false;
  if (/^(?:at\s+~?\d|on\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b|outside\s+)/i.test(t)) {
    return true;
  }
  if (/\bdefendant allegedly\b/i.test(t) && !/\b(contrary to|section\s*\d+)\b/i.test(t)) return true;
  if (
    t.length > 72 &&
    !/\b(contrary to|section\s*\d+|common law|wounding with intent|pervert|dangerous driving)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

function extractChargeSheetAllegation(scan: string, fullText: string): string | null {
  for (const src of [scan, fullText]) {
    const normalized = normalizeMetadataScanText(src);
    const section = normalized.match(
      /\bAllegation\b\s*\n+\s*Count\s*\d+\s*[:\\-]\s*([^\n]{8,220})/i,
    );
    if (section?.[1]) {
      const v = cleanLineValue(trimChargeAllegationBoundary(section[1]));
      if (v && !isNarrativeAllegationValue(v) && !isSpuriousChargeLabelValue(v)) return v;
    }
    const countLine = normalized.match(
      /\bCount\s*1\s*[:\\-]\s*([^\n]{8,220}(?:section|contrary|oapa|act|common law)[^\n]{0,80})/i,
    );
    if (countLine?.[1]) {
      const v = cleanLineValue(trimChargeAllegationBoundary(countLine[1]));
      if (v && !isNarrativeAllegationValue(v) && !isSpuriousChargeLabelValue(v)) return v;
    }
  }
  return null;
}

/** Stop charge/allegation capture before defence position, custody, MG6, etc. */
function trimChargeAllegationBoundary(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  const pipeIdx = t.indexOf("|");
  if (pipeIdx > 12) t = t.slice(0, pipeIdx).trim();

  const semiMatch = t.match(/^([^;]{12,}?);\s*(?:custody|remand|bail|defence|mg6|hearing|stage|court)/i);
  if (semiMatch?.[1]) t = semiMatch[1].trim();

  const dotMatch = t.match(
    /^(.+?)\.\s+(?:defence position|defence case|defence position not|client instructions|custody|remand|bail|mg6|next hearing|hearing date|stage:|court:|particulars|count\s+\d)/i,
  );
  if (dotMatch?.[1] && dotMatch[1].length >= 12) t = dotMatch[1].trim();

  t = t
    .replace(/\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?\s*$/i, "")
    .replace(/\s+and\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}.*$/i, "")
    .trim();
  const contraryIdx = t.search(/\bcontrary to section\b/i);
  if (contraryIdx > 0) {
    const second = t.slice(contraryIdx + 1).search(/\bcontrary to section\b/i);
    if (second >= 0) {
      const throughSecond = t.slice(contraryIdx, contraryIdx + 1 + second);
      if (!/;\s*(?:possession|having|use of|assault|bladed article)/i.test(throughSecond)) {
        t = t.slice(0, contraryIdx + 1 + second).trim();
      }
    }
  }

  return t.replace(/\.\s*$/, "").trim();
}

function extractLabeledChargeOrAllegation(scan: string, label: "Charge" | "Allegation"): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escaped}\\s*:\\s*([^\\n|]{8,220})`, "i"),
    new RegExp(`^${escaped}:\\s*(.+)$`, "im"),
    new RegExp(`\\b${escaped}(?![a-z:])([A-Z][^\\n|]{8,220})`, "i"),
  ];
  for (const re of patterns) {
    const m = scan.match(re);
    if (!m?.[1]) continue;
    const v = cleanLineValue(trimChargeAllegationBoundary(m[1]));
    if (v && !isSpuriousChargeLabelValue(v)) return v;
  }
  return null;
}

/** Merge charge + allegation lines into one safe header display. */
export function composeOffenceDisplayFromParts(
  chargeRaw: string | null | undefined,
  allegationRaw: string | null | undefined,
): string | null {
  const chargeClean = chargeRaw ? cleanLineValue(trimChargeAllegationBoundary(chargeRaw)) : null;
  const allegationClean = allegationRaw ? cleanLineValue(trimChargeAllegationBoundary(allegationRaw)) : null;
  if (!chargeClean && !allegationClean) return null;

  const allegationFmt = allegationClean ? formatOffenceDisplayFromBundle(allegationClean) : null;
  const chargeFmt = chargeClean ? formatOffenceDisplayFromBundle(chargeClean) : null;
  if (!allegationFmt) return chargeFmt;
  if (!chargeFmt) return allegationFmt;

  const mechMatch = chargeClean?.match(/\s[-–—]\s*(.+)$/i);
  if (mechMatch?.[1]) {
    const mech = cleanLineValue(trimChargeAllegationBoundary(mechMatch[1]));
    if (mech && !allegationFmt.toLowerCase().includes(mech.slice(0, 10).toLowerCase())) {
      return `${allegationFmt} — ${mech}`;
    }
  }

  if (/\bdefence position\b|\bcustody\b|\bmg6\b/i.test(chargeFmt)) return allegationFmt;
  if (chargeFmt.length > allegationFmt.length + 24) return allegationFmt;
  return allegationFmt.length >= 12 ? allegationFmt : chargeFmt;
}

function extractParticularsCommittedOffence(block: string): string | null {
  const section = block.match(/Particulars of offence([\s\S]{0,420}?)(?=\n\n|MG5|\nCB-TB|\nURN)/i);
  if (!section?.[1]) return null;
  const flat = section[1].replace(/\s*\n\s*/g, " ");
  const m = flat.match(
    /committed the offence of\s+((?:Doing an\s+)?(?:Unlawful\s+)?[^.]{8,220}?contrary to (?:section\s*\d+|common law)[^.]{0,120})/i,
  );
  if (!m?.[1]) return null;
  const v = cleanLineValue(trimChargeAllegationBoundary(m[1]));
  if (v && v.length >= 16 && !isSpuriousChargeLabelValue(v)) return v;
  return null;
}

function extractOffenceFromChargeBlock(block: string): string | null {
  const corrected = extractCorrectedIndictmentWording(block);
  if (corrected) return corrected;

  const fromParticulars = extractParticularsCommittedOffence(block);
  if (fromParticulars) return fromParticulars;

  const statementGlued = block.match(/\bStatement of offence\s*([^\n]{16,220})/i);
  if (statementGlued?.[1]) {
    const v = cleanLineValue(trimChargeAllegationBoundary(statementGlued[1]));
    if (v && v.length >= 16 && !isSpuriousChargeLabelValue(v)) return v;
  }

  const pwitsGlued = block.match(
    /\b(Possession of [^\n,]{8,120}with intent to supply,?\s*(?:\n\s*)?contrary to section[^\n]{8,100})/i,
  );
  if (pwitsGlued?.[1]) {
    const merged = pwitsGlued[1].replace(/\s*\n\s*/g, " ");
    const v = cleanLineValue(trimChargeAllegationBoundary(merged));
    if (v && v.length >= 16) return v;
  }

  const chargePossession = block.match(
    /\bCharge\s*(Possession[^\n,]{8,160}with intent to supply,?\s*(?:\n\s*)?contrary to section[^\n]{8,100})/i,
  );
  if (chargePossession?.[1]) {
    const v = cleanLineValue(trimChargeAllegationBoundary(chargePossession[1].replace(/\s*\n\s*/g, " ")));
    if (v && v.length >= 16) return v;
  }

  const lines = block
    .split(/\n/)
    .map((l) => normalizeMetadataScanText(l.trim()))
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^statement of offence/i.test(line)) {
      const same = line.replace(/^statement of offence\s*:?\s*/i, "").trim();
      if (same.length >= 16 && !isSpuriousChargeLabelValue(same)) {
        const v = cleanLineValue(same);
        if (v) return v;
      }
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const next = lines[j]!;
        if (/contrary to section/i.test(next)) {
          const v = cleanLineValue(trimChargeAllegationBoundary(next));
          if (v && v.length >= 16) return v;
        }
        const merged = cleanLineValue(trimChargeAllegationBoundary(`${same} ${next}`));
        if (merged && /contrary to section/i.test(merged) && merged.length >= 16) return merged;
      }
    }
    if (/^charge\s*:/i.test(line)) {
      const v = cleanLineValue(line.replace(/^charge\s*:\s*/i, ""));
      if (v && !isSpuriousChargeLabelValue(v) && v.length >= 8) return v;
    }
    if (/^charge(?![a-z:])([A-Z])/i.test(line)) {
      const v = cleanLineValue(trimChargeAllegationBoundary(line.replace(/^charge/i, "")));
      if (v && !isSpuriousChargeLabelValue(v) && v.length >= 8) return v;
    }
    if (/^offence\s*[:]/i.test(line)) {
      const asTag = normalizeOffenceAsTagLine(line);
      if (asTag) return asTag;
      const v = cleanLineValue(line.replace(/^offence\s*[:]\s*/i, ""));
      if (v && !isSpuriousChargeLabelValue(v)) return v;
    }
    if (/^(?:offence\s*)?\(?s\)?\s*as\s*tag\s*:/i.test(line)) {
      const asTag = normalizeOffenceAsTagLine(line);
      if (asTag) return asTag;
    }
    if (/^allegation\s*:/i.test(line)) {
      const v = cleanLineValue(line.replace(/^allegation\s*:\s*/i, ""));
      if (v && !isSpuriousChargeLabelValue(v) && v.length >= 8) return v;
    }
    if (
      /section\s*20\b.*unlawful\s+wounding|unlawful\s+wounding.*section\s*20|\bs\.?\s*20\b.*unlawful\s+wounding/i.test(
        line,
      ) &&
      line.length >= 16
    ) {
      return cleanLineValue(line);
    }
    const countLine = line.match(/^count\s*\d+\s*[:\\-]?\s*(.+)$/i);
    if (countLine?.[1]) {
      let captured = countLine[1].trim();
      if (
        /\bwounding with intent\b/i.test(captured) &&
        !/\bgrievous bodily harm\b|\bbodily harm\b/i.test(captured)
      ) {
        const next = lines[i + 1];
        if (next && /\bbodily harm\b/i.test(next)) {
          captured = `${captured} ${next.trim()}`;
        }
      }
      const v = cleanLineValue(captured);
      if (v && v.length >= 16) return v;
    }
    if (/contrary to common law/i.test(line) && /\b(pervert|murder|manslaughter)\b/i.test(line)) {
      return cleanLineValue(line);
    }
    if (/\bdangerous driving\b/i.test(line) && /contrary to section/i.test(line)) {
      return cleanLineValue(line);
    }
    if (/\bwounding with intent\b/i.test(line) || /\bs\.?\s*18\b.*oapa/i.test(line)) {
      return cleanLineValue(line);
    }
    if (/pervert(ing)?\s+the\s+course\s+of\s+justice/i.test(line)) {
      return cleanLineValue(line);
    }
    if (/section\s*20\b.*oapa|grievous bodily harm/i.test(line) && line.length >= 20) {
      return cleanLineValue(line);
    }
    if (/contrary to section\s*\d+/i.test(line) && line.length >= 24) {
      const prev = lines[i - 1];
      if (
        prev &&
        /(?:possession|supply|intent|being concerned|cocaine|cannabis|controlled drug)/i.test(prev) &&
        !/contrary to section/i.test(prev)
      ) {
        const lead = prev.replace(/^charge/i, "").trim();
        return cleanLineValue(trimChargeAllegationBoundary(`${lead}, ${line}`));
      }
      return cleanLineValue(line);
    }
    if (/assault occasioning actual bodily harm/i.test(line)) {
      return cleanLineValue(line);
    }
  }

  const particularsViolence = block.match(
    /Particulars of offence[^.\n]{0,160}?Unlawful\s*(?:\n\s*)?wounding,\s*contrary to section\s*20[^.\n]{0,120}/i,
  );
  if (particularsViolence?.[0]) {
    const v = cleanLineValue(
      trimChargeAllegationBoundary(
        particularsViolence[0]
          .replace(/^Particulars of offence[^U]{0,120}?Unlawful\s*/i, "Unlawful ")
          .replace(/\s*\n\s*/g, " "),
      ),
    );
    if (v && v.length >= 16) return v;
  }

  const particularsMixed = block.match(
    /Particulars of offence[\s\S]{0,240}?(Theft,?\s*(?:\n\s*)?contrary to section\s*1[^;]{0,80};\s*(?:possession of a )?bladed article[^.\n]{0,120})/i,
  );
  if (particularsMixed?.[1]) {
    const v = cleanLineValue(trimChargeAllegationBoundary(particularsMixed[1].replace(/\s*\n\s*/g, " ")));
    if (v && v.length >= 24) return v;
  }

  const multi = block.match(
    /(?:count\s*\d+\s*[:\\-]?\s*)?([^\n]{16,200}contrary to (?:section\s*\d+|common law)[^\n]{0,120})/i,
  );
  if (multi?.[1]) return cleanLineValue(multi[1]);

  const gluedStatement = block.match(
    /Statement of offence\s*(Mixed counts|Theft[^.\n]{12,200}contrary to section[^.\n]{8,120})/i,
  );
  if (gluedStatement?.[1] && !/^mixed counts$/i.test(gluedStatement[1].trim())) {
    const v = cleanLineValue(trimChargeAllegationBoundary(gluedStatement[1]));
    if (v && v.length >= 16) return v;
  }
  const wounding = block.match(
    /\b(Wounding with intent[^\n]{10,120}(?:OAPA|Offences Against the Person Act)[^\n]{0,40})/i,
  );
  if (wounding?.[1]) return cleanLineValue(wounding[1]);
  return null;
}

function normalizeChargeOffence(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const murder = t.match(/\b(murder,?\s+contrary to common law)\b/i);
  if (murder?.[1]) return formatOffenceDisplayFromBundle(murder[1]);
  if (/charged with\s+murder/i.test(t) && /contrary to common law/i.test(t)) {
    return "Murder, contrary to common law";
  }
  if (/^[^.]{0,40}\s+is charged with\s+/i.test(t)) {
    const inner = t.replace(/^[^.]{0,80}?\s+is charged with\s+/i, "").trim();
    const m2 = inner.match(/\b(murder[^.|]{0,80}contrary to common law)\b/i);
    if (m2?.[1]) return formatOffenceDisplayFromBundle(m2[1]);
    if (/murder/i.test(inner)) return formatOffenceDisplayFromBundle(inner.split(/[.|]/)[0] ?? inner);
  }
  return cleanLineValue(trimChargeAllegationBoundary(t));
}

function extractOffenceWording(scan: string, fullText: string): { wording: string | null; source: MetadataFieldSource } {
  const corrected =
    extractCorrectedIndictmentWording(scan) ??
    extractCorrectedIndictmentWording(normalizeMetadataScanText(fullText));
  if (corrected && !isNarrativeAllegationValue(corrected)) {
    return {
      wording: formatOffenceDisplayFromBundle(corrected),
      source: "extracted_charge_fallback",
    };
  }

  const statutoryViolence = scan.match(
    /\b((?:Unlawful wounding|Wounding with intent)[^.\n]{0,160}contrary to section\s*(18|20)[^.\n]{0,120})/i,
  );
  if (statutoryViolence?.[1]) {
    return {
      wording: formatOffenceDisplayFromBundle(cleanLineValue(statutoryViolence[1])!),
      source: "extracted_charge_fallback",
    };
  }

  const moneyLaundering = scan.match(
    /\b((?:Entering into|Becoming concerned)[^.\n]{0,160}money laundering[^.\n]{0,80}contrary to section\s*328[^.\n]{0,80})/i,
  );
  if (moneyLaundering?.[1]) {
    return {
      wording: formatOffenceDisplayFromBundle(cleanLineValue(moneyLaundering[1])!),
      source: "extracted_charge_fallback",
    };
  }

  const chargeBlockRaw =
    extractSectionBlock(fullText, ["CHARGE", "CHARGE_SHEET", "CHARGES", "INDICTMENT"]) ?? null;
  const chargeBlock = chargeBlockRaw ? normalizeMetadataScanText(chargeBlockRaw) : null;
  if (chargeBlock) {
    const fromCharge = extractOffenceFromChargeBlock(chargeBlock);
    if (fromCharge) {
      const trimmed = trimChargeAllegationBoundary(fromCharge);
      return { wording: formatOffenceDisplayFromBundle(trimmed), source: "extracted_charge_fallback" };
    }
  }

  const fromScanCharge =
    extractOffenceFromChargeBlock(scan) ??
    extractOffenceFromChargeBlock(normalizeMetadataScanText(fullText));
  if (fromScanCharge && !isNarrativeAllegationValue(fromScanCharge)) {
    const trimmed = trimChargeAllegationBoundary(fromScanCharge);
    return { wording: formatOffenceDisplayFromBundle(trimmed), source: "extracted_charge_fallback" };
  }

  const chargeSheetAllegation = extractChargeSheetAllegation(scan, fullText);
  if (chargeSheetAllegation) {
    return {
      wording: formatOffenceDisplayFromBundle(chargeSheetAllegation),
      source: "extracted_charge_fallback",
    };
  }

  const inlineCharge = extractLabeledChargeOrAllegation(scan, "Charge");
  let inlineAllegation = extractLabeledChargeOrAllegation(scan, "Allegation");
  if (inlineAllegation && isNarrativeAllegationValue(inlineAllegation)) inlineAllegation = null;
  const composed = composeOffenceDisplayFromParts(inlineCharge, inlineAllegation);
  if (composed && !isNarrativeAllegationValue(composed)) {
    return {
      wording: composed,
      source: inlineCharge ? "extracted_charge_fallback" : "extracted_cover_fallback",
    };
  }

  const chargeLabelLine = scan.match(/^Charge:\s*(.+)$/im);
  if (chargeLabelLine?.[1]) {
    const v = cleanLineValue(trimChargeAllegationBoundary(chargeLabelLine[1]));
    if (v && !isSpuriousChargeLabelValue(v)) {
      return { wording: formatOffenceDisplayFromBundle(v), source: "extracted_cover_fallback" };
    }
  }

  const chargedWithGeneric = scan.match(
    /\b(?:is\s+)?charged with\s+([^.\n]{12,160}?)(?:\s+in that|\s+on \d|\.\s)/i,
  );
  if (chargedWithGeneric?.[1]) {
    const v = cleanLineValue(chargedWithGeneric[1]);
    if (v && !isSpuriousChargeLabelValue(v)) {
      return { wording: formatOffenceDisplayFromBundle(v), source: "extracted_charge_fallback" };
    }
  }

  let offenceWording =
    extractLabeledValue(scan, ["Offence", "Offense", "Statement of offence"]) ??
    extractInlineLabeled(scan, ["Offence", "Offense", "Statement of offence"]) ??
    null;

  if (offenceWording && !isSpuriousChargeLabelValue(offenceWording) && offenceWording.length < 200) {
    const norm = normalizeChargeOffence(offenceWording);
    if (norm) return { wording: norm, source: "extracted_cover_fallback" };
  }

  const chargeInline = scan.match(
    /\bCharge\s+((?:murder|manslaughter)[^.\n|]{0,80}contrary to common law)/i,
  );
  if (chargeInline?.[1]) {
    return { wording: formatOffenceDisplayFromBundle(chargeInline[1]), source: "extracted_charge_fallback" };
  }

  const chargedWith = scan.match(
    /\b(?:is\s+)?charged with\s+(murder[^.\n|]{0,100}contrary to common law)/i,
  );
  if (chargedWith?.[1]) {
    return { wording: "Murder, contrary to common law", source: "extracted_charge_fallback" };
  }

  const murderStandalone = scan.match(/\b(Murder,?\s+contrary to common law)\b/i);
  if (murderStandalone?.[1]) {
    return { wording: "Murder, contrary to common law", source: "extracted_charge_fallback" };
  }

  return { wording: null, source: "unavailable" };
}

const MONTH_NAME =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const HEARING_TIME_SUFFIX = "(?:\\s+(?:at\\s+)?\\d{1,2}:\\d{2})?";

function isPlausibleCourtValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length < 8 || /^court$/i.test(v)) return false;
  return /(?:magistrates(?:\s+court)?|crown court|youth court)/i.test(v);
}

function normalizeGluedHearingScan(scan: string): string {
  return scan
    .replace(
      new RegExp(`(\\b${MONTH_NAME}[a-z]*)\\s*\\n\\s*(\\d{4})`, "gi"),
      "$1 $2",
    )
    .replace(
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})at(\d{1,2}:\d{2})/gi,
      "$1 at $2",
    )
    .replace(/\bNext hearing(?=\d)/gi, "Next hearing ")
    .replace(/\bHearing(?=\d{1,2}(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/gi, "Hearing ")
    .replace(
      /( at [A-Za-z'’]+?)(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/gi,
      "$1 $2",
    )
    .replace(
      /(\d{1,2})(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi,
      "$1 $2",
    );
}

const HEARING_DATE_PATTERN =
  /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i;

function hasUkHearingDatePattern(raw: string): boolean {
  return HEARING_DATE_PATTERN.test(raw);
}

function isJunkHearingValue(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;
  if (
    /appears in the served listing|no alternative current hearing|not safely extracted|listing notice only/i.test(
      raw,
    )
  ) {
    return true;
  }
  const t = raw.trim();
  if (/^Court\s+Crown$/i.test(t)) return true;
  if (/^(?:Court\s+)?Crown(?:\s+Court)?(?:\s+at\s+[A-Za-z'']+)?$/i.test(t)) return true;
  if (!hasUkHearingDatePattern(t) && /(?:Crown Court|Magistrates(?:'|\u2019)?\s*Court|\bCourt\b)/i.test(t)) {
    return true;
  }
  return false;
}

function extractCourt(scan: string): string | null {
  const scrubGluedCourt = (value: string): string =>
    value
      .replace(/^CourtHearing/i, "")
      .replace(/^Hearing/i, "")
      .replace(/Hearing\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*\s+\d{4}.*$/i, "")
      .replace(/\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?\s*$/i, "")
      .replace(/\b(?:Next|Case|Stage|Bundle|Matter)\b.*$/i, "")
      .replace(/\bMatter ref\b.*$/i, "")
      .replace(/\bProsecution Authority\b.*$/i, "")
      .replace(/\bCase ref\b.*$/i, "")
      .trim();

  const courtHearingVenue = scan.match(
    /\bCourtHearing([A-Z][A-Za-z'’]+(?:\s+[A-Za-z'’]+)*\s+Magistrates(?:'|\u2019)?\s*Court)/i,
  );
  if (courtHearingVenue?.[1]) {
    const v = cleanLineValue(courtHearingVenue[1]);
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }

  const courtHearingCrown = scan.match(/\bCourtHearing(Crown Court at [A-Za-z'’\s]+?)(?=\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December))/i);
  if (courtHearingCrown?.[1]) {
    const v = cleanLineValue(courtHearingCrown[1]);
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }

  const crownGlued = scan.match(
    /Crown Court(?:Hearing)?\s+at\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/i,
  );
  if (crownGlued?.[1]) {
    const v = cleanLineValue(`Crown Court at ${crownGlued[1]}`);
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }

  const crownAt = scan.match(/Crown Court at [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*/i);
  if (crownAt?.[0]) {
    const v = cleanLineValue(crownAt[0]);
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }

  const magLine = scan.match(
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+Magistrates(?:'|\u2019)?\s*Court)\b/i,
  );
  if (magLine?.[1]) {
    const v = cleanLineValue(magLine[1].replace(/^CourtHearing/i, "").replace(/^Hearing/i, ""));
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }

  const labeled =
    extractLabeledValue(scan, ["Court", "Venue", "Crown Court", "Magistrates"]) ??
    extractInlineLabeled(scan, ["Court", "Venue"]);
  if (labeled && isPlausibleCourtValue(labeled)) {
    const v = cleanLineValue(labeled);
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }

  const inline = scan.match(/\bCourt\s+([A-Z][a-z]+(?:\s+[A-Za-z]+)*\s+(?:Crown Court|Magistrates(?:\s+Court)?))/i);
  if (inline?.[1]) {
    const v = cleanLineValue(inline[1]);
    if (v && !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+Crown Court$/i.test(v)) {
      return scrubGluedCourt(v);
    }
  }

  const gluedMag = scan.match(/\bCourt([A-Z][a-z]+(?:\s+[A-Za-z]+)*\s+Magistrates(?:\s+Court)?)/i);
  if (gluedMag?.[1]) {
    const v = cleanLineValue(gluedMag[1]);
    if (v) return scrubGluedCourt(v);
  }

  const courtLine = scan.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Crown Court)\b/);
  if (courtLine?.[1]) {
    const v = cleanLineValue(courtLine[1]);
    if (v && !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+Crown Court$/i.test(v)) return v;
  }

  if (labeled) {
    const v = cleanLineValue(labeled);
    if (v && isPlausibleCourtValue(v)) return scrubGluedCourt(v);
  }
  return null;
}

function cleanExtractedHearingRaw(raw: string | null): string | null {
  if (!raw || isJunkHearingValue(raw)) return null;
  return raw
    .replace(/\s+\b(?:Defendant|Accused|Client)\b\s*[:\-].*$/i, "")
    .replace(/\s+\bCourt\b\s*[:\-].*$/i, "")
    .trim();
}

function extractNextHearing(scan: string): {
  raw: string | null;
  iso: string | null;
  source: MetadataFieldSource;
} {
  const hearingScan = normalizeGluedHearingScan(scan);
  let nextHearingRaw: string | null = null;

  const tryHearing = (candidate: string | null | undefined): void => {
    const v = candidate ? cleanLineValue(candidate) : null;
    if (!v || isJunkHearingValue(v)) return;
    const vHasDate = hasUkHearingDatePattern(v);
    if (nextHearingRaw) {
      const curHasDate = hasUkHearingDatePattern(nextHearingRaw);
      if (curHasDate && !vHasDate) return;
      if (!curHasDate && !vHasDate) return;
    }
    nextHearingRaw = v;
  };

  const nextHearingGlued = hearingScan.match(
    new RegExp(
      `\\bNext hearing\\s*(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
      "i",
    ),
  );
  if (nextHearingGlued?.[1]) tryHearing(nextHearingGlued[1]);

  if (!nextHearingRaw) {
    const pipeHearing = hearingScan.match(
      new RegExp(
        `\\|\\s*Hearing:\\s*(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (pipeHearing?.[1]) tryHearing(pipeHearing[1]);
  }

  if (!nextHearingRaw) {
    const hearingLabel = hearingScan.match(
      new RegExp(
        `\\bHearing\\s*:\\s*(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (hearingLabel?.[1]) tryHearing(hearingLabel[1]);
  }

  if (!nextHearingRaw) {
    tryHearing(
      extractLabeledValue(hearingScan, [
        "Next hearing",
        "Next Hearing",
        "First Hearing",
        "First hearing",
        "First appearance",
        "Hearing",
        "Hearing date and time",
        "Hearing date",
        "Listed",
        "Date of hearing",
      ]) ??
        extractInlineLabeled(hearingScan, [
          "Next hearing",
          "Next Hearing",
          "Hearing",
          "Hearing date and time",
          "Hearing date",
        ]),
    );
  }

  if (!nextHearingRaw) {
    const gluedHearing = hearingScan.match(
      new RegExp(
        `\\bHearing(?:\\s+date\\s+and\\s+time|\\s+date|\\s+time)?\\s*:?\\s*(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (gluedHearing?.[1]) tryHearing(gluedHearing[1]);
  }

  if (!nextHearingRaw) {
    const courtHearingVenueDate = hearingScan.match(
      new RegExp(
        `\\bCourtHearing(?:Crown Court(?:\\s+at\\s+[A-Za-z'’\\s]+)?|[A-Z][A-Za-z'’\\s]+Magistrates(?:'|\u2019)?\\s*Court)\\s*(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (courtHearingVenueDate?.[1]) tryHearing(courtHearingVenueDate[1]);
  }

  if (!nextHearingRaw) {
    const courtHearingGlued = hearingScan.match(
      new RegExp(
        `\\bCourtHearing(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (courtHearingGlued?.[1]) tryHearing(courtHearingGlued[1]);
  }

  if (!nextHearingRaw) {
    const courtHearingCompact = hearingScan.match(
      /\bCourtHearing[A-Za-z'’]*?(\d{1,2})(January|February|March|April|May|June|July|August|September|October|November|December)(\d{4})at(\d{1,2}:\d{2})/i,
    );
    if (courtHearingCompact) {
      tryHearing(
        `${courtHearingCompact[1]} ${courtHearingCompact[2]} ${courtHearingCompact[3]} at ${courtHearingCompact[4]}`,
      );
    }
  }

  if (!nextHearingRaw) {
    const currentListing = hearingScan.match(
      new RegExp(
        `\\bCurrent listing\\s*(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (currentListing?.[1]) tryHearing(currentListing[1]);
  }

  if (!nextHearingRaw) {
    const hearingInline = hearingScan.match(
      new RegExp(
        `\\bHearing(\\d{1,2}\\s+${MONTH_NAME}[a-z]*\\s+\\d{4}${HEARING_TIME_SUFFIX})`,
        "i",
      ),
    );
    if (hearingInline?.[1]) tryHearing(hearingInline[1]);
  }

  if (!nextHearingRaw) {
    const weekdayLine = hearingScan.match(
      /\bNext hearing\s*:?\s*((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+(?:at\s+)?\d{1,2}:\d{2})?(?:\s+for\s+[A-Za-z][A-Za-z0-9\/\-\s]{1,40})?)/i,
    );
    if (weekdayLine?.[1]) tryHearing(weekdayLine[1]);
  }

  if (!nextHearingRaw) {
    const inlineDate = hearingScan.match(
      /\bNext hearing\s+(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+(?:at\s+)?\d{1,2}:\d{2})?)/i,
    );
    if (inlineDate?.[1]) tryHearing(inlineDate[1]);
  }

  if (!nextHearingRaw) {
    const listed = hearingScan.match(
      /\bListed\s*:\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?(?:\s+[-–—]\s*[^.\n]{0,80})?)/i,
    );
    if (listed?.[1]) tryHearing(listed[1]);
  }

  if (!nextHearingRaw) {
    const listed = hearingScan.match(
      /Hearing listed at\s+[^.\n]{0,80}?\s+on\s+(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?)/i,
    );
    if (listed?.[1]) tryHearing(listed[1]);
  }

  if (!nextHearingRaw) {
    const listedFull = hearingScan.match(/Hearing listed at\s+([^.\n]{12,120})/i);
    if (listedFull?.[1]) {
      const inner = listedFull[1];
      const dateIn = inner.match(
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?)/i,
      );
      if (dateIn?.[1]) tryHearing(dateIn[1]);
    }
  }

  const hearingRawCleaned = cleanExtractedHearingRaw(nextHearingRaw);

  let nextHearingIso: string | null = null;
  if (hearingRawCleaned) {
    const parsed = parseUkHearingDateTime(hearingRawCleaned);
    if (parsed?.iso) nextHearingIso = parsed.iso;
  }

  return {
    raw: hearingRawCleaned,
    iso: nextHearingIso,
    source: hearingRawCleaned ? "extracted_procedural_fallback" : "unavailable",
  };
}

function extractStage(scan: string, parsedHeader?: ParsedBundleHeader | null): string | null {
  const stageLine = scan.match(
    /\b(?:Stage|Procedural stage|Case stage)\s*:?\s*([^\n|]{4,120}?)(?=\s*(?:\||\n|Custody|Defence|Defense|Next hearing|Bundle)\b)/i,
  );
  if (stageLine?.[1]) {
    const v = cleanLineValue(stageLine[1]);
    if (v) return v;
  }
  return (
    extractLabeledValue(scan, ["Stage", "Procedural stage", "Case stage"]) ??
    parsedHeader?.stage?.trim() ??
    null
  );
}

function extractBailStatus(scan: string): string | null {
  const remanded = scan.match(/\b(?:Custody status|Remand status|Bail status)\s+((?:Remanded|Bailed|Released)[^.\n|]{0,80})/i);
  if (remanded?.[1]) {
    const v = cleanLineValue(remanded[1]);
    if (v) return v;
  }
  return (
    extractLabeledValue(scan, ["Bail status", "Bail", "Custody status", "Remand status"]) ??
    extractInlineLabeled(scan, ["Bail status", "Remand status"]) ??
    null
  );
}

function formatDefencePositionDisplay(raw: string): string {
  const t = repairDisplayWordSpacing(raw);
  return t.replace(/^not guilty\.?\s*/i, "Not guilty — ");
}

/** Reject junk captures (e.g. lone "The" from generic "Position" labels). */
function sanitizeDefencePositionValue(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = formatDefencePositionDisplay(raw.trim());
  if (!t || t.length < 12) return null;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  if (/^(?:the|a|an|on|in|at|or|and|not)$/i.test(t)) return null;
  const hasPositionCue =
    /\b(?:not guilty|denies|deny|no comment|self-defence|self defense|causation|attribution|disputed|provisional)\b/i.test(
      t,
    );
  if (!hasPositionCue && words.length < 4) return null;
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

function extractDefencePosition(scan: string): string | null {
  const defenceLine = scan.match(
    /\bDefence position\s+((?:Not guilty|Denies|No comment)[^|\n]{10,220})/i,
  );
  if (defenceLine?.[1]) {
    const v = sanitizeDefencePositionValue(defenceLine[1]);
    if (v) return v;
  }

  const direct =
    extractLabeledValue(scan, [
      "Defence position",
      "Defense position",
      "Defence case",
      "Defence stance",
    ]) ?? extractInlineLabeled(scan, ["Defence position", "Defense position", "Defence case"]);
  if (direct) {
    const v = sanitizeDefencePositionValue(direct);
    if (v) return v;
  }

  const proc = extractSectionBlock(scan, ["PROCEDURAL", "PROCEDURAL_STATUS", "CASE_SUMMARY", "SUMMARY"]);
  if (proc) {
    const inProc =
      extractLabeledValue(proc, ["Defence position", "Defense position", "Defence case"]) ??
      extractInlineLabeled(proc, ["Defence position", "Defense position"]);
    if (inProc) {
      const v = sanitizeDefencePositionValue(inProc);
      if (v) return v;
    }
    const ng = proc.match(/not guilty[^.\n]{0,160}/i);
    if (ng) {
      const v = sanitizeDefencePositionValue(ng[0]);
      if (v) return v;
    }
  }

  const ngScan = scan.match(
    /\bNot guilty\.?\s*[^.\n]{0,120}(?:self-defence|causation|attribution)[^.\n]{0,80}/i,
  );
  if (ngScan?.[0]) {
    const v = sanitizeDefencePositionValue(ngScan[0]);
    if (v) return v;
  }

  return null;
}

export function extractBundleCaseMetadata(
  fullText: string,
  parsedHeader?: ParsedBundleHeader | null,
): ExtractedBundleCaseMetadata {
  const empty: ExtractedBundleCaseMetadata = {
    defendantName: null,
    defendantSource: "unavailable",
    complainant: null,
    complainantSource: "unavailable",
    court: null,
    courtSource: "unavailable",
    nextHearingRaw: null,
    nextHearingIso: null,
    nextHearingSource: "unavailable",
    stage: null,
    stageSource: "unavailable",
    offenceWording: null,
    offenceDisplay: null,
    offenceSource: "unavailable",
    bailStatus: null,
    bailStatusSource: "unavailable",
    defencePosition: null,
    defencePositionSource: "unavailable",
  };

  if (!fullText || fullText.trim().length < 40) return empty;

  const scan = buildMetadataScan(fullText);

  let defendantName = extractDefendantName(scan) ?? parsedHeader?.accused?.trim() ?? null;
  if (defendantName) defendantName = sanitizePersonName(defendantName) ?? defendantName;
  const defendantSource: MetadataFieldSource = defendantName ? "extracted_cover_fallback" : "unavailable";

  let complainant =
    extractComplainantName(scan) ?? sanitizeComplainantName(parsedHeader?.otherParty) ?? null;
  const complainantSource: MetadataFieldSource = complainant ? "extracted_cover_fallback" : "unavailable";

  const court = extractCourt(scan);
  const courtSource: MetadataFieldSource = court ? "extracted_cover_fallback" : "unavailable";

  const hearing = extractNextHearing(scan);

  const stage = extractStage(scan, parsedHeader);
  const stageSource: MetadataFieldSource = stage ? "extracted_cover_fallback" : "unavailable";

  let { wording: offenceWording, source: offenceSource } = extractOffenceWording(scan, fullText);

  if (!offenceWording && parsedHeader?.shortTitle?.trim()) {
    const short = parsedHeader.shortTitle.trim();
    if (/contrary to section|oapa|abh|gbh|assault|murder|common law/i.test(short)) {
      offenceWording = short;
      offenceSource = "extracted_cover_fallback";
    }
  }

  if (
    parsedHeader?.shortTitle?.trim() &&
    offenceWording &&
    isProvisionalOffenceTagWording(offenceWording)
  ) {
    offenceWording = parsedHeader.shortTitle.trim();
    offenceSource = "extracted_cover_fallback";
  }

  if (!offenceWording && parsedHeader?.shortTitle?.trim()) {
    offenceWording = parsedHeader.shortTitle.trim();
    offenceSource = "extracted_cover_fallback";
  }

  const offenceDisplay = offenceWording ? formatOffenceDisplayFromBundle(offenceWording) : null;

  const bailStatus = extractBailStatus(scan);
  const bailStatusSource: MetadataFieldSource = bailStatus ? "extracted_procedural_fallback" : "unavailable";

  const defencePosition = extractDefencePosition(scan);
  const defencePositionSource: MetadataFieldSource = defencePosition
    ? "extracted_procedural_fallback"
    : "unavailable";

  return {
    defendantName,
    defendantSource,
    complainant,
    complainantSource,
    court,
    courtSource,
    nextHearingRaw: hearing.raw,
    nextHearingIso: hearing.iso,
    nextHearingSource: hearing.source,
    stage,
    stageSource,
    offenceWording,
    offenceDisplay,
    offenceSource,
    bailStatus,
    bailStatusSource,
    defencePosition,
    defencePositionSource,
  };
}
