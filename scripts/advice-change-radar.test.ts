#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildAdviceChangeRadar } from "../lib/criminal/advice-change-radar/build-advice-change-radar";
import { buildMatterEvidenceSnapshot } from "../lib/criminal/advice-change-radar/build-matter-evidence-snapshot";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const bundleText = `
R v Test Client
Charge: Assault
MG6 lists BWV as referred only.
Complainant MG11 timeline differs from officer account.
`;

const ledger = buildBundleTruthLedger({ bundleText });
const briefPlan = buildCriminalBriefPlan({
  bundleText,
  ledger,
  missingMaterial: ["BWV full export", "custody record"],
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

const current = buildMatterEvidenceSnapshot({
  warRoom: war,
  chase,
  briefPlan,
  primaryRouteTitle: "Attribution review",
  documentCount: 2,
});

const previous = buildMatterEvidenceSnapshot({
  warRoom: {
    ...war,
    safePositionToday: "Provisional — BWV referred only; chase outstanding.",
  },
  chase,
  briefPlan: {
    ...briefPlan,
    missingEvidence: [
      ...briefPlan.missingEvidence,
      { label: "MG11 full statement", sourceRef: "MG6" },
    ],
  },
  primaryRouteTitle: "Disclosure chase first",
  documentCount: 1,
  timestamp: "2026-01-01T00:00:00.000Z",
});

const noBaseline = buildAdviceChangeRadar({
  warRoom: war,
  chase,
  briefPlan,
  matterConfidence: null,
  previousSnapshot: null,
  currentSnapshot: current,
});

assert.ok(noBaseline.items.length >= 1);
assert.equal(noBaseline.hasBaseline, false);
assert.ok(noBaseline.changeSummary.includes("baseline"));

const withBaseline = buildAdviceChangeRadar({
  warRoom: war,
  chase,
  briefPlan,
  matterConfidence: null,
  previousSnapshot: previous,
  currentSnapshot: current,
});

assert.equal(withBaseline.hasBaseline, true);
assert.ok(withBaseline.items.some((i) => i.kind === "material_change" || i.kind === "watch_point"));

for (const item of [...noBaseline.items, ...withBaseline.items]) {
  assert.ok(item.reviewNeeded.toLowerCase().includes("review needed"));
  assert.ok(!/\bchange your advice\b/i.test(item.reviewNeeded));
  assert.ok(!/\b(you will win|case collapses|charge will be dropped)\b/i.test(item.whyItMatters));
  assert.ok(!/\bchange your advice\b/i.test(item.safeNextAction));
}

const hasBwvWatch = withBaseline.items.some((i) => /bwv/i.test(i.whatChanged));
assert.ok(hasBwvWatch, "expected BWV-related radar item");

assert.ok(withBaseline.reviewNotice.includes("not commands"));

console.log("advice-change-radar.test.ts: PASS");
