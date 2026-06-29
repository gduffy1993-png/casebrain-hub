#!/usr/bin/env npx tsx
/**
 * H4 combined simulator gate — v1 (30) + v1.1 (7) + v2 (38) = 75 cases.
 * Run: npx tsx scripts/h4-simulator-combined-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { loadSimulatorPackAll } from "../lib/eval/h4-simulator/load-simulator-pack";
import { runSimulatorPackGateCase } from "../lib/eval/h4-simulator/run-simulator-pack-gate";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h4-simulator-combined");

function main(): void {
  const entries = loadSimulatorPackAll();
  if (entries.length !== 75) {
    throw new Error(`Expected 75 combined cases, got ${entries.length}`);
  }

  const results = entries.map((entry) => {
    const serious =
      /^sim-03[1-7]$/.test(entry.manifest.caseId) || /^sim-0(3[89]|[4-7]\d)$/.test(entry.manifest.caseId);
    return runSimulatorPackGateCase(entry, { seriousSupplement: serious });
  });

  const withBlocking = results.filter((r) => r.blocking.length > 0);
  const withWarnings = results.filter((r) => r.warnings.length > 0);

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H4 Simulator Combined Gate (75)",
    pack: {
      total: results.length,
      v1: results.filter((r) => /^sim-00/.test(r.caseId) || /^sim-0[12]\d$/.test(r.caseId) || /^sim-030$/.test(r.caseId)).length,
      v1_1: results.filter((r) => /^sim-03[1-7]$/.test(r.caseId)).length,
      v2: results.filter((r) => /^sim-0(3[89]|[4-7]\d)$/.test(r.caseId)).length,
      blockingFail: withBlocking.length,
      warningOnly: withWarnings.filter((r) => !r.blocking.length).length,
      outputsChecked: results.reduce((n, r) => n + r.outputsChecked, 0),
    },
    status: withBlocking.length > 0 ? "blocked" : withWarnings.length > 0 ? "warning" : "pass",
    blockingCases: withBlocking.slice(0, 25).map((r) => ({
      caseId: r.caseId,
      title: r.title,
      issues: r.blocking,
    })),
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "simulator-combined-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`H4 simulator combined gate: ${report.status.toUpperCase()}`);
  console.log(`  Cases: ${report.pack.total}, blocking: ${report.pack.blockingFail}, warnings: ${report.pack.warningOnly}`);
  console.log(`  Report: ${path.join(OUT_DIR, "simulator-combined-report.json")}`);

  if (withBlocking.length > 0) process.exit(1);
}

main();
