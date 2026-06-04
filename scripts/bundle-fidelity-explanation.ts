#!/usr/bin/env npx tsx
/**
 * Explanation fidelity — source-backed missing material + contradictions (Phase 3.5).
 *
 *   npx tsx scripts/bundle-fidelity-explanation.ts --pack gold
 *   npx tsx scripts/bundle-fidelity-explanation.ts --pack local
 *
 * 3.5a: types, report writer, runner shell only (no generator).
 */
import {
  runExplanationGoldPack,
  runExplanationLocalPack,
} from "@/lib/eval/casebrain-auditor/explanation-fidelity-run";
import {
  explanationFidelityOutDirForPack,
  writeExplanationFidelityReport,
} from "@/lib/eval/casebrain-auditor/explanation-fidelity-report";
import { localCasesRoot } from "@/lib/eval/casebrain-auditor/bundle-fidelity-local";

function printSummary(
  pack: "gold" | "local",
  summary: ReturnType<typeof runExplanationGoldPack>,
  warnings: string[] = [],
): void {
  const outDir = explanationFidelityOutDirForPack(pack);
  writeExplanationFidelityReport(summary, outDir);

  if (pack === "local") {
    console.log("");
    console.log("LOCAL PACK — real PDFs/truth keys must stay gitignored.");
    console.log("Cases root:", localCasesRoot());
    for (const w of warnings) console.log("  ⚠", w);
  }

  console.log("");
  console.log("Explanation fidelity (", summary.phase, "):");
  console.log("  Runnable:", summary.runnable, "/", summary.total);
  console.log("  Scaffolded:", summary.scaffolded);
  console.log("  Skipped:", summary.skipped);
  console.log("Report:", outDir);
  console.log("");

  for (const r of summary.results) {
    const tag = r.skipped ? "SKIPPED" : r.overall.toUpperCase();
    console.log(`  ${tag.padEnd(12)} ${r.bundleId}`);
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
    const summary = runExplanationGoldPack();
    printSummary("gold", summary);
    process.exit(summary.failed > 0 ? 1 : 0);
  }

  const { summary, warnings } = runExplanationLocalPack();
  printSummary("local", summary, warnings);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
