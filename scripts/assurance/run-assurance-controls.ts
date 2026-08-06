/**
 * Run permanent Assurance Engine controls and write receipts.
 *
 * Usage: npx tsx scripts/assurance/run-assurance-controls.ts [--out=path]
 *
 * This runner executes the foundation-hardening contract suite (which emits
 * receipts for every registered control) and mirrors the report.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const OUT_ARG = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length);
const OUT = path.resolve(
  ROOT,
  OUT_ARG || "artifacts/casebrain-qa/assurance/foundation-hardening-v1",
);

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "scripts/foundation-hardening-contracts.test.ts"],
  { cwd: ROOT, encoding: "utf8", shell: true },
);

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");

const reportPath = path.join(OUT, "ASSURANCE-REPORT.json");
if (!fs.existsSync(reportPath)) {
  console.error(`Assurance report missing at ${reportPath}`);
  process.exitCode = 1;
} else {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
    summary: { criticalFails: number; fail: number; pass: number };
  };
  console.log(
    JSON.stringify(
      {
        out: OUT,
        pass: report.summary.pass,
        fail: report.summary.fail,
        criticalFails: report.summary.criticalFails,
        exit: result.status,
      },
      null,
      2,
    ),
  );
  if (result.status && result.status !== 0) process.exitCode = result.status;
  if (report.summary.criticalFails > 0) process.exitCode = 1;
}
