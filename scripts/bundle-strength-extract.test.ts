/**
 * Module 4 — strength contradiction tests.
 * Run: npx tsx scripts/bundle-strength-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractStrengthContradictions } from "../lib/criminal/extract-strength-contradictions";
import { isBundleStrengthSurfacingEnabled } from "../lib/criminal/bundle-strength-surfacing";
import { extractAllBundleContradictions } from "../lib/criminal/merge-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const ABH_SERIOUS_VS_MINOR = `
=== SECTION: CHARGE ===
Count 1: Assault occasioning actual bodily harm contrary to section 47 OAPA 1967.

=== SECTION: MG5 ===
MG5 case summary
The defendant struck the complainant with a mug causing significant injury requiring hospital treatment and stitches.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I had a small cut above my eyebrow. Bleeding was controlled at scene. No stitches were required and I did not attend hospital.
`.padStart(220, " ");

const ABH_FORCE_VS_CCTV = `
=== SECTION: CHARGE ===
Assault occasioning actual bodily harm — s.47 OAPA 1967.

=== SECTION: MG5 ===
MG5 case summary
During the argument the defendant struck the complainant with a mug in the kitchen.

=== SECTION: CCTV ===
CCTV note: served clip shows a brief push and raised arm; no clear contact with an object and no visible injury on the footage.
`.padStart(220, " ");

const seriousMinor = extractStrengthContradictions(ABH_SERIOUS_VS_MINOR);
assert.ok(seriousMinor.some((c) => c.type === "strength_serious_vs_minor"), "ABH: serious vs minor");

const forceCctv = extractStrengthContradictions(ABH_FORCE_VS_CCTV);
assert.ok(forceCctv.some((c) => c.type === "strength_force_vs_cctv"), "ABH: force vs CCTV");

assert.equal(extractStrengthContradictions("Thin bundle.").length, 0, "Thin: empty");

process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING = "false";
assert.equal(isBundleStrengthSurfacingEnabled(), false);
const warOff = buildHearingWarRoomBrief({
  caseId: "strength-off",
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
  bundleText: ABH_SERIOUS_VS_MINOR,
});
assert.equal(warOff.bundleContradictions?.length ?? 0, 0, "Kill switch disables strength");
delete process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING;

const all = extractAllBundleContradictions(ABH_SERIOUS_VS_MINOR);
assert.ok(all.some((c) => c.type === "strength_serious_vs_minor"), "Merged: strength");

console.log("bundle-strength-extract.test.ts: ok");
