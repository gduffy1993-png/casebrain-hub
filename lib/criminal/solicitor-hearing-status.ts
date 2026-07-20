/**
 * Central hearing-status logic for solicitor UI + exports.
 * Date may stay fixed; status (listed / upcoming / passed / snapshot) must agree everywhere.
 */

import {
  isPlaceholderHearingIso,
  resolveSolicitorHearingDateIso,
} from "@/lib/criminal/solicitor-hearing-display";

export type HearingStatusKind = "listed" | "upcoming" | "passed" | "snapshot" | "unknown";

export type SolicitorHearingStatus = {
  kind: HearingStatusKind;
  dateIso: string | null;
  /** en-GB short date for display, or null when unknown. */
  dateLabel: string | null;
  /** One-line status for strips / exports. */
  statusLabel: string;
  isSnapshot: boolean;
};

function formatEnGb(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Resolve hearing status from shared ISO inputs.
 * `asOf` defaults to now (UTC day). Pass a fixed date in tests.
 */
export function resolveSolicitorHearingStatus(input: {
  bundleNextHearingIso?: string | null;
  snapshotHearingNextAt?: string | null;
  nextHearingRaw?: string | null;
  bundleHay?: string | null;
  /** When true, treat resolved date as a frozen demo/snapshot listing. */
  treatAsSnapshot?: boolean;
  asOf?: Date;
}): SolicitorHearingStatus {
  const dateIso = resolveSolicitorHearingDateIso(input);
  if (!dateIso) {
    return {
      kind: "unknown",
      dateIso: null,
      dateLabel: null,
      statusLabel: "Hearing date not safely extracted",
      isSnapshot: false,
    };
  }

  if (input.treatAsSnapshot || isPlaceholderHearingIso(input.snapshotHearingNextAt)) {
    // Placeholder snapshot alone is already rejected by resolveSolicitorHearingDateIso;
    // treatAsSnapshot marks controlled demo freeze.
    if (input.treatAsSnapshot) {
      const dateLabel = formatEnGb(dateIso);
      return {
        kind: "snapshot",
        dateIso,
        dateLabel,
        statusLabel: `Listed (snapshot) · ${dateLabel}`,
        isSnapshot: true,
      };
    }
  }

  const asOf = input.asOf ?? new Date();
  const hearingDay = startOfUtcDay(new Date(`${dateIso}T12:00:00Z`));
  const today = startOfUtcDay(asOf);
  const dateLabel = formatEnGb(dateIso);

  if (hearingDay === today) {
    return {
      kind: "listed",
      dateIso,
      dateLabel,
      statusLabel: `Listed today · ${dateLabel}`,
      isSnapshot: false,
    };
  }
  if (hearingDay > today) {
    return {
      kind: "upcoming",
      dateIso,
      dateLabel,
      statusLabel: `Upcoming · ${dateLabel}`,
      isSnapshot: false,
    };
  }
  return {
    kind: "passed",
    dateIso,
    dateLabel,
    statusLabel: `Hearing date passed · ${dateLabel}`,
    isSnapshot: false,
  };
}

export function formatHearingStatusForDisplay(status: SolicitorHearingStatus): string {
  return status.statusLabel;
}
