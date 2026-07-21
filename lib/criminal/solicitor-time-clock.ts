/**
 * Phase 8 — deterministic solicitor hearing / time clock helpers.
 * Prefer injectable `asOf` everywhere; never rely on live wall-clock in tests.
 */

/** Parse YYYY-MM-DD (or ISO with time) to UTC noon Date for stable day math. */
export function parseIsoCalendarDateUtc(iso: string): Date | null {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** UTC start-of-day ms. */
export function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Deterministic ISO calendar date (yyyy-mm-dd) from an ISO timestamp or date. */
export function formatIsoDateOnly(isoOrDate: string | Date): string {
  if (isoOrDate instanceof Date) {
    const y = isoOrDate.getUTCFullYear();
    const m = String(isoOrDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(isoOrDate.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const m = String(isoOrDate).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1]!;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return formatIsoDateOnly(d);
}

/** en-GB short date in UTC (deterministic across locales when timeZone is UTC). */
export function formatEnGbUtc(iso: string): string {
  const d = parseIsoCalendarDateUtc(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Whole UTC days from `asOf` to `targetIso` (positive = future). */
export function utcDayDiff(asOf: Date, targetIso: string): number | null {
  const target = parseIsoCalendarDateUtc(targetIso);
  if (!target) return null;
  return Math.round((startOfUtcDay(target) - startOfUtcDay(asOf)) / 86_400_000);
}
