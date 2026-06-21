/**
 * Module 5 — multi-incident contradiction tests.
 * Run: npx tsx scripts/bundle-multi-incident-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractMultiIncidentContradictions } from "../lib/criminal/extract-multi-incident-contradictions";
import { isBundleMultiIncidentSurfacingEnabled } from "../lib/criminal/bundle-multi-incident-surfacing";
import { extractAllBundleContradictions } from "../lib/criminal/merge-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const MULTI_DATES = `
=== SECTION: CHARGE ===
Count 1: On 5 January 2026 at 22 Mill Lane the defendant assaulted Ms Hannah Lee.
Count 2: On 18 January 2026 at 22 Mill Lane the defendant assaulted Ms Hannah Lee.

=== SECTION: MG5 ===
MG5 case summary
The incident on 5 January 2026 arose during a domestic assault in the kitchen at 22 Mill Lane.
`.padStart(220, " ");

const MULTI_COMPLAINANTS = `
=== SECTION: CHARGE ===
Count 1: Assault on Ms Hannah Lee. Count 2: Assault on Ms Priya Shah on 20 March 2026.

=== SECTION: MG5 ===
MG5 case summary
This matter relates to complainant Hannah Lee only following a domestic incident on 20 March 2026.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I describe what happened to me on 20 March 2026 at the address.
`.padStart(220, " ");

const NEIL = `
=== SECTION: CHARGE ===
Between 01 March 2026 and 30 April 2026 the defendant fraudulently made refunds.

=== SECTION: MG5 ===
MG5 case summary
On 15 March 2026 at the store the defendant processed refunds.
`;

const dates = extractMultiIncidentContradictions(MULTI_DATES);
assert.ok(dates.some((c) => c.type === "multi_incident_dates"), "Multi dates");

const complainants = extractMultiIncidentContradictions(MULTI_COMPLAINANTS);
assert.ok(
  complainants.some((c) => c.type === "multi_incident_complainants"),
  "Multi complainants",
);

const neil = extractMultiIncidentContradictions(NEIL);
assert.equal(neil.length, 0, "Neil fraud: no multi-incident");

assert.equal(extractMultiIncidentContradictions("Thin.").length, 0, "Thin: empty");

process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING = "false";
assert.equal(isBundleMultiIncidentSurfacingEnabled(), false);
const warOff = buildHearingWarRoomBrief({
  caseId: "multi-off",
  caseTitle: "Test",
  clientLabel: "Client",
  allegation: "ABH",
  stage: "PTPH",
  hearingStatus: "TBC",
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  readiness: "Conditional",
  battleboard: null,
  hasSavedPosition: false,
  chaseItems: [],
  bundleText: MULTI_DATES,
});
assert.equal(warOff.bundleContradictions?.length ?? 0, 0, "Kill switch disables multi-incident");
delete process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING;

const all = extractAllBundleContradictions(MULTI_DATES);
assert.ok(all.some((c) => c.type === "multi_incident_dates"), "Merged: multi_incident_dates");

console.log("bundle-multi-incident-extract.test.ts: ok");
