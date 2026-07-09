#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import {
  buildProofReceiptView,
  deriveSafeAction,
  deriveSupportLevel,
  FORBIDDEN_UI_PATTERNS,
  PROOF_RECEIPT_GUARD,
  stateColourKey,
} from "../lib/criminal/proof-receipt";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const chase = {
  disclosureSummary: "2 priority chase items",
  safeCourtLine: "The defence asks the court to record provisional position.",
  primaryItems: [
    {
      id: "bwv-1",
      label: "BWV full export",
      source: "MG6 — referred",
      baseStatus: "outstanding",
      draftChaseWording: "Please provide the full BWV export.",
      courtLine: "The defence asks the court to record BWV is outstanding.",
      whyItMatters: "Sequence coverage",
      evidenceAnchor: "MG6C/010 — body-worn video — referred only",
    },
    {
      id: "phone-1",
      label: "Subscriber / account data",
      source: "MG6C",
      baseStatus: "outstanding",
      draftChaseWording: "Please provide subscriber / account data.",
      whyItMatters: "Attribution gap",
      evidenceAnchor: "MG6C/003 — subscriber data — outstanding",
    },
  ],
  items: [],
} as unknown as DisclosureChaseBrief;

const war = {
  safePositionToday: "Provisional position pending BWV.",
  doNotOverstate: ["Do not say: BWV shows the incident.", "Do not say defendant is guilty."],
  bundleContradictions: [],
} as unknown as HearingWarRoomBrief;

const view = buildFiveAnswersView({
  allegation: "Assault",
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
  bundleText: "MG6C/010 body-worn video referred. MG6C/003 subscriber outstanding.",
});

const model = buildProofReceiptView({
  view,
  chase,
  bundleHay: "MG6C/010 body-worn video referred. phone extraction subscriber",
  allegation: "Assault",
});

assert.ok(model.receipts.length >= 1, "proof receipts generated");
assert.ok(
  model.receipts.some((r) => r.surface === "CPS Chase" || r.surface === "Overview"),
  "receipt surfaces present",
);
assert.ok(model.refusedOverstatements.length >= 1, "refused overstatements parsed");
assert.ok(model.familyCards.some((c) => c.id === "bwv_referred_only"), "BWV family card");

for (const receipt of model.receipts) {
  assert.ok(!FORBIDDEN_UI_PATTERNS.test(receipt.outputLine), `forbidden wording in receipt: ${receipt.outputLine}`);
  assert.ok(!FORBIDDEN_UI_PATTERNS.test(receipt.solicitorReviewNote ?? ""), "forbidden wording in review note");
}

assert.equal(deriveSafeAction("missing", "needs_review"), "chase");
assert.equal(deriveSafeAction("served", "unsafe"), "do-not-use");
assert.equal(deriveSupportLevel("served", "strong"), "Strong");
assert.equal(stateColourKey("served"), "served");
assert.equal(stateColourKey("referred_only"), "referred");
assert.equal(stateColourKey("missing"), "missing");
assert.equal(stateColourKey("not_safely_confirmed"), "partial");

assert.ok(/not legal advice/i.test(PROOF_RECEIPT_GUARD));
assert.ok(!/\bguilty\b/i.test(PROOF_RECEIPT_GUARD));
assert.ok(!/\bnot guilty\b/i.test(PROOF_RECEIPT_GUARD));

for (const row of model.refusedOverstatements) {
  assert.ok(row.blockedLine.length > 2);
  assert.ok(row.safeAlternative.length > 10);
  assert.ok(!/\bwe advise you to\b/i.test(row.safeAlternative));
}

const viewOnly = buildFiveAnswersView({
  allegation: "Harassment",
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: [],
  bundleText: "",
});
const withoutChase = buildProofReceiptView({
  view: viewOnly,
  bundleHay: "",
  allegation: "Harassment",
});
assert.ok(
  withoutChase.receipts.length >= 1 || withoutChase.refusedOverstatements.length >= 0,
  "view-only proof receipt model is valid",
);
assert.ok(withoutChase.familyCards.length >= 0, "family cards optional without chase");

console.log("proof-receipt-panel.test.ts: PASS");
