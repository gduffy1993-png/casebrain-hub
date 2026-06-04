#!/usr/bin/env npx tsx
/**
 * Phase 4e — Synthetic Criminal Bundle Factory v1 (1k scored strategy corpus).
 *
 *   npx tsx scripts/strategy-corpus.ts --count 1000 --split all
 *   npx tsx scripts/strategy-corpus.ts --count 50 --split discovery --canary
 */
import {
  runStrategyCorpus,
  strategyCorpusReportDir,
} from "@/lib/eval/casebrain-auditor/strategy-corpus-run";
import { writeStrategyCorpusReport } from "@/lib/eval/casebrain-auditor/strategy-corpus-report";
import type { StrategyCorpusSplit } from "@/lib/eval/casebrain-auditor/strategy-corpus-types";

function parseArgs(): {
  count: number;
  split: StrategyCorpusSplit | "all";
  canary: boolean;
} {
  const argv = process.argv.slice(2);
  let count = 50;
  let split: StrategyCorpusSplit | "all" = "discovery";
  let canary = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]!, 10);
    if (argv[i] === "--split" && argv[i + 1]) split = argv[++i] as StrategyCorpusSplit | "all";
    if (argv[i] === "--canary") canary = true;
  }

  if (!Number.isFinite(count) || count < 1) {
    console.error("Invalid --count");
    process.exit(1);
  }
  if (!["discovery", "validation", "holdout", "all"].includes(split)) {
    console.error(`Invalid --split "${split}"`);
    process.exit(1);
  }

  return { count, split, canary };
}

function main(): void {
  const { count, split, canary } = parseArgs();

  console.log("");
  console.log("Strategy corpus (Phase 4e v1):");
  console.log(`  Count: ${count} | Split: ${split}${canary ? " | CANARY" : ""}`);
  console.log("  Output cache: artifacts/casebrain-auditor/cache/strategy-corpus/ (gitignored)");
  console.log("");

  const summary = runStrategyCorpus({ count, split, canary, materialisationMode: "text-rendered" });
  const outDir = writeStrategyCorpusReport(summary);

  console.log("Split assignment (full corpus):");
  console.log(`  Discovery: ${summary.splitCounts.discovery}`);
  console.log(`  Validation: ${summary.splitCounts.validation}`);
  console.log(`  Holdout: ${summary.splitCounts.holdout} (frozen)`);
  console.log("");
  console.log(`Scored (${split}): ${summary.scored}`);
  console.log(`  Pass: ${summary.passed}`);
  console.log(`  Weak: ${summary.weak}`);
  console.log(`  Fail: ${summary.failed}`);
  console.log("");
  console.log("Top fingerprints:");
  for (const fp of summary.topFingerprints.slice(0, 8)) {
    console.log(`  ${fp.count}x  ${fp.fingerprint}`);
  }
  console.log("");
  console.log("Report:", outDir);
  console.log("");

  // Canary / CI: require canary to complete without hard fail storm; not 1000/1000 pass target
  if (canary && summary.failed > summary.scored * 0.5) {
    console.error("Canary: failure rate > 50% — investigate shared fingerprints before scaling.");
    process.exit(1);
  }

  process.exit(0);
}

main();
