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

const LISTING_DATE_RE =
  /\b(?:PTPH|plea\s+and\s+trial\s+preparation|listing|next\s+hearing|hearing)\s*(?:listed|listed\s+for|date)?\s*[—–:-]?\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})(?:,?\s*(\d{1,2}:\d{2}))?/i;

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

/** Parse a listing/PTPH date from bundle / raw hearing text into YYYY-MM-DD. */
export function parseHearingIsoFromListingText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const hit = text.match(LISTING_DATE_RE);
  if (!hit) return null;
  const day = pad2(hit[1]!);
  const month = MONTH_TO_NUM[hit[2]!.toLowerCase()];
  const year = hit[3]!;
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function normalizeIsoDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(ISO_DATE_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Prefer real listing/PTPH from papers over seeded snapshot placeholders (e.g. 2026-01-01).
 * Returns null when only a placeholder exists so callers omit a hard fake date.
 */
export function resolveSolicitorHearingDateIso(input: {
  bundleNextHearingIso?: string | null;
  snapshotHearingNextAt?: string | null;
  nextHearingRaw?: string | null;
  bundleHay?: string | null;
}): string | null {
  const fromBundleMeta = normalizeIsoDate(input.bundleNextHearingIso);
  const fromListing =
    parseHearingIsoFromListingText(input.bundleHay) ??
    parseHearingIsoFromListingText(input.nextHearingRaw);
  const fromSnapshot = normalizeIsoDate(input.snapshotHearingNextAt);

  for (const candidate of [fromBundleMeta, fromListing, fromSnapshot]) {
    if (candidate && !isPlaceholderHearingIso(candidate)) return candidate;
  }
  return null;
}

/** Stage cell for solicitor surfaces — collapse “pre ptph pre ptph”. */
export function displaySolicitorStage(raw: string | null | undefined): string {
  const t = collapseHeaderCellDuplicates(raw);
  if (!t || /not recorded|unknown/i.test(t)) return t;
  return t.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}
