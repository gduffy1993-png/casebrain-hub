#!/usr/bin/env npx tsx
/**
 * H4 v2 pack gate — sim-038..075.
 * Run: npx tsx scripts/h4-simulator-pack-v2-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { loadSimulatorPackV2 } from "../lib/eval/h4-simulator/load-simulator-pack";
import { runSimulatorPackGateCase } from "../lib/eval/h4-simulator/run-simulator-pack-gate";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h4-simulator-pack-v2");

function main(): void {
  const results = loadSimulatorPackV2().map((entry) =>
    runSimulatorPackGateCase(entry, { seriousSupplement: true }),
  );
  const withBlocking = results.filter((r) => r.blocking.length > 0);
  const withWarnings = results.filter((r) => r.warnings.length > 0);

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H4 Simulator Pack v2 Gate",
    pack: {
      total: results.length,
      blockingFail: withBlocking.length,
      warningOnly: withWarnings.filter((r) => !r.blocking.length).length,
      outputsChecked: results.reduce((n, r) => n + r.outputsChecked, 0),
    },
    status: withBlocking.length > 0 ? "blocked" : withWarnings.length > 0 ? "warning" : "pass",
    blockingCases: withBlocking.map((r) => ({
      caseId: r.caseId,
      title: r.title,
      issues: r.blocking,
    })),
    warningCases: withWarnings
      .sort((a, b) => b.warnings.length - a.warnings.length)
      .slice(0, 20)
      .map((r) => ({
        caseId: r.caseId,
        title: r.title,
        issues: r.warnings,
      })),
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "simulator-pack-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`H4 simulator pack v2 gate: ${report.status.toUpperCase()}`);
  console.log(`  Cases: ${report.pack.total}, blocking: ${report.pack.blockingFail}, warnings: ${report.pack.warningOnly}`);
  console.log(`  Outputs checked: ${report.pack.outputsChecked}`);
  console.log(`  Report: ${path.join(OUT_DIR, "simulator-pack-report.json")}`);

  if (withBlocking.length > 0) process.exit(1);
}

main();
