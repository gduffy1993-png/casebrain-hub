/**
 * Safe extraction of criminal case header fields from combined bundle text.
 * Does not invent values — returns null when anchors are not clearly present.
 */

import type { ParsedBundleHeader } from "@/lib/bundle/parse-bundle-display";

const SCAN_CHARS = 28_000;

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
  const t = raw
    .replace(/\s+/g, " ")
    .replace(/\[[^\]]{0,80}\]/g, "")
    .trim();
  if (!t || t.length < 2) return null;
  if (/^(?:n\/a|none|unknown|—|-|\?)$/i.test(t)) return null;
  if (t.length > 280) return `${t.slice(0, 277)}…`;
  return t;
}

function extractLabeledValue(scan: string, labelPatterns: string[]): string | null {
  for (const label of labelPatterns) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^\\s*${escaped}\\s*[:\\-–]\\s*(.+)$`, "im");
    const m = scan.match(re);
    if (m?.[1]) {
      const v = cleanLineValue(m[1]);
      if (v) return v;
    }
  }
  return null;
}

/** Stop before these tokens when trimming a person-name capture from table-style PDF text. */
const PERSON_CAPTURE_STOP =
  /\s*(?:\||\s+DOB\b|Complainant\b|Victim\b|Venue\b|Court\b|Stage\b|Bail\b|Offence\b|Offense\b|Charge\b|Allegation\b|Next\s+hearing\b|[\n\r])/i;

const PERSON_NAME_TOKEN = `[A-Za-z][A-Za-z'’.\-]+`;
const PERSON_NAME_CAPTURE = `(${PERSON_NAME_TOKEN}(?:\\s+${PERSON_NAME_TOKEN}){0,3})`;

function trimPersonCapture(raw: string): string {
  let t = raw.replace(/^\|+|\|+$/g, "").replace(/\s+/g, " ").trim();
  const stop = t.search(PERSON_CAPTURE_STOP);
  if (stop >= 0) t = t.slice(0, stop).trim();
  t = t.replace(/\|.+$/, "").trim();
  const dob = t.search(/\s+DOB\b/i);
  if (dob >= 0) t = t.slice(0, dob).trim();
  return t;
}

/** Reject label tokens, fragments, and non name-like captures. */
function sanitizePersonName(value: string): string | null {
  const t = trimPersonCapture(value);
  if (!t || t.length < 3 || t.length > 60) return null;
  if (/^(?:defendant|accused|client|complainant|victim|name|unknown|n\/a|not\s+safely)/i.test(t)) {
    return null;
  }
  if (/not\s+safely\s+extracted/i.test(t)) return null;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) return null;
  const labelWords =
    /^(?:defendant|accused|client|complainant|victim|name|the|and|or|dob|doi|mr|mrs|ms|dr)$/i;
  if (words.some((w) => labelWords.test(w))) return null;
  if (!words.every((w) => /^[A-Za-z][A-Za-z'’.\-]{1,}$/.test(w))) return null;
  if (words.length >= 3 && /\b(was|is|has|had|that|which|against|contrary)\b/i.test(t)) return null;
  return words.join(" ");
}

/**
 * Defendant/accused/client from colon labels or table-style PDF rows (no colon).
 * Prefers Defendant/Accused over Client; does not use Complainant.
 */
function extractDefendantName(scan: string): string | null {
  const colonFirst =
    extractLabeledValue(scan, ["Defendant", "Accused", "Defendant name", "Client"]) ??
    null;
  if (colonFirst) {
    const v = sanitizePersonName(colonFirst);
    if (v) return v;
  }

  const tablePatterns: RegExp[] = [
    new RegExp(`\\bDefendant\\s+name\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bDefendant\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
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

  return null;
}

/** Complainant from colon or table-style rows (e.g. Complainant Oliver Shaw). */
function extractComplainantName(scan: string): string | null {
  const colon =
    extractLabeledValue(scan, ["Complainant", "Victim", "Other party / key witness", "Key witness"]) ??
    null;
  if (colon) {
    const v = sanitizePersonName(colon);
    if (v) return v;
  }

  const tablePatterns: RegExp[] = [
    new RegExp(`\\bComplainant\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
    new RegExp(`\\bVictim\\s*:?\\s*${PERSON_NAME_CAPTURE}`, "i"),
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

function extractSectionBlock(scan: string, sectionNames: string[]): string | null {
  for (const name of sectionNames) {
    const re = new RegExp(`===\\s*SECTION:\\s*${name}\\s*===([\\s\\S]{0,4000})`, "i");
    const m = scan.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

/** Parse UK-style hearing date/time from free text (no timezone guess beyond local). */
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

export function formatOffenceDisplayFromBundle(raw: string): string {
  const t = raw.trim();
  if (!t) return t;

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
    if (/unlawful wounding/i.test(t)) return t.replace(/\s+/g, " ").trim();
    return "Unlawful wounding / GBH, s.20 OAPA 1861";
  }

  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

function extractOffenceFromChargeBlock(block: string): string | null {
  const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^offence\s*[:]/i.test(line)) {
      const v = cleanLineValue(line.replace(/^offence\s*[:]\s*/i, ""));
      if (v) return v;
    }
    if (/contrary to section\s*\d+/i.test(line) && line.length >= 24) {
      return cleanLineValue(line);
    }
    if (/assault occasioning actual bodily harm/i.test(line)) {
      return cleanLineValue(line);
    }
  }
  const multi = block.match(
    /(?:count\s*\d+\s*[:\\-]?\s*)?([^\n]{20,200}contrary to section\s*\d+[^\n]{0,80})/i,
  );
  if (multi?.[1]) return cleanLineValue(multi[1]);
  return null;
}

function extractDefencePosition(scan: string): string | null {
  const direct = extractLabeledValue(scan, [
    "Defence position",
    "Defense position",
    "Defence case",
    "Defence stance",
    "Position",
  ]);
  if (direct) return direct;

  const proc = extractSectionBlock(scan, ["PROCEDURAL", "PROCEDURAL_STATUS", "CASE_SUMMARY", "SUMMARY"]);
  if (proc) {
    const inProc = extractLabeledValue(proc, ["Defence position", "Defense position", "Defence case"]);
    if (inProc) return inProc;
    const ng = proc.match(/not guilty[^.\n]{0,120}/i);
    if (ng) return cleanLineValue(ng[0]);
  }
  return null;
}

/**
 * Extract header metadata from combined document text (and optional eval-style header).
 */
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

  const scan = fullText.slice(0, SCAN_CHARS);

  let defendantName = extractDefendantName(scan) ?? parsedHeader?.accused?.trim() ?? null;
  if (defendantName) defendantName = sanitizePersonName(defendantName) ?? defendantName;
  let defendantSource: MetadataFieldSource = defendantName ? "extracted_cover_fallback" : "unavailable";

  let complainant = extractComplainantName(scan) ?? parsedHeader?.otherParty?.trim() ?? null;
  if (complainant) complainant = sanitizePersonName(complainant) ?? complainant;
  let complainantSource: MetadataFieldSource = complainant ? "extracted_cover_fallback" : "unavailable";

  let court = extractLabeledValue(scan, ["Court", "Venue", "Crown Court", "Magistrates"]);
  if (!court) {
    const courtLine = scan.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Crown Court)\b/);
    if (courtLine?.[1]) court = cleanLineValue(courtLine[1]);
  }
  let courtSource: MetadataFieldSource = court ? "extracted_cover_fallback" : "unavailable";

  let nextHearingRaw =
    extractLabeledValue(scan, [
      "Next hearing",
      "Next Hearing",
      "Hearing date",
      "Listed",
      "Date of hearing",
    ]) ?? null;
  let nextHearingSource: MetadataFieldSource = nextHearingRaw
    ? "extracted_procedural_fallback"
    : "unavailable";
  let nextHearingIso: string | null = null;
  if (nextHearingRaw) {
    const parsed = parseUkHearingDateTime(nextHearingRaw);
    if (parsed?.iso) nextHearingIso = parsed.iso;
  }

  let stage =
    extractLabeledValue(scan, ["Stage", "Procedural stage", "Case stage"]) ??
    parsedHeader?.stage?.trim() ??
    null;
  let stageSource: MetadataFieldSource = stage ? "extracted_cover_fallback" : "unavailable";

  let offenceWording =
    extractLabeledValue(scan, ["Offence", "Offense", "Charge", "Allegation"]) ?? null;
  let offenceSource: MetadataFieldSource = offenceWording
    ? "extracted_cover_fallback"
    : "unavailable";

  if (!offenceWording) {
    const chargeBlock =
      extractSectionBlock(scan, ["CHARGE", "CHARGE_SHEET", "CHARGES", "INDICTMENT"]) ?? scan;
    const fromCharge = extractOffenceFromChargeBlock(chargeBlock);
    if (fromCharge) {
      offenceWording = fromCharge;
      offenceSource = "extracted_charge_fallback";
    }
  }

  if (!offenceWording && parsedHeader?.shortTitle?.trim()) {
    const short = parsedHeader.shortTitle.trim();
    if (/contrary to section|oapa|abh|gbh|assault/i.test(short)) {
      offenceWording = short;
      offenceSource = "extracted_cover_fallback";
    }
  }

  let offenceDisplay = offenceWording ? formatOffenceDisplayFromBundle(offenceWording) : null;

  let bailStatus = extractLabeledValue(scan, ["Bail status", "Bail", "Custody status"]);
  let bailStatusSource: MetadataFieldSource = bailStatus ? "extracted_procedural_fallback" : "unavailable";

  let defencePosition = extractDefencePosition(scan);
  let defencePositionSource: MetadataFieldSource = defencePosition
    ? "extracted_procedural_fallback"
    : "unavailable";

  return {
    defendantName,
    defendantSource,
    complainant,
    complainantSource,
    court,
    courtSource,
    nextHearingRaw,
    nextHearingIso,
    nextHearingSource,
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
