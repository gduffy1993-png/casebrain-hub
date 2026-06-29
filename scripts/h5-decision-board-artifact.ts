#!/usr/bin/env npx tsx
/**
 * H5 Decision Board — Layer 7 artifact from golden pack sample.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger, guardBattleboardOutput } from "../lib/criminal/bundle-truth-ledger";
import { buildDecisionBoard } from "../lib/criminal/decision-board/build-decision-board";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { buildMatterConfidence } from "../lib/criminal/matter-confidence/build-matter-confidence";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h5-decision-board");

function runCase(entry: ReturnType<typeof loadGoldPack>[number]) {
  if (!entry.bundleTextPaths.length) return null;
  const bundleText = readBundleText(entry.bundleTextPaths);
  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: entry.truthKey.missingMaterialExpected ?? [],
    allegation: header.allegation,
  });
  const battleboard = guardBattleboardOutput(
    buildStrategyBattleboard({
      case_id: entry.truthKey.bundleId,
      bundle_text: bundleText,
      offence_label: header.allegation,
    }),
    { ledger, bundleText },
  );
  const hearing = header.nextHearing ?? "Listed";
  const common = {
    caseId: entry.truthKey.bundleId,
    caseTitle: entry.truthKey.label ?? entry.truthKey.defendant,
    clientLabel: header.clientLabel?.trim() || entry.truthKey.defendant,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Golden pack",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    briefPlan,
  };
  const chase = buildDisclosureChaseBrief({
    ...common,
    hearingDateIso: ledger.hearing.dateIso,
    snapshotMissing: (entry.truthKey.missingMaterialExpected ?? []).map((l) => ({ label: l, status: "outstanding" as const })),
    proceduralOutstanding: entry.truthKey.missingMaterialExpected ?? [],
  });
  const war = buildHearingWarRoomBrief({
    ...common,
    readiness: chase.disclosureSummary,
    hasSavedPosition: false,
    chaseItems: entry.truthKey.missingMaterialExpected ?? [],
  });
  const confidence = buildMatterConfidence({
    documentCount: entry.bundleTextPaths.length,
    bundleHealth: "ready",
    hasSafeCourtLine: Boolean(chase.safeCourtLine?.trim()),
    missingMaterialCount: entry.truthKey.missingMaterialExpected?.length ?? 0,
  });
  return {
    bundleId: entry.truthKey.bundleId,
    label: entry.truthKey.label ?? entry.truthKey.bundleId,
    board: buildDecisionBoard({
      briefPlan,
      warRoom: war,
      chase,
      matterConfidence: confidence,
      doNotOverstate: war.doNotOverstate,
    }),
  };
}

function main(): void {
  const samples = loadGoldPack()
    .slice(0, 5)
    .map(runCase)
    .filter(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H5 Decision Board — Layer 7 sample",
    samples,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "decision-board-artifact.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.join(OUT_DIR, "decision-board-artifact.json")} (${samples.length} samples)`);
}

main();
