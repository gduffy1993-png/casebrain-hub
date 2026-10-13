import type { HearingLifecycle } from "@/lib/criminal/hearing-notice-lifecycle";
import {
  resolveSolicitorHearingStatus,
  type SolicitorHearingStatus,
} from "@/lib/criminal/solicitor-hearing-status";

/**
 * A present canonical packet is authoritative even when its current hearing is
 * null. Legacy metadata is only a compatibility fallback when no canonical
 * hearing packet was supplied at all.
 */
export function resolveCanonicalFirstHearingStatus(input: {
  canonicalLifecycle?: HearingLifecycle | null;
  legacyBundleNextHearingIso?: string | null;
  legacySnapshotHearingNextAt?: string | null;
  legacyNextHearingRaw?: string | null;
  legacyBundleHay?: string | null;
  asOf?: Date;
}): SolicitorHearingStatus {
  if (input.canonicalLifecycle != null) {
    const current = input.canonicalLifecycle.latest;
    return resolveSolicitorHearingStatus({
      bundleNextHearingIso: current?.hearingDateIso ?? null,
      snapshotHearingNextAt: null,
      nextHearingRaw: current?.hearingDateRaw ?? null,
      hearingTimeLiteral: current?.hearingTimeLiteral ?? null,
      bundleHay: current?.sourceExcerpt ?? null,
      asOf: input.asOf,
    });
  }

  return resolveSolicitorHearingStatus({
    bundleNextHearingIso: input.legacyBundleNextHearingIso,
    snapshotHearingNextAt: input.legacySnapshotHearingNextAt,
    nextHearingRaw: input.legacyNextHearingRaw,
    bundleHay: input.legacyBundleHay,
    asOf: input.asOf,
  });
}
