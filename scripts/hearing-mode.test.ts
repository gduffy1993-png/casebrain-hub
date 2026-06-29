#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildHearingMode } from "../lib/criminal/hearing-mode/build-hearing-mode";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const bundleText = `
R v Test Client
Charge: Assault
MG6 lists BWV as referred only.
`;

const ledger = buildBundleTruthLedger({ bundleText });
const briefPlan = buildCriminalBriefPlan({
  bundleText,
  ledger,
  missingMaterial: ["BWV full export"],
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

const mode = buildHearingMode({
  allegation: "Assault",
  briefPlan,
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
  primaryRouteTitle: "Attribution review",
  documentCount: 1,
});

assert.ok(mode.caseInOneMinute.chargeLabel.includes("Assault"));
assert.ok(mode.caseInOneMinute.offenceFamily.length > 0);
assert.ok(mode.safeCourtLine.text.length > 0);
assert.ok(mode.safeCourtLine.sendabilityLabel.toLowerCase().includes("review"));
assert.ok(mode.topChaseItems.length >= 1);
assert.ok(mode.topChaseItems[0]!.cpsChaseWording.length > 0);
assert.ok(mode.evidenceSnapshot.length >= 1);
assert.ok(mode.reviewNotice.includes("not legal advice"));

for (const line of [
  mode.safeCourtLine.text,
  mode.caseInOneMinute.mainIssue,
  mode.nextAction.detail,
  ...mode.reviewPrompts.map((p) => p.reviewNeeded),
]) {
  assert.ok(!/\b(you will win|case collapses|change your advice)\b/i.test(line));
  assert.ok(!/\bchange your advice\b/i.test(line));
}

assert.ok(
  mode.topChaseItems.every(
    (item) =>
      !/\b(you will win|in court today I submit)\b/i.test(item.cpsChaseWording) ||
      item.sendabilityLabel.includes("review"),
  ),
);

assert.equal(mode.nextAction.kind, "chase_cps");

console.log("hearing-mode.test.ts: PASS");
