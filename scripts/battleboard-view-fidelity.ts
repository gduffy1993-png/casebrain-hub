#!/usr/bin/env npx tsx
/**
 * Battleboard view fidelity — Phase 4b strategy view over Proof Map.
 *
 *   npx tsx scripts/battleboard-view-fidelity.ts --pack gold
 */
import { runBattleboardViewGoldPack } from "@/lib/eval/casebrain-auditor/battleboard-view-run";
import {
  battleboardViewOutDirForPack,
  writeBattleboardViewReport,
} from "@/lib/eval/casebrain-auditor/battleboard-view-report";

function main(): void {
  const packArg = process.argv.includes("--pack") ? process.argv[process.argv.indexOf("--pack") + 1] : "gold";
  if (packArg !== "gold") {
    console.error(`Unknown pack "${packArg}". Supported: gold`);
    process.exit(1);
  }

  const summary = runBattleboardViewGoldPack();
  const outDir = battleboardViewOutDirForPack("gold");
  writeBattleboardViewReport(summary, outDir);

  console.log("");
  console.log("Battleboard view fidelity (", summary.phase, "):");
  console.log("  Runnable:", summary.runnable, "/", summary.total);
  console.log("  Passed:", summary.passed);
  console.log("  Failed:", summary.failed);
  console.log("  Needs review:", summary.needsReview);
  console.log("  Skipped:", summary.skipped);
  console.log("Report:", outDir);
  console.log("");

  for (const r of summary.results) {
    const tag = r.skipped ? "SKIPPED" : r.overall.toUpperCase();
    console.log(
      `  ${tag.padEnd(12)} ${r.bundleId} (${r.proofPointsAttacked.length} attacked, ${r.missingMaterial.length} missing)`,
    );
    if (r.skipReason) console.log(`               ${r.skipReason}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
