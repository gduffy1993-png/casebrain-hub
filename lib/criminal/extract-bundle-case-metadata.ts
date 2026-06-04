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

/** Highest-value text for metadata: front pages + cover/charge/hearing sections. */
export function buildMetadataScan(fullText: string): string {
  if (!fullText?.trim()) return "";
  const parts: string[] = [fullText.slice(0, FRONT_MATTER_CHARS)];
  const front = parts[0]!;
  for (const section of HIGH_VALUE_SECTIONS) {
    const block = extractSectionBlock(fullText, [section]);
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
  const verbWords =
    /^(?:contacted|communicated|alleged|denied|admitted|is|was|has|had|that|which|against|contrary|witness|victim|complainant)$/i;
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
    if (/unlawful wounding/i.test(t)) return t.replace(/\s+/g, " ").trim();
    return "Unlawful wounding / GBH, s.20 OAPA 1861";
  }

  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

function isSpuriousChargeLabelValue(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (!t || t.length < 8) return true;
  if (/^charge\s*sheet$/i.test(t) || t === "sheet") return true;
  if (/^count\s*\d+$/i.test(t)) return true;
  return false;
}

function extractOffenceFromChargeBlock(block: string): string | null {
  const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^statement of offence/i.test(line)) {
      const same = line.replace(/^statement of offence\s*:?\s*/i, "").trim();
      if (same.length >= 16) {
        const v = cleanLineValue(same);
        if (v) return v;
      }
      const next = lines[i + 1];
      if (next && next.length >= 16) {
        const v = cleanLineValue(next);
        if (v) return v;
      }
    }
    if (/^offence\s*[:]/i.test(line)) {
      const v = cleanLineValue(line.replace(/^offence\s*[:]\s*/i, ""));
      if (v && !isSpuriousChargeLabelValue(v)) return v;
    }
    const countLine = line.match(/^count\s*\d+\s*[:\\-]?\s*(.+)$/i);
    if (countLine?.[1]) {
      const v = cleanLineValue(countLine[1]);
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
      return cleanLineValue(line);
    }
    if (/assault occasioning actual bodily harm/i.test(line)) {
      return cleanLineValue(line);
    }
  }
  const multi = block.match(
    /(?:count\s*\d+\s*[:\\-]?\s*)?([^\n]{16,200}contrary to (?:section\s*\d+|common law)[^\n]{0,120})/i,
  );
  if (multi?.[1]) return cleanLineValue(multi[1]);
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
  return cleanLineValue(t);
}

function extractOffenceWording(scan: string, fullText: string): { wording: string | null; source: MetadataFieldSource } {
  const chargeBlockRaw =
    extractSectionBlock(fullText, ["CHARGE", "CHARGE_SHEET", "CHARGES", "INDICTMENT"]) ?? null;
  const chargeBlock = chargeBlockRaw ? normalizeMetadataScanText(chargeBlockRaw) : null;
  if (chargeBlock) {
    const fromCharge = extractOffenceFromChargeBlock(chargeBlock);
    if (fromCharge) {
      return { wording: formatOffenceDisplayFromBundle(fromCharge), source: "extracted_charge_fallback" };
    }
  }

  const chargeLabelLine = scan.match(/^Charge:\s*(.+)$/im);
  if (chargeLabelLine?.[1]) {
    const v = cleanLineValue(chargeLabelLine[1]);
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

  const fromScanCharge = extractOffenceFromChargeBlock(scan);
  if (fromScanCharge) {
    return { wording: formatOffenceDisplayFromBundle(fromScanCharge), source: "extracted_charge_fallback" };
  }

  return { wording: null, source: "unavailable" };
}

function extractCourt(scan: string): string | null {
  const labeled =
    extractLabeledValue(scan, ["Court", "Venue", "Crown Court", "Magistrates"]) ??
    extractInlineLabeled(scan, ["Court", "Venue"]);
  if (labeled && /crown court|magistrates/i.test(labeled)) return labeled;

  const inline = scan.match(/\bCourt\s+([A-Z][a-z]+(?:\s+[A-Za-z]+)*\s+Crown Court)\b/i);
  if (inline?.[1]) return cleanLineValue(inline[1]);

  const courtLine = scan.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Crown Court)\b/);
  if (courtLine?.[1]) return cleanLineValue(courtLine[1]);

  return labeled ? cleanLineValue(labeled) : null;
}

function extractNextHearing(scan: string): {
  raw: string | null;
  iso: string | null;
  source: MetadataFieldSource;
} {
  let nextHearingRaw =
    extractLabeledValue(scan, [
      "Next hearing",
      "Next Hearing",
      "Hearing date",
      "Listed",
      "Date of hearing",
    ]) ?? extractInlineLabeled(scan, ["Next hearing", "Next Hearing", "Hearing date"]) ?? null;

  if (!nextHearingRaw) {
    const weekdayLine = scan.match(
      /\bNext hearing\s*:?\s*((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?(?:\s+for\s+[A-Za-z][A-Za-z0-9\/\-\s]{1,40})?)/i,
    );
    if (weekdayLine?.[1]) nextHearingRaw = cleanLineValue(weekdayLine[1]);
  }

  if (!nextHearingRaw) {
    const inlineDate = scan.match(
      /\bNext hearing\s+(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?)/i,
    );
    if (inlineDate?.[1]) nextHearingRaw = cleanLineValue(inlineDate[1]);
  }

  if (!nextHearingRaw) {
    const listed = scan.match(
      /Hearing listed at\s+[^.\n]{0,80}?\s+on\s+(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?)/i,
    );
    if (listed?.[1]) nextHearingRaw = cleanLineValue(listed[1]);
  }

  if (!nextHearingRaw) {
    const listedFull = scan.match(
      /Hearing listed at\s+([^.\n]{12,120})/i,
    );
    if (listedFull?.[1]) {
      const inner = listedFull[1];
      const dateIn = inner.match(
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?)/i,
      );
      if (dateIn?.[1]) nextHearingRaw = cleanLineValue(dateIn[1]);
    }
  }

  if (nextHearingRaw) {
    nextHearingRaw = nextHearingRaw
      .replace(/\s+\b(?:Defendant|Accused|Client)\b\s*[:\-].*$/i, "")
      .replace(/\s+\bCourt\b\s*[:\-].*$/i, "")
      .trim();
  }

  let nextHearingIso: string | null = null;
  if (nextHearingRaw) {
    const parsed = parseUkHearingDateTime(nextHearingRaw);
    if (parsed?.iso) nextHearingIso = parsed.iso;
  }

  return {
    raw: nextHearingRaw,
    iso: nextHearingIso,
    source: nextHearingRaw ? "extracted_procedural_fallback" : "unavailable",
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

  let complainant = extractComplainantName(scan) ?? parsedHeader?.otherParty?.trim() ?? null;
  if (complainant) complainant = sanitizePersonName(complainant) ?? complainant;
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
