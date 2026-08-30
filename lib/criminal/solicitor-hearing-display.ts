/**
 * Shared solicitor-facing hearing / stage display helpers.
 * Presentation only — does not change extraction or chase builders.
 */

import { collapseHeaderCellDuplicates } from "@/lib/criminal/solicitor-display-dedupe";

const MONTH_TO_NUM: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const MONTH_NAME =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";

const LISTING_LABEL =
  "(?:PTPH|plea\\s+and\\s+trial\\s+preparation|date\\s+of\\s+hearing|next\\s+hearing|first\\s+hearing|hearing\\s+date|hearing\\s+listed|listed(?:\\s+for)?|listing)";

const LISTING_DATE_RE = new RegExp(
  `\\b${LISTING_LABEL}\\s*(?:listed(?:\\s+for)?|date)?\\s*[—–:-]?\\s*(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\s+)?(\\d{1,2})\\s+(${MONTH_NAME})\\s+(\\d{4})`,
  "i",
);

const LISTING_SLASH_RE = new RegExp(
  `\\b${LISTING_LABEL}\\s*(?:listed(?:\\s+for)?|date)?\\s*[—–:-]?\\s*(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})`,
  "i",
);

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Known seed / placeholder structured dates — never prefer over papers listing. */
export function isPlaceholderHearingIso(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return true;
  const m = iso.trim().match(ISO_DATE_RE);
  if (!m) return false;
  const ymd = `${m[1]}-${m[2]}-${m[3]}`;
  return ymd === "2026-01-01" || ymd === "2025-01-01" || ymd === "1970-01-01";
}

function pad2(n: string | number): string {
  return String(n).padStart(2, "0");
}

function monthTokenToNum(month: string): string | null {
  const key = month.toLowerCase();
  if (MONTH_TO_NUM[key]) return MONTH_TO_NUM[key]!;
  if (key.startsWith("sept")) return "09";
  const hit = Object.keys(MONTH_TO_NUM).find((name) => name.startsWith(key) || key.startsWith(name));
  return hit ? MONTH_TO_NUM[hit]! : null;
}

