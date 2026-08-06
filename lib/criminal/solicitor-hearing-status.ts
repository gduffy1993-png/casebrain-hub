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
  /** One-line status for strips / exports. */
  statusLabel: string;
  isSnapshot: boolean;
  /** ISO calendar date of the as-of / as-at clock used for classification. */
  asAtIso: string | null;
};

/**
 * Resolve hearing status from shared ISO inputs.
 * `asOf` defaults to now (UTC day). Pass a fixed date in tests.
 */
export function resolveSolicitorHearingStatus(input: {
  bundleNextHearingIso?: string | null;
  snapshotHearingNextAt?: string | null;
  nextHearingRaw?: string | null;
  bundleHay?: string | null;
  /** When true, treat resolved date as a frozen historical / demo snapshot. */
  treatAsSnapshot?: boolean;
  asOf?: Date;
}): SolicitorHearingStatus {
  const asOf = input.asOf ?? new Date();
  const asAtIso = formatIsoDateOnly(asOf);
  const dateIso = resolveSolicitorHearingDateIso(input);
  if (!dateIso) {
    return {
      kind: "unknown",
      dateIso: null,
      dateLabel: null,
      statusLabel: "Hearing date not safely extracted",
      isSnapshot: false,
      asAtIso,
    };
  }

  const dateLabel = formatEnGbUtc(dateIso);

  if (input.treatAsSnapshot || isPlaceholderHearingIso(input.snapshotHearingNextAt)) {
    if (input.treatAsSnapshot) {
      return {
        kind: "snapshot",
        dateIso,
        dateLabel,
        statusLabel: `Frozen historical snapshot · hearing ${dateLabel} (as at ${asAtIso})`,
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
      statusLabel: `Same-day hearing · ${dateLabel}`,
      isSnapshot: false,
      asAtIso,
    };
  }
  if (dayDiff > 0 && dayDiff <= 14) {
    return {
      kind: "upcoming",
      dateIso,
      dateLabel,
      statusLabel: `Upcoming · ${dateLabel}`,
      isSnapshot: false,
      asAtIso,
    };
  }
  if (dayDiff > 14) {
    return {
      kind: "listed",
      dateIso,
      dateLabel,
      statusLabel: `Listed · ${dateLabel}`,
      isSnapshot: false,
      asAtIso,
    };
  }
  return {
    kind: "passed",
    dateIso,
    dateLabel,
    statusLabel: `Hearing date passed · ${dateLabel}`,
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
