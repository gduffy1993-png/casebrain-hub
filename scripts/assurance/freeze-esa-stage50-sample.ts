/**
 * Freeze stratified Stage-50 ESA sample (dry membership only).
 *
 * Does NOT run auditor controls or generate findings.
 *
 *   npx tsx scripts/assurance/freeze-esa-stage50-sample.ts
 */

import path from "node:path";
import {
  freezeStage50Sample,
  writeStage50SampleFreeze,
  DEFAULT_STAGE50_FREEZE_DIR,
  STAGE50_SAMPLE_POLICY_VERSION,
  STAGE50_SAMPLE_SIZE,
} from "@/lib/eval/master-assurance-auditor/esa-stage50-sample-freeze";
import { DEFAULT_ESA_CORPUS_ROOT } from "@/lib/eval/master-assurance-auditor/esa-adapter";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main() {
  const corpusRoot = arg("corpus-root") ?? DEFAULT_ESA_CORPUS_ROOT;
  const outDir = arg("out") ?? DEFAULT_STAGE50_FREEZE_DIR;
  const sampleSize = Number(arg("sample-size") ?? String(STAGE50_SAMPLE_SIZE));

  const freeze = freezeStage50Sample({ corpusRoot, sampleSize });
  const written = writeStage50SampleFreeze(freeze, outDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        policyVersion: STAGE50_SAMPLE_POLICY_VERSION,
        sampleSize: freeze.sampleSize,
        populationUniqueValid: freeze.populationUniqueValid,
        excludedPopulationCount: freeze.excludedPopulationCount,
        excludedBreakdown: freeze.excludedBreakdown,
        orderedMembershipHash: freeze.orderedMembershipHash,
        familyBucketsCovered: freeze.coverage.familyBucketsCovered.length,
        issueTagsCovered: freeze.coverage.issueTagsCovered,
        exitApplicability: freeze.coverage.exitApplicability,
        controlsExecuted: false,
        findingsGenerated: false,
        freezeJson: written.jsonPath,
        coverageMd: written.mdPath,
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
