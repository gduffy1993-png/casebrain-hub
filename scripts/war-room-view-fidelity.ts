#!/usr/bin/env npx tsx
/**
 * War Room view fidelity — Phase 4c hearing-action view over Proof Map.
 *
 *   npx tsx scripts/war-room-view-fidelity.ts --pack gold
 */
import { runWarRoomViewGoldPack } from "@/lib/eval/casebrain-auditor/war-room-view-run";
import {
  warRoomViewOutDirForPack,
  writeWarRoomViewReport,
} from "@/lib/eval/casebrain-auditor/war-room-view-report";

function main(): void {
  const packArg = process.argv.includes("--pack") ? process.argv[process.argv.indexOf("--pack") + 1] : "gold";
  if (packArg !== "gold") {
    console.error(`Unknown pack "${packArg}". Supported: gold`);
    process.exit(1);
  }

  const summary = runWarRoomViewGoldPack();
  const outDir = warRoomViewOutDirForPack("gold");
  writeWarRoomViewReport(summary, outDir);

  console.log("");
  console.log("War Room view fidelity (", summary.phase, "):");
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
      `  ${tag.padEnd(12)} ${r.bundleId} (${r.courtRecordRequests.length} record asks, ${r.prosecutionResponsePoints.length} crown responses)`,
    );
    if (r.skipReason) console.log(`               ${r.skipReason}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
