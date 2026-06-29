#!/usr/bin/env npx tsx
/**
 * H4 v1.1 supplement gate — serious legal aid shapes (+7).
 * Run: npx tsx scripts/h4-simulator-pack-v1.1-generate.ts
 *      npx tsx scripts/h4-simulator-pack-v1.1-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { loadSimulatorPackV1_1 } from "../lib/eval/h4-simulator/load-simulator-pack";
import { runSimulatorPackGateCase } from "../lib/eval/h4-simulator/run-simulator-pack-gate";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h4-simulator-pack-v1.1");

function main(): void {
  const results = loadSimulatorPackV1_1().map((entry) =>
    runSimulatorPackGateCase(entry, { seriousSupplement: true }),
  );
  const withBlocking = results.filter((r) => r.blocking.length > 0);
  const withWarnings = results.filter((r) => r.warnings.length > 0);

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H4 Simulator Pack v1.1 Gate (serious-case supplement)",
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
      .map((r) => ({
        caseId: r.caseId,
        title: r.title,
        issues: r.warnings,
      })),
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "simulator-pack-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`H4 simulator pack v1.1 gate: ${report.status.toUpperCase()}`);
  console.log(`  Cases: ${report.pack.total}, blocking: ${report.pack.blockingFail}, warnings: ${report.pack.warningOnly}`);
  console.log(`  Outputs checked: ${report.pack.outputsChecked}`);
  console.log(`  Report: ${path.join(OUT_DIR, "simulator-pack-report.json")}`);

  if (withBlocking.length > 0) process.exit(1);
}

main();
