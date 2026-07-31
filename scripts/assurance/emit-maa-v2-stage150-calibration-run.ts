/**
 * Emit Stage-150 frozen calibration run artefacts.
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-calibration-run.ts
 *
 * Measurement only — does not set stage150ExecutionAllowed=true.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { STAGE150_IMPLEMENTED_IDS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import {
  STAGE150_CALIBRATION_ARTIFACT_ROOT,
  STAGE150_CALIBRATION_BASELINE,
  runStage150CalibrationPipeline,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/calibration";

const ROOT = process.cwd();
const OUT = path.join(ROOT, STAGE150_CALIBRATION_ARTIFACT_ROOT);

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobId(ref: string, file: string): string | null {
  try {
    return execSync(`git rev-parse ${ref}:${file}`, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

function brain1GuardianCompare(baseline: string, head: string) {
  const files = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const rows = files.map((p) => {
    const baselineBlobId = gitBlobId(baseline, p);
    const headBlobId = gitBlobId(head, p);
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology: "git rev-parse <baseline>:<exact-file> vs HEAD:<exact-file>",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  if (head !== STAGE150_CALIBRATION_BASELINE) {
    console.warn(
      JSON.stringify({
        warning: "HEAD differs from authorised calibration baseline",
        expected: STAGE150_CALIBRATION_BASELINE,
        head,
      }),
    );
  }

  const result = runStage150CalibrationPipeline({ repoRoot: ROOT, headCommit: head });
  const matrix = buildStage150ImplementationCapabilityMatrix();
  const blobCompare = brain1GuardianCompare(STAGE150_CALIBRATION_BASELINE, head);

  let tscOk = true;
  let tscExcerpt = "";
  let stage150Errs = 0;
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  stage150Errs = (tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? [])
    .length;

  writeJson(OUT, "typescript-baseline.json", {
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    baselineCommit: STAGE150_CALIBRATION_BASELINE,
    stage150PathErrors: stage150Errs,
  });
  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    totals: matrix.totals,
    implementedIdCount: STAGE150_IMPLEMENTED_IDS.size,
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.12.0",
    baselineCommit: STAGE150_CALIBRATION_BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    stage150CalibrationRunCompleted: true,
    populationPacketReadinessMet: true,
    reasons: [
      "stage150CalibrationRunCompleted=true — frozen 150-packet census calibration measurement only",
      "stage150ExecutionAllowed remains FALSE (full programme execution not authorised)",
      "No control promotions",
      "No CaseBrain repair",
      "No corpus or programme PASS",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: true,
      denominatorReadinessComplete: true,
      adapterReadinessComplete: false,
      receiptValidationComplete: true,
      contractReadinessComplete: true,
      relationshipComplete: false,
      protectedAssetsPreserved: blobCompare.brain1GuardianBlobUnchanged,
      structuredRematerialisationComplete: true,
      calibrationMeasurementComplete: true,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const stop = {
    schemaVersion: "maa-v2-stage150-calibration-run-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — STAGE-150 FROZEN CALIBRATION RUN",
    status: "STAGE150_CALIBRATION_RUN_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: STAGE150_CALIBRATION_BASELINE,
    headCommit: head,
    runId: result.runId,
    orderedMembershipSha256: result.freeze.orderedMembershipSha256,
    populationCount: result.freeze.populationCount,
    candidateCount: result.candidateCount,
    candidateFreezeSha256: result.candidateFreezeSha256,
    findingUnits: result.findingUnits,
    freezeValidationBeforeOk: result.beforeValidation.ok,
    freezeValidationAfterOk: result.afterValidation.ok,
    stage150CalibrationRunCompleted: true,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    detectorPromotions: [],
    packetsRewritten: false,
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    implementationTotals: matrix.totals,
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      rows: blobCompare.rows,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    artefacts: [
      "frozen-population-manifest.json",
      "freeze-receipt.json",
      "candidate-freeze-receipt.json",
      "truth-open-sequence-receipts.json",
      "per-control-exercise-matrix.json",
      "all-exit-matrix.json",
      "finding-ledger.json",
      "finding-units.json",
      "root-cause-summary.json",
      "review-batches/",
      "freeze-validation-before-execution.json",
      "freeze-validation-after-execution.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    blockers: [
      "Calibration measurement complete — not programme Stage-150 execution",
      "stage150ExecutionAllowed remains FALSE",
      "No remediation / promotions / CaseBrain repair",
      "No Stage 300",
      "Stop uncommitted for Codex review",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  const manifestRel = `${STAGE150_CALIBRATION_ARTIFACT_ROOT}/changed-file-manifest.json`;
  const intended = [
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/constants.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/population-freeze.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/blind-runner.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/ownership-dedupe.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/truth-open.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/review-batches.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/pipeline.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/calibration/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/index.ts",
    "scripts/assurance/emit-maa-v2-stage150-calibration-run.ts",
    "scripts/maa-v2-stage150-calibration-run-contracts.test.ts",
    "scripts/maa-v2-stage150-intelligence-contracts.test.ts",
    `${STAGE150_CALIBRATION_ARTIFACT_ROOT}/STOP-FOR-CODEX-REVIEW.json`,
    `${STAGE150_CALIBRATION_ARTIFACT_ROOT}/frozen-population-manifest.json`,
    `${STAGE150_CALIBRATION_ARTIFACT_ROOT}/freeze-receipt.json`,
    `${STAGE150_CALIBRATION_ARTIFACT_ROOT}/candidate-freeze-receipt.json`,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
    manifestRel,
  ];
  const entries = intended
    .filter((p) => p !== manifestRel && fs.existsSync(path.join(ROOT, p)))
    .map((relativePath) => {
      const buf = fs.readFileSync(path.join(ROOT, relativePath));
      return { relativePath, sha256: sha(buf), byteLength: buf.byteLength };
    });
  const draft = {
    schemaVersion: "maa-v2-stage150-calibration-changed-file-manifest@1.0.0",
    baselineCommit: STAGE150_CALIBRATION_BASELINE,
    headCommit: head,
    intendedScopePaths: intended,
    entries,
    thisManifest: null as null | { relativePath: string; sha256: string; byteLength: number },
  };
  const nullSelf = `${JSON.stringify(draft, null, 2)}\n`;
  draft.thisManifest = {
    relativePath: manifestRel,
    sha256: sha(nullSelf),
    byteLength: Buffer.byteLength(nullSelf),
  };
  writeJson(OUT, "changed-file-manifest.json", {
    ...draft,
    entries: [
      ...entries,
      {
        relativePath: manifestRel,
        sha256: draft.thisManifest.sha256,
        byteLength: draft.thisManifest.byteLength,
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        out: OUT,
        runId: result.runId,
        population: result.freeze.populationCount,
        orderedMembershipSha256: result.freeze.orderedMembershipSha256,
        candidates: result.candidateCount,
        exerciseRows: result.exerciseRowCount,
        findingUnits: result.findingUnits,
        freezeBeforeOk: result.beforeValidation.ok,
        freezeAfterOk: result.afterValidation.ok,
        stage150CalibrationRunCompleted: true,
        stage150ExecutionAllowed: false,
        programmePassSupported: false,
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 && result.afterValidation.ok ? 0 : 1);
}

main();
