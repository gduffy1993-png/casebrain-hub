/**
 * Phase 8 — hearing and time logic focused contracts.
 * Run: npx tsx scripts/phase8-hearing-time.test.ts
 */
import assert from "node:assert/strict";
import {
  CANONICAL_MATTER_STATE_VERSION,
  buildCanonicalMatterStateV1,
} from "@/lib/criminal/canonical-matter-state";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import {
  formatHearingStatusForDisplay,
  resolveSolicitorHearingStatus,
} from "@/lib/criminal/solicitor-hearing-status";
import {
  formatIsoDateOnly,
  utcDayDiff,
} from "@/lib/criminal/solicitor-time-clock";

assert.equal(CANONICAL_MATTER_STATE_VERSION, "1.2.0");
assert.equal(phase2CentralSurfaceIds().length, 31);

const AS_OF = new Date("2026-07-15T12:00:00Z");

const kinds = {
  unknown: resolveSolicitorHearingStatus({ asOf: AS_OF }),
  same_day: resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-15",
    asOf: AS_OF,
  }),
  upcoming: resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-29",
    asOf: AS_OF,
  }),
  listed: resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-08-15",
    asOf: AS_OF,
  }),
  passed: resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-14",
    asOf: AS_OF,
  }),
  snapshot: resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-20",
    treatAsSnapshot: true,
    asOf: AS_OF,
  }),
};

assert.equal(kinds.unknown.kind, "unknown");
assert.equal(kinds.same_day.kind, "same_day");
assert.equal(kinds.upcoming.kind, "upcoming");
assert.equal(kinds.listed.kind, "listed");
assert.equal(kinds.passed.kind, "passed");
assert.equal(kinds.snapshot.kind, "snapshot");
assert.match(kinds.passed.statusLabel, /Listing on papers · .* \(elapsed\)/i);
assert.match(kinds.same_day.statusLabel, /Same-day listing/i);
assert.match(kinds.upcoming.statusLabel, /Upcoming listing/i);
assert.match(kinds.listed.statusLabel, /Listed on papers/i);

// Time from listing raw only (Dunn-style) — not invent outcome language
{
  const withTime = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-07",
    nextHearingRaw: "07 July 2026 at 14:15",
    asOf: new Date("2026-08-22T12:00:00Z"),
  });
  assert.equal(withTime.kind, "passed");
  assert.equal(withTime.timeLiteral, "14:15");
  assert.match(withTime.statusLabel, /14:15/);
  assert.match(withTime.statusLabel, /elapsed/i);
  assert.doesNotMatch(withTime.statusLabel, /Hearing date passed/i);
}

// Date boundaries (UTC day math)
assert.equal(utcDayDiff(AS_OF, "2026-07-15"), 0);
assert.equal(utcDayDiff(AS_OF, "2026-07-29"), 14);
assert.equal(utcDayDiff(AS_OF, "2026-07-30"), 15);
assert.equal(
  resolveSolicitorHearingStatus({ bundleNextHearingIso: "2026-07-29", asOf: AS_OF }).kind,
  "upcoming",
);
assert.equal(
  resolveSolicitorHearingStatus({ bundleNextHearingIso: "2026-07-30", asOf: AS_OF }).kind,
  "listed",
);

assert.match(kinds.snapshot.statusLabel, /as at/i);
assert.equal(kinds.snapshot.asAtIso, "2026-07-15");
assert.equal(kinds.same_day.asAtIso, "2026-07-15");
assert.equal(formatHearingStatusForDisplay(kinds.same_day), kinds.same_day.statusLabel);

assert.equal(formatIsoDateOnly("2025-12-31T00:00:00.000Z"), "2025-12-31");
assert.equal(formatIsoDateOnly(new Date("2025-12-31T00:00:00.000Z")), "2025-12-31");

{
  const canonical = buildCanonicalMatterStateV1({
    caseId: "p8-hearing",
    allegation: "Harassment contrary to Protection from Harassment Act",
    evidenceRows: [{ label: "MG11", existence: "served", reliability: "needs_review" }],
    chaseItems: [],
    hearing: {
      bundleNextHearingIso: "2026-07-15",
      asOf: AS_OF,
    },
  });
  assert.equal(canonical.schemaVersion, "1.2.0");
  assert.equal(canonical.hearing.kind, "same_day");
  assert.match(canonical.hearing.statusLabel, /Same-day/);
  assert.ok(canonical.fingerprint.startsWith("v1.2.0:"));
}

{
  const snap = buildCanonicalMatterStateV1({
    caseId: "p8-snap",
    allegation: "Harassment contrary to Protection from Harassment Act",
    evidenceRows: [],
    chaseItems: [],
    hearing: {
      bundleNextHearingIso: "2026-07-20",
      treatAsSnapshot: true,
      asOf: AS_OF,
    },
  });
  assert.equal(snap.hearing.kind, "snapshot");
  assert.equal(snap.hearing.isSnapshot, true);
  assert.match(snap.hearing.statusLabel, /as at/i);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaVersion: CANONICAL_MATTER_STATE_VERSION,
      centralSurfaces: phase2CentralSurfaceIds().length,
      kindsCovered: Object.keys(kinds).sort(),
    },
    null,
    2,
  ),
);
