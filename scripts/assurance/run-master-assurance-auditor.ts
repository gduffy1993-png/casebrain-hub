/**
 * Master Assurance Auditor CLI.
 *
 * Calibration progression: contracts → 20 → 50 → 150 → 300 → 3000
 * This checkpoint runs only through stage 20 and stops for Codex review.
 *
 * Usage:
 *   npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=20
 *   npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=50   # refused until review
 */

import path from "node:path";
import { runMasterAssuranceAuditor } from "@/lib/eval/master-assurance-auditor";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const stage = (arg("stage") ?? "20") as "contracts" | "20" | "50" | "150" | "300" | "3000";
  const corpusRoot = arg("corpus-root");
  const outRoot = arg("out-root");
  const resume = flag("resume") || arg("resume") === "true";

  const result = await runMasterAssuranceAuditor({
    stage,
    corpusRoot,
    outRoot,
    resume,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: result.runId,
        stage: result.stage,
        outDir: result.outDir.replace(/\\/g, "/"),
        cases: result.cases.length,
        findings: result.findings.length,
        defects: result.checkpoint.totals.defects,
        unresolved: result.checkpoint.totals.unresolved,
        notExercised: result.checkpoint.totals.notExercised,
        gate: result.gate,
        status: result.checkpoint.status,
        programmePassSupported: false,
        nextCommand: result.checkpoint.nextCommand,
        stopFile: path.join(result.outDir, "STOP-FOR-CODEX-REVIEW.json").replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
