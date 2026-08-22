/**
 * Central hearing-status logic for solicitor UI + exports (Phase 8).
 * One deterministic formatter: unknown | listed | same_day | upcoming | passed | snapshot.
 * Pass fixed `asOf` in tests; snapshot surfaces carry an explicit "as at" marker.
 */

import {
  isPlaceholderHearingIso,
  resolveSolicitorHearingDateIso,
} from "@/lib/criminal/solicitor-hearing-display";
import {
  formatEnGbUtc,
  formatIsoDateOnly,
  startOfUtcDay,
} from "@/lib/criminal/solicitor-time-clock";

export type HearingStatusKind =
  | "unknown"
  | "listed"
  | "same_day"
  | "upcoming"
  | "passed"
  | "snapshot";

export type SolicitorHearingStatus = {
  kind: HearingStatusKind;
  dateIso: string | null;
  /** en-GB short date for display, or null when unknown. */
  dateLabel: string | null;
  /** HH:MM from listing raw when safely present (not scanned from full bundle). */
  timeLiteral: string | null;
  /** Date + optional time for strips (e.g. 7 Jul 2026 at 14:15). */
  dateTimeLabel: string | null;
  /** One-line status for strips / exports. */
  statusLabel: string;
  isSnapshot: boolean;
  /** ISO calendar date of the as-of / as-at clock used for classification. */
  asAtIso: string | null;
};

/** Prefer explicit time, else HH:MM on the listing raw only (avoid CDR/interview times). */
function resolveHearingTimeLiteral(input: {
  hearingTimeLiteral?: string | null;
  nextHearingRaw?: string | null;
}): string | null {
  const explicit = input.hearingTimeLiteral?.trim();
  if (explicit && /^\d{1,2}:\d{2}$/.test(explicit)) {
    const [h, m] = explicit.split(":");
    return `${h!.padStart(2, "0")}:${m}`;
  }
  const raw = input.nextHearingRaw?.trim() || "";
  if (!raw) return null;
  const at = raw.match(/\bat\s+(\d{1,2}:\d{2})\b/i);
  const bare = at?.[1] || raw.match(/\b(\d{1,2}:\d{2})\b/)?.[1];
  if (!bare) return null;
  const [h, m] = bare.split(":");
  return `${h!.padStart(2, "0")}:${m}`;
}

function buildDateTimeLabel(dateLabel: string, timeLiteral: string | null): string {
  return timeLiteral ? `${dateLabel} at ${timeLiteral}` : dateLabel;
}

/**
 * Resolve hearing status from shared ISO inputs.
 * `asOf` defaults to now (UTC day). Pass a fixed date in tests.
 *
 * Elapsed listings use papers-safe wording: "Listing on papers · … (elapsed)"
 * — not "Hearing date passed" (that reads like a court outcome invent).
 */
export function resolveSolicitorHearingStatus(input: {
  bundleNextHearingIso?: string | null;
  snapshotHearingNextAt?: string | null;
  nextHearingRaw?: string | null;
  hearingTimeLiteral?: string | null;
  bundleHay?: string | null;
  /** When true, treat resolved date as a frozen historical / demo snapshot. */
  treatAsSnapshot?: boolean;
  asOf?: Date;
}): SolicitorHearingStatus {
  const asOf = input.asOf ?? new Date();
  const asAtIso = formatIsoDateOnly(asOf);
  const dateIso = resolveSolicitorHearingDateIso(input);
  const timeLiteral = resolveHearingTimeLiteral(input);
  if (!dateIso) {
    return {
      kind: "unknown",
      dateIso: null,
      dateLabel: null,
      timeLiteral: null,
      dateTimeLabel: null,
      statusLabel: "Hearing date not safely extracted",
      isSnapshot: false,
      asAtIso,
    };
  }

  const dateLabel = formatEnGbUtc(dateIso);
  const dateTimeLabel = buildDateTimeLabel(dateLabel, timeLiteral);

  if (input.treatAsSnapshot || isPlaceholderHearingIso(input.snapshotHearingNextAt)) {
    if (input.treatAsSnapshot) {
      return {
        kind: "snapshot",
        dateIso,
        dateLabel,
        timeLiteral,
        dateTimeLabel,
        statusLabel: `Frozen historical snapshot · hearing ${dateTimeLabel} (as at ${asAtIso})`,
        isSnapshot: true,
        asAtIso,
      };
    }
  }

  const hearingDay = startOfUtcDay(new Date(`${dateIso}T12:00:00Z`));
  const today = startOfUtcDay(asOf);
  const dayDiff = Math.round((hearingDay - today) / 86_400_000);

  if (dayDiff === 0) {
    return {
      kind: "same_day",
      dateIso,
      dateLabel,
      timeLiteral,
      dateTimeLabel,
      statusLabel: `Same-day listing · ${dateTimeLabel}`,
      isSnapshot: false,
      asAtIso,
    };
  }
  if (dayDiff > 0 && dayDiff <= 14) {
    return {
      kind: "upcoming",
      dateIso,
      dateLabel,
      timeLiteral,
      dateTimeLabel,
      statusLabel: `Upcoming listing · ${dateTimeLabel}`,
      isSnapshot: false,
      asAtIso,
    };
  }
  if (dayDiff > 14) {
    return {
      kind: "listed",
      dateIso,
      dateLabel,
      timeLiteral,
      dateTimeLabel,
      statusLabel: `Listed on papers · ${dateTimeLabel}`,
      isSnapshot: false,
      asAtIso,
    };
  }
  return {
    kind: "passed",
    dateIso,
    dateLabel,
    timeLiteral,
    dateTimeLabel,
    statusLabel: `Listing on papers · ${dateTimeLabel} (elapsed)`,
    isSnapshot: false,
    asAtIso,
  };
}

/** Listed (future or undated diary entry that is not same-day/passed/snapshot) — alias for upcoming. */
export function isListedHearingKind(kind: HearingStatusKind): boolean {
  return kind === "listed" || kind === "upcoming" || kind === "same_day";
}

export function formatHearingStatusForDisplay(status: SolicitorHearingStatus): string {
  return status.statusLabel;
}
