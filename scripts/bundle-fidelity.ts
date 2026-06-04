#!/usr/bin/env npx tsx
/**
 * Bundle fidelity — compare extracted metadata vs gold truth keys.
 *
 *   npx tsx scripts/bundle-fidelity.ts --pack gold
 */
import { runGoldPack } from "@/lib/eval/casebrain-auditor/bundle-fidelity-run";
import {
  defaultBundleFidelityOutDir,
  writeBundleFidelityReport,
} from "@/lib/eval/casebrain-auditor/bundle-fidelity-report";

function main(): void {
  const pack = process.argv.includes("--pack") ? process.argv[process.argv.indexOf("--pack") + 1] : "gold";
  if (pack !== "gold") {
    console.error(`Unknown pack "${pack}". Supported: gold`);
    process.exit(1);
  }

  const summary = runGoldPack();
  const outDir = defaultBundleFidelityOutDir();
  writeBundleFidelityReport(summary, outDir);

  console.log("");
  console.log("Bundle fidelity:", summary.passed, "pass,", summary.failed, "fail,", summary.needsReview, "review,", summary.skipped, "skipped");
  console.log("Runnable:", summary.runnable, "/", summary.total);
  console.log("Report:", outDir);
  console.log("");

  for (const r of summary.results.filter((x) => !x.skipped)) {
    console.log(`  ${r.overall.toUpperCase().padEnd(12)} ${r.bundleId}`);
  }
  for (const r of summary.results.filter((x) => x.skipped)) {
    console.log(`  SKIPPED      ${r.bundleId} (${r.linkStatus})`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
