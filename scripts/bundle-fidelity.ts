#!/usr/bin/env npx tsx
/**
 * Bundle fidelity — compare extracted metadata vs truth keys.
 *
 *   npx tsx scripts/bundle-fidelity.ts --pack gold
 *   npx tsx scripts/bundle-fidelity.ts --pack local
 */
import { runGoldPack, runLocalPack } from "@/lib/eval/casebrain-auditor/bundle-fidelity-run";
import {
  bundleFidelityOutDirForPack,
  writeBundleFidelityReport,
} from "@/lib/eval/casebrain-auditor/bundle-fidelity-report";
import { localCasesRoot } from "@/lib/eval/casebrain-auditor/bundle-fidelity-local";

function printSummary(
  pack: "gold" | "local",
  summary: ReturnType<typeof runGoldPack>,
  warnings: string[] = [],
): void {
  const outDir = bundleFidelityOutDirForPack(pack);
  writeBundleFidelityReport(summary, outDir);

  if (pack === "local") {
    console.log("");
    console.log("LOCAL PACK — real PDFs/truth keys must stay gitignored.");
    console.log("Cases root:", localCasesRoot());
    for (const w of warnings) console.log("  ⚠", w);
  }

  console.log("");
  console.log(
    "Bundle fidelity:",
    summary.passed,
    "pass,",
    summary.failed,
    "fail,",
    summary.needsReview,
    "review,",
    summary.skipped,
    "skipped",
  );
  console.log("Runnable:", summary.runnable, "/", summary.total);
  console.log("Report:", outDir);
  console.log("");

  for (const r of summary.results.filter((x) => !x.skipped)) {
    console.log(`  ${r.overall.toUpperCase().padEnd(12)} ${r.bundleId}`);
  }
  for (const r of summary.results.filter((x) => x.skipped)) {
    console.log(`  SKIPPED      ${r.bundleId} (${r.linkStatus})`);
    if (r.skipReason) console.log(`               ${r.skipReason}`);
  }
}

function main(): void {
  const packArg = process.argv.includes("--pack") ? process.argv[process.argv.indexOf("--pack") + 1] : "gold";
  const pack = packArg === "local" ? "local" : packArg === "gold" ? "gold" : null;

  if (!pack) {
    console.error(`Unknown pack "${packArg}". Supported: gold, local`);
    process.exit(1);
  }

  if (pack === "gold") {
    const summary = runGoldPack();
    printSummary("gold", summary);
    process.exit(summary.failed > 0 ? 1 : 0);
  }

  const { summary, warnings } = runLocalPack();
  printSummary("local", summary, warnings);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