function slashPartsToIso(day: string, month: string, yearRaw: string): string | null {
  const d = Number(day);
  const m = Number(month);
  let y = Number(yearRaw);
  if (y < 100) y += y >= 50 ? 1900 : 2000;
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function monthPartsToIso(day: string, month: string, year: string): string | null {
  const mm = monthTokenToNum(month);
  if (!mm) return null;
  const d = Number(day);
  const y = Number(year);
  if (!Number.isFinite(d) || d < 1 || d > 31 || !Number.isFinite(y)) return null;
  return `${y}-${mm}-${pad2(d)}`;
}

function addIso(into: Set<string>, iso: string | null): void {
  if (iso) into.add(iso);
}

/** Dates that appear as DOB / date of birth on the papers. */
export function collectDobHearingPoisonIsos(hay: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!hay) return out;
  const slash =
    /\b(?:DOB|date\s+of\s+birth)\b[:\s(]*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/gi;
  for (const m of hay.matchAll(slash)) addIso(out, slashPartsToIso(m[1]!, m[2]!, m[3]!));
  const named =
    /\b(?:DOB|date\s+of\s+birth)\b[:\s(]*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/gi;
  for (const m of hay.matchAll(named)) addIso(out, monthPartsToIso(m[1]!, m[2]!, m[3]!));
  return out;
}

/**
 * Dates that are offence particulars ("On 12 March 2026 at … assaulted"),
 * not a listing line.
 */
export function collectOffenceHearingPoisonIsos(hay: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!hay) return out;
  const re = new RegExp(`\\bOn\\s+(\\d{1,2})\\s+(${MONTH_NAME})\\s+(\\d{4})\\s+at\\b`, "gi");
  for (const m of hay.matchAll(re)) {
    const idx = m.index ?? 0;
    const before = hay.slice(Math.max(0, idx - 48), idx);
    if (/\b(?:hearing|listed|ptph|listing|court)\b/i.test(before)) continue;
    addIso(out, monthPartsToIso(m[1]!, m[2]!, m[3]!));
  }
  const between = new RegExp(
    `\\bBetween\\s+(\\d{1,2})\\s+(${MONTH_NAME})\\s+(\\d{4})\\s+and\\s+(\\d{1,2})\\s+(${MONTH_NAME})\\s+(\\d{4})`,
    "gi",
  );
  for (const m of hay.matchAll(between)) {
    addIso(out, monthPartsToIso(m[1]!, m[2]!, m[3]!));
    addIso(out, monthPartsToIso(m[4]!, m[5]!, m[6]!));
  }
  return out;
}

export function isPoisonedHearingIso(iso: string | null | undefined, hay: string | null | undefined): boolean {
  const day = normalizeIsoDate(iso);
  if (!day) return false;
  return collectDobHearingPoisonIsos(hay).has(day) || collectOffenceHearingPoisonIsos(hay).has(day);
}

/**
 * Roles on the papers. Do not train this.
 * DOB = birthday. Offence = when it happened (particulars). Listing = court date.
 * Today is only used later to say passed / upcoming — it is not read off the PDF.
 * A hearing must not be the birthday, must not be the offence date, and must not
 * sit before the offence date (charge already happened; listing comes after).
 */
export type PaperDateRoles = {
  dobs: Set<string>;
  offenceIsos: Set<string>;
  listingIso: string | null;
  latestOffenceIso: string | null;
};

export function classifyPaperDateRoles(hay: string | null | undefined): PaperDateRoles {
  const dobs = collectDobHearingPoisonIsos(hay);
  const offenceIsos = collectOffenceHearingPoisonIsos(hay);
  const listingIso = parseHearingIsoFromListingText(hay);
  let latestOffenceIso: string | null = null;
  for (const iso of offenceIsos) {
    if (!latestOffenceIso || iso > latestOffenceIso) latestOffenceIso = iso;
  }
  return { dobs, offenceIsos, listingIso, latestOffenceIso };
}

/** Listing is only safe if it is not a DOB/offence date and is not earlier than the offence. */
export function isPlausibleHearingAfterOffence(
  hearingIso: string | null | undefined,
  hay: string | null | undefined,
): boolean {
  const day = normalizeIsoDate(hearingIso);
  if (!day) return false;
  const roles = classifyPaperDateRoles(hay);
  if (roles.dobs.has(day) || roles.offenceIsos.has(day)) return false;
  if (roles.latestOffenceIso && day < roles.latestOffenceIso) return false;
  return true;
}

/** Parse a listing/PTPH date from bundle / raw hearing text into YYYY-MM-DD. */
export function parseHearingIsoFromListingText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const named = text.match(LISTING_DATE_RE);
  if (named) {
    const iso = monthPartsToIso(named[1]!, named[2]!, named[3]!);
    if (iso && !isPoisonedHearingIso(iso, text)) return iso;
  }
  const slash = text.match(LISTING_SLASH_RE);
  if (slash) {
    const iso = slashPartsToIso(slash[1]!, slash[2]!, slash[3]!);
    if (iso && !isPoisonedHearingIso(iso, text)) return iso;
  }
  return null;
}

/** First labelled listing date on the papers that is not a DOB or offence date. */
export function labelledHearingIsoFromHay(hay: string | null | undefined): string | null {
  return parseHearingIsoFromListingText(hay);
}

function normalizeIsoDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(ISO_DATE_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Prefer a labelled listing/PTPH on the papers.
 * Stored metadata and snapshots are used only if they are not a DOB, offence date, or placeholder.
 * Incomplete (null) is allowed. A birthday is not a hearing.
 */
export function resolveSolicitorHearingDateIso(input: {
  bundleNextHearingIso?: string | null;
  snapshotHearingNextAt?: string | null;
  nextHearingRaw?: string | null;
  bundleHay?: string | null;
}): string | null {
  const hay = [input.bundleHay, input.nextHearingRaw].filter(Boolean).join("\n");
  const fromListing =
    parseHearingIsoFromListingText(input.bundleHay) ??
    parseHearingIsoFromListingText(input.nextHearingRaw);
  if (
    fromListing &&
    !isPlaceholderHearingIso(fromListing) &&
    isPlausibleHearingAfterOffence(fromListing, hay)
  ) {
    return fromListing;
  }

  // Papers are on the file: listing or nothing. Do not promote a stored ISO
  // (Pack A stored the birthday). Status tests with no hay may still use ISO.
  if (hay.trim()) return null;

  const fromBundleMeta = normalizeIsoDate(input.bundleNextHearingIso);
  const fromSnapshot = normalizeIsoDate(input.snapshotHearingNextAt);
  for (const candidate of [fromBundleMeta, fromSnapshot]) {
    if (!candidate || isPlaceholderHearingIso(candidate)) continue;
    return candidate;
  }
  return null;
}

/** Stage cell for solicitor surfaces — collapse “pre ptph pre ptph”. */
export function displaySolicitorStage(raw: string | null | undefined): string {
  const t = collapseHeaderCellDuplicates(raw);
  if (!t || /not recorded|unknown/i.test(t)) return t;
  return t;
}
