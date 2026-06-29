#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildDecisionBoard } from "../lib/criminal/decision-board/build-decision-board";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const bundleText = `
R v Test Client
Charge: Assault
MG6 lists BWV as referred only.
Do not import co-defendant material.
`;

const ledger = buildBundleTruthLedger({ bundleText });
const briefPlan = buildCriminalBriefPlan({
  bundleText,
  ledger,
  missingMaterial: ["full BWV export"],
  allegation: "Assault",
});

const battleboard = buildStrategyBattleboard({
  case_id: "test",
  bundle_text: bundleText,
  offence_label: "Assault",
});

const chase = buildDisclosureChaseBrief({
  caseId: "test",
  caseTitle: "R v Test",
  clientLabel: "Test Client",
  allegation: "Assault",
  stage: "PTPH",
  hearingStatus: "Listed",
  bundleHealth: "thin",
  positionStatus: "Provisional",
  battleboard,
  bundleText,
  snapshotMissing: [{ label: "BWV full export", status: "outstanding" }],
});

const war = buildHearingWarRoomBrief({
  caseId: "test",
  caseTitle: "R v Test",
  clientLabel: "Test Client",
  allegation: "Assault",
  stage: "PTPH",
  hearingStatus: "Listed",
  bundleHealth: "thin",
  positionStatus: "Provisional",
  readiness: "Conditional",
  battleboard,
  hasSavedPosition: false,
  chaseItems: ["BWV full export"],
  bundleText,
  briefPlan,
});

const board = buildDecisionBoard({
  briefPlan,
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
});

assert.ok(board.options.length >= 1);
assert.ok(board.reviewNotice.includes("not legal advice"));
for (const opt of board.options) {
  assert.ok(!/\b(you will win|case collapses|defence succeeds)\b/i.test(opt.whyItMatters));
  assert.ok(!/\b(you will win|case collapses|defence succeeds)\b/i.test(opt.riskCaution));
  assert.equal(opt.sendabilityLabel, "Solicitor review required");
}

const hasBwvOrChase = board.options.some(
  (o) => o.issueKind === "missing_bwv_cctv" || o.issueKind === "disclosure_pressure",
);
assert.ok(hasBwvOrChase);

console.log("decision-board.test.ts: PASS");
