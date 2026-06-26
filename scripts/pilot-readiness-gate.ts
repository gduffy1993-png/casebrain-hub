#!/usr/bin/env npx tsx
/**
 * Pilot readiness gate.
 *
 * Level 1: 2,200 automated corpus scan must have zero critical failures.
 * Level 2: Golden Case Pack must be mostly pass/polish with no fails.
 *
 * Run:
 *   npx tsx scripts/pilot-readiness-gate.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type StepResult = {
  name: string;
  command: string[];
  status: "pass" | "fail";
  exitCode: number | null;
  reportPath?: string;
  summary?: unknown;
};

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "pilot-readiness");
const LEVEL_1_REPORT = path.join(ROOT, "artifacts", "casebrain-qa", "bundle-fidelity-corpus-lint", "report.json");

function parseArgs(): {
  count: number;
  split: string;
  pack: "local" | "gold";
  minGolden: number;
  maxPolishRate: number;
  skipLevel1: boolean;
  skipLevel2: boolean;
} {
  const argv = process.argv.slice(2);
  let count = 2200;
  let split = "all";
  let pack: "local" | "gold" = "local";
  let minGolden = 30;
  let maxPolishRate = 0.35;
  let skipLevel1 = false;
  let skipLevel2 = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count" && argv[i + 1]) count = Number(argv[++i]);
    else if (argv[i] === "--split" && argv[i + 1]) split = String(argv[++i]);
    else if (argv[i] === "--pack" && argv[i + 1]) {
      const value = String(argv[++i]);
      if (value === "local" || value === "gold") pack = value;
    }
    else if (argv[i] === "--min-golden" && argv[i + 1]) minGolden = Number(argv[++i]);
    else if (argv[i] === "--max-polish-rate" && argv[i + 1]) maxPolishRate = Number(argv[++i]);
    else if (argv[i] === "--skip-level-1") skipLevel1 = true;
    else if (argv[i] === "--skip-level-2") skipLevel2 = true;
  }
  return { count, split, pack, minGolden, maxPolishRate, skipLevel1, skipLevel2 };
}

function readJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function runStep(name: string, command: string[], reportPath: string): StepResult {
  console.log("");
  console.log(`${name}`);
  console.log("-".repeat(name.length));
  console.log(command.join(" "));

  const result = spawnSync(command[0]!, command.slice(1), {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const status = result.status === 0 ? "pass" : "fail";
  return {
    name,
    command,
    status,
    exitCode: result.status,
    reportPath,
    summary: readJson(reportPath),
  };
}

function main(): void {
  const opts = parseArgs();
  const steps: StepResult[] = [];
  const level2Report = path.join(ROOT, "artifacts", "casebrain-qa", "golden-case-pack", `${opts.pack}-report.json`);

  if (!opts.skipLevel1) {
    steps.push(
      runStep("Level 1 - 2,200 auto scan", [
        "npx",
        "tsx",
        "scripts/bundle-fidelity-corpus-lint.ts",
        "--count",
        String(opts.count),
        "--split",
        opts.split,
      ], LEVEL_1_REPORT),
    );
  }

  if (!opts.skipLevel2) {
    steps.push(
      runStep("Level 2 - Golden Case Pack", [
        "npx",
        "tsx",
        "scripts/golden-case-pack-gate.ts",
        "--pack",
        opts.pack,
        "--min-runnable",
        String(opts.minGolden),
        "--max-polish-rate",
        String(opts.maxPolishRate),
      ], level2Report),
    );
  }

  const pilotReady = steps.every((s) => s.status === "pass");
  const report = {
    generatedAt: new Date().toISOString(),
    pilotReady,
    rule: "Pilot starts when Level 1 has no critical fails and Level 2 golden pack is mostly pass/polish. Do not wait for perfection.",
    thresholds: {
      level1Count: opts.count,
      level1Split: opts.split,
      level2Pack: opts.pack,
      minGolden: opts.minGolden,
      maxPolishRate: opts.maxPolishRate,
    },
    steps,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("");
  console.log("Pilot readiness:");
  console.log(`  ${pilotReady ? "READY" : "NOT READY YET"}`);
  console.log(`  Report: ${reportPath}`);

  if (!pilotReady) process.exit(1);
}

main();
