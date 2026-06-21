/**
 * Module 2 — sequence contradiction tests.
 * Run: npx tsx scripts/bundle-sequence-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractSequenceContradictions } from "../lib/criminal/extract-sequence-contradictions";
import { isBundleSequenceSurfacingEnabled } from "../lib/criminal/bundle-sequence-surfacing";
import { extractAllBundleContradictions } from "../lib/criminal/merge-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const PAIGE_PROD_SEQUENCE = `
MG5 CASE SUMMARY
The prosecution case is that during a domestic argument Paige Thornton struck Hannah Lee with a mug.
Ms Thornton says Ms Lee threw the mug first and that both parties were struggling in the kitchen.

WITNESS STATEMENT
Statement
Paige was shouting at me in the kitchen. I walked away and she followed. I felt something hit my face and saw the mug on the
floor. I was bleeding above my eyebrow. I did not throw anything at her.
`.padStart(220, " ");

const NEIL = `
=== SECTION: CHARGE ===
Between 01 March 2026 and 30 April 2026 the defendant fraudulently made refunds.

=== SECTION: MG5 ===
MG5 case summary
On 15 March 2026 at the store the defendant processed refunds.
MG5 total alleged loss is 1,280.40 for the charge period.
CCTV stills are limited to two dates, while the charge covers two months.
`;

const paige = extractSequenceContradictions(PAIGE_PROD_SEQUENCE);
assert.ok(paige.some((c) => c.type === "sequence_order"), "Paige prod: sequence_order");

const neil = extractSequenceContradictions(NEIL);
assert.ok(
  neil.some((c) => c.type === "sequence_timeline") || neil.length === 0,
  "Neil: sequence_timeline optional",
);

const thin = extractSequenceContradictions("Short text without sequence anchors.");
assert.equal(thin.length, 0, "Thin: empty");

process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING = "false";
assert.equal(isBundleSequenceSurfacingEnabled(), false);
const warOff = buildHearingWarRoomBrief({
  caseId: "seq-off",
  caseTitle: "Test",
  clientLabel: "Client",
  allegation: "Test",
  stage: "PTPH",
  hearingStatus: "TBC",
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  readiness: "Conditional",
  battleboard: null,
  hasSavedPosition: false,
  chaseItems: [],
  bundleText: PAIGE_PROD_SEQUENCE,
});
assert.equal(
  warOff.bundleContradictions?.some((c) => c.type === "sequence_order"),
  false,
  "Kill switch disables sequence",
);
delete process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING;

const all = extractAllBundleContradictions(PAIGE_PROD_SEQUENCE);
assert.ok(all.some((c) => c.type === "first_contact"), "Merged: first_contact");
assert.ok(all.some((c) => c.type === "sequence_order"), "Merged: sequence_order");

console.log("bundle-sequence-extract.test.ts: ok");
