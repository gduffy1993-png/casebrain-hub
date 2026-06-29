#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildExportPack } from "../lib/criminal/export-pack";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const COURT_IN_CPS_RE =
  /\b(ask the court|the defence asks the court|the court to record|your honour|my learned friend)\b/i;

const UNSAFE_CLIENT_RE =
  /\b(you will win|case collapses|guaranteed|change your advice)\b/i;

const INTERNAL_ROUTE_RE =
  /\b(digital_attribution|bwv_police_contact|custody_pace|mixed_unclear|REQ-|proof-map)\b/i;

const bundleText = `
R v Test Client
Charge: Assault
MG6 lists BWV as referred only — not served.
`;

const ledger = buildBundleTruthLedger({ bundleText });
const briefPlan = buildCriminalBriefPlan({
  bundleText,
  ledger,
  missingMaterial: ["BWV full export"],
  allegation: "Assault",
});

const battleboard = buildStrategyBattleboard({
  case_id: "test-export",
  bundle_text: bundleText,
  offence_label: "Assault",
});

const chase = buildDisclosureChaseBrief({
  caseId: "test-export",
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
  caseId: "test-export",
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

const pack = buildExportPack({
  caseId: "test-export",
  allegation: "Assault",
  warRoom: war,
  chase,
  briefPlan,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
  primaryRouteTitle: "Attribution review",
  appVersion: "test123",
  generatedAt: "2026-06-10T12:00:00.000Z",
});

const cps = pack.sections.find((s) => s.id === "cps_chase")!;
const court = pack.sections.find((s) => s.id === "court_note")!;
const client = pack.sections.find((s) => s.id === "client_summary")!;
const gaps = pack.sections.find((s) => s.id === "evidence_gaps")!;
const full = pack.sections.find((s) => s.id === "full_pack")!;

assert.ok(cps.textForClipboard.length > 0, "CPS chase export present");
assert.ok(!COURT_IN_CPS_RE.test(cps.textForClipboard), "CPS chase must not include court wording");
assert.ok(cps.textForClipboard.includes("not for court"), "CPS chase labelled not for court");
assert.ok(cps.textForClipboard.toLowerCase().includes("solicitor review"), "CPS chase has review footer");

assert.ok(court.textForClipboard.length > 0, "Court note present");
assert.ok(court.textForClipboard.includes("not for CPS chase"), "Court note separated from CPS");
assert.ok(!court.textForClipboard.includes("Please provide"), "Court note must not be CPS chase wording");

assert.ok(client.textForClipboard.length > 0, "Client summary present");
assert.ok(!UNSAFE_CLIENT_RE.test(client.textForClipboard), "Client summary must be safe/provisional");
assert.ok(!INTERNAL_ROUTE_RE.test(client.textForClipboard), "Client summary must not leak internal labels");
assert.ok(client.textForClipboard.toLowerCase().includes("solicitor review"), "Client summary has review footer");

assert.ok(gaps.textForClipboard.length > 0, "Evidence gaps present");
assert.ok(
  /referred|missing|not safely|incomplete|served/i.test(gaps.textForClipboard),
  "Evidence gaps label state correctly",
);
assert.ok(!/\bserved\b.*referred only\b/i.test(gaps.textForClipboard.replace(/referred only/gi, "")), "No referred-as-served flip");

assert.ok(pack.version.exportId.startsWith("exp-"), "Version exportId present");
assert.ok(pack.version.caseId === "test-export", "Version caseId present");
assert.ok(pack.version.generatedAt.includes("2026"), "Version generatedAt present");
assert.ok(pack.version.appVersion === "test123", "Version appVersion present");
assert.ok(pack.version.reviewFooter.toLowerCase().includes("solicitor review"), "Version review footer");

assert.ok(full.textForClipboard.includes(pack.version.exportId), "Full pack includes version stamp");
assert.ok(full.textForClipboard.includes(cps.textForClipboard.slice(0, 40)), "Full pack includes CPS section");

assert.notEqual(cps.textForClipboard, court.textForClipboard, "CPS chase and court note stay separate");

console.log("export-pack.test.ts: all assertions passed");
