/**
 * Phase 1 — bundle contradiction + matter brief assembly tests.
 * Run: npx tsx scripts/bundle-contradiction-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractBundleContradictions } from "../lib/criminal/extract-bundle-contradictions";
import { isBundleContradictionSurfacingEnabled } from "../lib/criminal/bundle-contradiction-surfacing";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildBundleSourcePayload } from "../lib/bundle/parse-bundle-display";
import { assembleBundleTextForContradictions } from "../lib/criminal/reasoning-v2/assemble-bundle-text";

const PAIGE_BUNDLE = `
=== SECTION: MG5 ===
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first before the injury occurred.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I did not throw anything at her.
I walked away and she followed… I felt something hit my face… I was bleeding… in the hallway.
`;

/** Neighbour MG11 first — prod-shaped bundle (MG5 kitchen must not mask hallway). */
const PAIGE_MULTI_WITNESS = `
=== SECTION: MG5 ===
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first.

=== SECTION: MG11 ===
MG11 – Neighbour
I heard shouting and a smash. I did not see what happened inside.

MG11 – Hannah Lee
I did not throw anything at her.
I felt something hit my face… I was bleeding… in the hallway.
`;

const NEIL_BUNDLE = `
=== SECTION: CHARGE ===
Between 01 March 2026 and 30 April 2026 the defendant fraudulently made refunds.

=== SECTION: MG5 ===
MG5 case summary
MG5 total alleged loss is 1,280.40 for the charge period.
CCTV stills are limited to two dates, while the charge covers two months.

=== SECTION: MG11 ===
MG11 – Owen Clarke (store investigator)
My schedule totals 1,084.90.
`;

const paige = extractBundleContradictions(PAIGE_BUNDLE);
assert.ok(paige.some((c) => c.type === "location"), "Paige: location");
assert.ok(paige.some((c) => c.type === "first_contact"), "Paige: first contact");

const paigeMulti = extractBundleContradictions(PAIGE_MULTI_WITNESS);
assert.ok(paigeMulti.some((c) => c.type === "location"), "Paige multi-witness: location");

/** Neighbour MG11 first — prod-shaped flat bundle without SECTION markers. */
const PAIGE_FLAT_PROD = `
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first before any injury.

Witness statement — Neighbour
I heard shouting and a smash. I did not see what happened inside.

MG11 witness statement — Hannah Lee
I did not throw anything at her.
I felt something hit my face and I was bleeding in the hallway.
`;

const paigeFlat = extractBundleContradictions(PAIGE_FLAT_PROD);
assert.ok(paigeFlat.some((c) => c.type === "location"), "Paige flat prod: location");
assert.ok(paigeFlat.some((c) => c.type === "first_contact"), "Paige flat prod: first contact");

assert.ok(paigeFlat.some((c) => c.type === "first_contact"), "Paige flat prod: first contact");

/** Prod-shaped: MG5/MG11 after frontMatterScan window — bundle-source assemble path. */
const PAIGE_LATE_FLAT = `${"x".repeat(81_000)}
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first.

MG11 witness statement — Hannah Lee
I did not throw anything at her.
I felt something hit my face and I was bleeding in the hallway.
`;
const paigePayload = buildBundleSourcePayload([
  { id: "1", name: "paige.pdf", extracted_text: PAIGE_LATE_FLAT },
]);
const paigeAssembled = assembleBundleTextForContradictions({
  frontMatterScan: paigePayload.frontMatterScan,
  snippets: paigePayload.snippets,
});
assert.equal(extractBundleContradictions(paigePayload.frontMatterScan).length, 0, "Paige late flat: scan alone empty");
const paigeLate = extractBundleContradictions(paigeAssembled);
assert.ok(paigeLate.some((c) => c.type === "location"), "Paige late flat: location via assemble");
assert.ok(paigeLate.some((c) => c.type === "first_contact"), "Paige late flat: first contact via assemble");

