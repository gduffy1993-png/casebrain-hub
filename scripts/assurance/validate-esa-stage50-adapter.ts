/**
 * ESA Stage-50 adapter dry-run validation.
 *
 * Loads and validates ESA cases into SavedCaseMaterialisation packets.
 * Does NOT run auditor controls or generate stage-50 findings.
 *
 *   npx tsx scripts/assurance/validate-esa-stage50-adapter.ts
 */

import path from "node:path";
import {
  validateEsaAdapter,
  writeEsaValidationReport,
  DEFAULT_ESA_CORPUS_ROOT,
} from "@/lib/eval/master-assurance-auditor/esa-adapter";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main() {
  const corpusRoot = arg("corpus-root") ?? DEFAULT_ESA_CORPUS_ROOT;
  const required = Number(arg("required") ?? "50");
  const outDir =
    arg("out") ??
    path.join(
      "artifacts",
      "casebrain-qa",
      "assurance",
      "master-auditor-v1",
      "esa-stage50-adapter-validation",
    );

  const { report } = validateEsaAdapter({
    corpusRoot,
    requiredUniqueCases: required,
  });
  const written = writeEsaValidationReport(report, outDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        controlsExecuted: false,
        findingsGenerated: false,
        adapterId: report.adapterId,
        uniqueValidCaseCount: report.uniqueValidCaseCount,
        requiredUniqueCases: report.requiredUniqueCases,
        sufficientForStage50: report.sufficientForStage50,
        refuseReason: report.refuseReason,
        totals: report.totals,
        exitApplicability: report.exitApplicability,
        rejectedSample: report.rejected.slice(0, 10),
        reportJson: written.jsonPath,
        reportMd: written.mdPath,
        doNot: [
          "run_stage_50",
          "execute_controls",
          "generate_findings",
          "commit",
          "push",
          "merge",
          "deploy",
          "claim_PASS",
        ],
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
