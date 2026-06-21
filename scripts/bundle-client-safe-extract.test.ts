/**
 * Module 7 — client-safe explanation tests.
 * Run: npx tsx scripts/bundle-client-safe-extract.test.ts
 */
import assert from "node:assert/strict";
import { buildClientSafeExplanation } from "../lib/criminal/build-client-safe-explanation";
import { isBundleClientSafeSurfacingEnabled } from "../lib/criminal/bundle-client-safe-surfacing";
import { extractAllBundleContradictions } from "../lib/criminal/merge-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";

const PAIGE = `
=== SECTION: MG5 ===
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first before the injury occurred.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I did not throw anything at her.
I walked away and she followed… I felt something hit my face… I was bleeding… in the hallway.
`.padStart(220, " ");

const contra = extractAllBundleContradictions(PAIGE);
const expl = buildClientSafeExplanation({
  clientLabel: "Paige Thornton",
  allegation: "ABH",
  contradictions: contra,
  hasOutstandingDisclosure: true,
});
assert.ok(/reviewing the papers/i.test(expl), "Provisional opener");
assert.ok(/who approached|different places|order of events/i.test(expl), "Plain English tension");
assert.ok(!/REQ-/i.test(expl), "No REQ");
assert.ok(!/plead guilty/i.test(expl), "No plea advice");

process.env.NEXT_PUBLIC_BUNDLE_CLIENT_SAFE_SURFACING = "false";
assert.equal(isBundleClientSafeSurfacingEnabled(), false);
const war = buildHearingWarRoomBrief({
  caseId: "cs-off",
  caseTitle: "Test",
  clientLabel: "Paige Thornton",
  allegation: "ABH",
  stage: "PTPH",
  hearingStatus: "TBC",
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  readiness: "Conditional",
  battleboard: null,
  hasSavedPosition: false,
  chaseItems: ["CCTV outstanding"],
  bundleText: PAIGE,
});
assert.ok(
  /conditional.*outstanding/i.test(war.draftWording.clientExplanation),
  "Kill switch keeps generic war room client text",
);
delete process.env.NEXT_PUBLIC_BUNDLE_CLIENT_SAFE_SURFACING;

const warOn = buildHearingWarRoomBrief({
  caseId: "cs-on",
  caseTitle: "Test",
  clientLabel: "Paige Thornton",
  allegation: "ABH",
  stage: "PTPH",
  hearingStatus: "TBC",
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  readiness: "Conditional",
  battleboard: null,
  hasSavedPosition: false,
  chaseItems: ["CCTV outstanding"],
  bundleText: PAIGE,
});
const chase = buildDisclosureChaseBrief({
  caseId: "cs-on",
  caseTitle: "Test",
  clientLabel: "Paige Thornton",
  allegation: "ABH",
  stage: "PTPH",
  hearingStatus: "TBC",
  hearingDateIso: null,
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  battleboard: null,
  bundleText: PAIGE,
});
const brief = buildMatterBrief({ warRoom: warOn, chase });
const client = brief.sections.find((s) => s.id === "client")?.paragraph ?? "";
assert.ok(/reviewing the papers/i.test(client), "Matter Brief client section");
assert.ok(!/REQ-/i.test(client), "Client section no REQ");

console.log("bundle-client-safe-extract.test.ts: ok");