const neil = extractBundleContradictions(NEIL_BUNDLE);
assert.ok(neil.some((c) => c.type === "loss_figure"), "Neil: loss figure");
assert.ok(neil.some((c) => c.type === "cctv_window"), "Neil: CCTV window");

const empty = extractBundleContradictions("Short bundle with no structured sections.");
assert.equal(empty.length, 0, "No contradictions on thin text");

process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING = "false";
assert.equal(isBundleContradictionSurfacingEnabled(), false);
const warOff = buildHearingWarRoomBrief({
  caseId: "kill",
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
  bundleText: PAIGE_BUNDLE,
});
assert.equal(warOff.bundleContradictions?.length ?? 0, 0, "Kill switch disables War Room enrichment");
delete process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING;

const neilContradictions = extractBundleContradictions(NEIL_BUNDLE);
const chaseStub: DisclosureChaseBrief = {
  caseId: "neil",
  caseTitle: "R v Neil Mitchell",
  clientLabel: "Neil Mitchell",
  allegation: "Fraud",
  stage: "PTPH",
  hearingStatus: "TBC",
  bundleHealth: "THIN",
  positionStatus: "Provisional",
  disclosureSummary: "Several items outstanding.",
  safeCourtLine: "Provisional pending disclosure.",
  items: [],
  primaryItems: [
    {
      label: "REQ-CCTV-02 Itemised receipts",
      draftChaseWording: "Please provide receipts.",
      whyItMatters: "Loss reconciliation requires itemised figures.",
      status: "Outstanding",
      familyId: "other",
      source: "MG6",
      mergedFrom: [],
    },
  ],
  additionalItems: [],
  linkedRoutes: ["Fraud route"],
  counters: { total: 1, overdue: 0, dueSoon: 0 },
  hearingDeadlineNote: null,
};

const neilBrief = buildMatterBrief({
  warRoom: {
    caseId: "neil",
    caseTitle: "R v Neil Mitchell",
    clientLabel: "Neil",
    allegation: "Fraud",
    stage: "PTPH",
    hearingStatus: "TBC",
    bundleHealth: "THIN",
    positionStatus: "Provisional",
    readiness: "Conditional",
    safePositionToday:
      "Account-control issues remain conditional. Ask the court to record REQ-CCTV-02 remains outstanding.",
    sayThis: [],
    doNotOverstate: ["Do not concede dishonesty on these papers."],
    askCourtToRecord: ["Ask the court to record bank export outstanding."],
    instructionsNeeded: [],
    nextHearingMoves: ["Chase itemised till receipts."],
    evidenceAnchors: [],
    collapseRisks: ["Loss figure inconsistency on file."],
    bundleContradictions: neilContradictions,
    draftWording: {
      disclosureTimetable: "",
      adjournment: "",
      clientExplanation: "We are reviewing the papers.",
    },
  },
  chase: chaseStub,
  primaryRouteTitle: "Fraud / account-control",
});

const theory = neilBrief.sections.find((s) => s.id === "theory")?.paragraph ?? "";
assert.ok(!/REQ-/i.test(theory), "Theory: no REQ codes");
assert.ok(!/appears outstanding/i.test(theory), "Theory: no chase leakage");
assert.ok(/1,280|loss figure/i.test(theory), "Theory: loss contradiction present");

const risks = neilBrief.sections.find((s) => s.id === "risks")?.bullets ?? [];
assert.ok(!risks.some((b) => /^Opportunity to/i.test(b)), "Risks: no opportunity lines");

const opportunities = neilBrief.sections.find((s) => s.id === "opportunities")?.bullets ?? [];
assert.ok(opportunities.some((b) => /^Opportunity to challenge loss/i.test(b)), "Opportunities: contradiction");
assert.ok(!opportunities.some((b) => /^Chase:/i.test(b)), "Opportunities: not chase dump");
assert.ok(!opportunities.some((b) => /REQ-/i.test(b)), "Opportunities: no REQ codes");

console.log("bundle-contradiction-extract.test.ts: ok");
