#!/usr/bin/env npx tsx
/**
 * Proof Map fidelity — Phase 4a Evidence Dependency Graph evaluator.
 *
 *   npx tsx scripts/proof-map-fidelity.ts --pack gold
 */
import { runProofMapGoldPack } from "@/lib/eval/casebrain-auditor/proof-map-run";
import { proofMapOutDirForPack, writeProofMapReport } from "@/lib/eval/casebrain-auditor/proof-map-report";

function main(): void {
  const packArg = process.argv.includes("--pack") ? process.argv[process.argv.indexOf("--pack") + 1] : "gold";
  if (packArg !== "gold") {
    console.error(`Unknown pack "${packArg}". Supported: gold`);
    process.exit(1);
  }

  const summary = runProofMapGoldPack();
  const outDir = proofMapOutDirForPack("gold");
  writeProofMapReport(summary, outDir);

  console.log("");
  console.log("Proof Map fidelity (", summary.phase, "):");
  console.log("  Runnable:", summary.runnable, "/", summary.total);
  console.log("  Passed:", summary.passed);
  console.log("  Failed:", summary.failed);
  console.log("  Needs review:", summary.needsReview);
  console.log("  Skipped:", summary.skipped);
  console.log("Report:", outDir);
  console.log("");

  for (const r of summary.results) {
    const tag = r.skipped ? "SKIPPED" : r.overall.toUpperCase();
    console.log(`  ${tag.padEnd(12)} ${r.bundleId} (${r.proofPoints.length} pp, ${r.links.length} links)`);
    if (r.skipReason) console.log(`               ${r.skipReason}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
