/**
 * Module 6 — triangulation contradiction tests.
 * Run: npx tsx scripts/bundle-triangulation-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractTriangulationContradictions } from "../lib/criminal/extract-triangulation-contradictions";
import { isBundleTriangulationSurfacingEnabled } from "../lib/criminal/bundle-triangulation-surfacing";
import { extractAllBundleContradictions } from "../lib/criminal/merge-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const MG11_CCTV = `
=== SECTION: MG5 ===
MG5 case summary — domestic ABH. Relies on MG11 and partial CCTV.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I felt something hit my face. I was bleeding above my eyebrow. I saw the mug on the floor.

=== SECTION: CCTV ===
CCTV note: partial clip from hallway camera; does not show strike or object contact; no visible injury on footage served.
`.padStart(220, " ");

const DISPATCH_SCENE = `
=== SECTION: MG5 ===
MG5 case summary — domestic incident at the address.

=== SECTION: MG11 ===
MG11 – Hannah Lee
We were arguing in the kitchen. I felt something hit my face and I was bleeding.

=== SECTION: CAD ===
CAD dispatch note: domestic disturbance reported; verbal argument only; no weapons seen; no ambulance required.
`.padStart(220, " ");

const BWV_ACCOUNT = `
=== SECTION: MG5 ===
MG5 — domestic ABH.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I was struck and bleeding from a cut above my eyebrow.

=== SECTION: BWV ===
BWV summary: officer notes no injuries observed at scene and defendant behaviour calm.
`.padStart(220, " ");

const mg11Cctv = extractTriangulationContradictions(MG11_CCTV);
assert.ok(mg11Cctv.some((c) => c.type === "triangulation_mg11_cctv"), "MG11 vs CCTV");

const dispatch = extractTriangulationContradictions(DISPATCH_SCENE);
assert.ok(dispatch.some((c) => c.type === "triangulation_dispatch_scene"), "CAD vs scene");

const bwv = extractTriangulationContradictions(BWV_ACCOUNT);
assert.ok(bwv.some((c) => c.type === "triangulation_bwv_account"), "BWV vs MG11");

assert.equal(extractTriangulationContradictions("Thin.").length, 0, "Thin: empty");

process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_TRIANGULATION_SURFACING = "false";
assert.equal(isBundleTriangulationSurfacingEnabled(), false);
const warOff = buildHearingWarRoomBrief({
  caseId: "tri-off",
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
  bundleText: MG11_CCTV,
});
assert.equal(warOff.bundleContradictions?.length ?? 0, 0, "Kill switch disables triangulation");
delete process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_TRIANGULATION_SURFACING;

const all = extractAllBundleContradictions(MG11_CCTV);
assert.ok(all.some((c) => c.type === "triangulation_mg11_cctv"), "Merged: triangulation");

console.log("bundle-triangulation-extract.test.ts: ok");
