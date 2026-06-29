#!/usr/bin/env npx tsx
/**
 * Golden output snapshot — SHA-256 hashes of H5 builder models on a fixed fixture.
 * Baseline is post-layout; PASS proves deterministic re-run, not pre/post UI diff.
 * Run: npx tsx scripts/h5-golden-output-snapshot.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import { buildHearingMode } from "../lib/criminal/hearing-mode/build-hearing-mode";
import { buildExportPack } from "../lib/criminal/export-pack/build-export-pack";
import { buildMatterConfidence } from "../lib/criminal/matter-confidence/build-matter-confidence";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts", "casebrain-qa", "h5-golden-output");
const baselinePath = path.join(OUT, "baseline.json");

function hash(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

function buildGoldenModels() {
  const bundleText = `R v Test Client\nCharge: Assault\nMG6 lists BWV as referred only.\n`;
  const ledger = buildBundleTruthLedger({ bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: ["BWV full export"],
    allegation: "Assault",
  });
  const battleboard = buildStrategyBattleboard({
    case_id: "golden",
    bundle_text: bundleText,
    offence_label: "Assault",
  });
  const chase = buildDisclosureChaseBrief({
    caseId: "golden",
    caseTitle: "R v Test",
    clientLabel: "Test Client",
    allegation: "Assault",
    stage: "PTPH",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "thin",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    snapshotMissing: [{ label: "BWV full export", status: "outstanding" }],
    briefPlan,
  });
  const warRoom = buildHearingWarRoomBrief({
    caseId: "golden",
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
  const matterConfidence = buildMatterConfidence({
    documentCount: 1,
    combinedTextLength: 1200,
    bundleHealth: "thin",
    missingMaterialCount: 3,
    genericProvisional: true,
    hasSafeCourtLine: true,
  });
  const doNotOverstate = warRoom.doNotOverstate;

  const five = buildFiveAnswersView({
    allegation: "Assault",
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
  });
  const hearing = buildHearingMode({
    allegation: "Assault",
    briefPlan,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle: "Attribution review",
    documentCount: 1,
  });
  const exportPack = buildExportPack({
    caseId: "golden",
    allegation: "Assault",
    warRoom,
    chase,
    briefPlan,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle: "Attribution review",
    appVersion: "golden",
    generatedAt: "2026-01-01T00:00:00.000Z",
  });

  return {
    fiveAnswers: hash(five),
    hearingMode: hash(hearing),
    exportPack: hash(exportPack),
    matterConfidence: hash(matterConfidence),
  };
}

function main(): void {
  fs.mkdirSync(OUT, { recursive: true });
  const snapshot = buildGoldenModels();
  const reportPath = path.join(OUT, "report.json");

  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, `${JSON.stringify(snapshot, null, 2)}\n`);
    fs.writeFileSync(reportPath, `${JSON.stringify({ status: "BASELINE_CREATED", snapshot }, null, 2)}\n`);
    console.log("Created baseline:", baselinePath);
    return;
  }

  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as typeof snapshot;
  const diffs = (Object.keys(snapshot) as (keyof typeof snapshot)[]).filter(
    (k) => baseline[k] !== snapshot[k],
  );
  const status = diffs.length === 0 ? "PASS" : "FAIL";
  fs.writeFileSync(reportPath, `${JSON.stringify({ status, diffs, snapshot, baseline }, null, 2)}\n`);
  console.log("Golden output:", status, diffs.length ? diffs.join(", ") : "");
  if (status === "FAIL") process.exit(1);
}

main();
