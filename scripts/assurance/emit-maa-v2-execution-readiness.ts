/**
 * Emit MAA V2 execution-readiness artefacts (no Stage 150 run/freeze).
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-execution-readiness.ts
 */

import fs from "node:fs";
import path from "node:path";

import {
  buildStageActivationMatrix,
  buildEvidenceRequirements,
  buildV1ToV2Migration,
  validateV2Registry,
} from "../../lib/eval/master-assurance-auditor/v2/assemble";
import { collectExecutionReadinessBundle } from "../../lib/eval/master-assurance-auditor/v2/execution-readiness";
import {
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
  MAA_V2_SCHEMA_VERSION,
} from "../../lib/eval/master-assurance-auditor/v2/schema";

const OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2",
);

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const bundle = collectExecutionReadinessBundle();
  const issues = validateV2Registry(bundle.registry);
  if (issues.length) {
    console.error("Registry validation failed:", issues.slice(0, 30));
    process.exit(1);
  }
  if (bundle.relationships.unresolvedRelationshipClassification !== 0) {
    console.error("Unresolved relationships remain");
    process.exit(1);
  }

  writeJson("auditor-control-registry-v2.json", bundle.registry);
  writeJson("control-stage-activation-matrix.json", buildStageActivationMatrix(bundle.controls));
  writeJson("control-evidence-requirements.json", buildEvidenceRequirements(bundle.controls));
  writeJson("v1-to-v2-registry-migration.json", buildV1ToV2Migration(bundle.controls));

  writeJson("v2-control-execution-status.json", bundle.status);
  writeJson("stage20-historical-activation-correction.json", bundle.stage20);
  writeJson("stage150-detector-implementation-map.json", bundle.detectorMap);
  writeJson("esa-population-input-capability-audit.json", bundle.esa);
  writeJson("stage150-control-exerciseability.json", bundle.exerciseability);
  writeJson("stage150-minimum-denominators.json", bundle.denominators);
  writeJson("v2-control-relationship-audit.json", bundle.relationships);
  writeJson("stage150-execution-readiness-gate.json", bundle.gate);

  fs.writeFileSync(
    path.join(OUT, "execution-readiness-report.md"),
    bundle.reportMd,
    "utf8",
  );

  const stop = {
    schemaVersion: "maa-v2-execution-readiness-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 execution-readiness remediation only",
    createdAt: new Date().toISOString(),
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    pr: 65,
    registryVersion: MAA_V2_REGISTRY_VERSION,
    registrySchemaVersion: MAA_V2_SCHEMA_VERSION,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    programmePassSupported: false,
    stage150Started: false,
    stage150SampleFrozen: false,
    stage150ControlsRun: false,
    applicationBehaviourChanged: false,
    committed: false,
    pushed: false,
    merged: false,
    deployed: false,
    controlCounts: {
      total: bundle.controls.length,
      preservedV1: 24,
      additiveV2: bundle.controls.length - 24,
      currentlyRunnable: bundle.status.currentlyRunnableCount,
      stage150Declared: bundle.detectorMap.stage150ControlCount,
      stage150FullyExercisable: bundle.exerciseability.counts.fully_exercisable,
    },
    historicalStage20ControlCount: 24,
    esaUniqueValid: bundle.esa.denominators.populationUniqueValid,
    readinessGate: {
      overallAllowed: bundle.gate.overallAllowed,
      stage150ExecutionAllowed: bundle.gate.stage150ExecutionAllowed,
      blockingReasons: bundle.gate.blockingReasons,
    },
    deliverables: [
      "v2-control-execution-status.json",
      "stage20-historical-activation-correction.json",
      "stage150-detector-implementation-map.json",
      "esa-population-input-capability-audit.json",
      "stage150-control-exerciseability.json",
      "stage150-minimum-denominators.json",
      "v2-control-relationship-audit.json",
      "stage150-execution-readiness-gate.json",
      "execution-readiness-report.md",
      "auditor-control-registry-v2.json",
      "control-stage-activation-matrix.json",
    ],
    reviewAsks: [
      "Confirm no registry-only control marked implemented.",
      "Confirm Stage 20 historical count is 24 and future activation is distinct.",
      "Confirm Stage 150 execution remains blocked.",
      "Approve or set PENDING_APPROVAL denominator thresholds before any Stage 150 sample freeze.",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: bundle.controls.length,
        runnable: bundle.status.currentlyRunnableCount,
        stage150: bundle.detectorMap.stage150ControlCount,
        fullyExercisable: bundle.exerciseability.counts.fully_exercisable,
        esaValid: bundle.esa.denominators.populationUniqueValid,
        gateAllowed: bundle.gate.overallAllowed,
        unresolvedRels: bundle.relationships.unresolvedRelationshipClassification,
      },
      null,
      2,
    ),
  );
}

main();
