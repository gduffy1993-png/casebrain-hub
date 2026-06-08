/**
 * Pilot bundle "Next hearing: Monday 1 June 2026 at 11:30 for PTPH" patterns.
 * Run: npx tsx scripts/pilot-hearing-extract.test.ts
 */
import assert from "node:assert/strict";
import {
  extractBundleCaseMetadata,
  parseUkHearingDateTime,
} from "../lib/criminal/extract-bundle-case-metadata";

const PILOT_LINE =
  "Court: Westbridge Crown Court. Next hearing: Monday 1 June 2026 at 11:30 for PTPH. Defendant: Kian Doyle.";

const meta = extractBundleCaseMetadata(PILOT_LINE);
assert.ok(meta.nextHearingRaw, "expected nextHearingRaw");
assert.ok(meta.nextHearingIso, "expected nextHearingIso from weekday-prefixed date");
assert.match(meta.nextHearingIso!, /2026-06-01/);

const parsed = parseUkHearingDateTime("Monday 1 June 2026 at 11:30 for PTPH");
assert.ok(parsed?.iso, "parseUkHearingDateTime should handle weekday prefix");

const times = [
  "Next hearing: Monday 1 June 2026 at 10:00 for PTPH",
  "Next hearing: Monday 1 June 2026 at 11:30 for PTPH",
  "Next hearing: Monday 1 June 2026 at 14:00 for PTPH",
];
for (const line of times) {
  const m = extractBundleCaseMetadata(line);
  assert.ok(m.nextHearingIso, `iso for ${line}`);
  const p = parseUkHearingDateTime(m.nextHearingRaw!);
  assert.equal(p?.iso, m.nextHearingIso);
}

console.log("pilot-hearing-extract.test.ts OK");
