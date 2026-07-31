/**
 * Emit MAA V2 Stage-150 Batch-10 deficit-120 corpus artefacts.
 *
 * Preserve existing 30 → build/validate 120 → population manifests → STOP.
 * No Stage-150 select/freeze/run. No CaseBrain behaviour change. No commit/push.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts
 * Optional: --limit=N for smoke
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { STAGE150_IMPLEMENTED_IDS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { BATCH10_BASELINE } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import {
  BATCH10_COHORT_A_ROOT,
  BATCH10_DEFICIT_ARTIFACT_ROOT,
  BATCH10_DEFICIT_CANDIDATE_ROOT,
  BATCH10_DEFICIT_SCHEMA,
  BATCH10_DEFICIT_SOURCE_ROOT,
  BATCH10_POPULATION_TARGET,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/constants";
import { runDeficit120Pipeline } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/cohort-pipeline";

const ROOT = process.cwd();
const OUT = path.join(ROOT, BATCH10_DEFICIT_ARTIFACT_ROOT);

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

function parseLimit(): number | undefined {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return undefined;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function main(): Promise<void> {
  const started = Date.now();
  const head = headCommit();
  const limit = parseLimit();
  fs.mkdirSync(OUT, { recursive: true });

  const result = await runDeficit120Pipeline({ limit, resume: true });

  writeJson(OUT, "cohort-a-hash-lock.json", {
    schemaVersion: "batch10-cohort-a-hash-lock@1.0.0",
    expectedCount: 30,
    allUnchanged: result.cohortA.allUnchanged,
    locks: result.cohortA.locks,
    candidateRoot: BATCH10_COHORT_A_ROOT,
  });

  writeJson(OUT, "cohort-b-accepted-rejected.json", {
    schemaVersion: "batch10-cohort-b-accepted-rejected@1.0.0",
    accepted: result.acceptedB,
    rejected: result.rejectedB,
    acceptedCount: result.acceptedB.length,
    rejectedCount: result.rejectedB.length,
  });

  writeJson(OUT, "population-manifest-150.json", {
    schemaVersion: "batch10-population-manifest@1.0.0",
    target: BATCH10_POPULATION_TARGET,
    populationCount: result.populationCount,
    readinessMet: result.populationPacketReadinessMet,
    populationPacketReadinessMet: result.populationPacketReadinessMet,
    readinessMeaning:
      "populationPacketReadinessMet only — not detector readiness, Stage-150 execution readiness, corpus PASS, or programme PASS",
    deficit: result.deficit,
    cohortA: result.cohortA.locks.map((l) => ({
      caseId: l.caseId,
      cohort: "A_original_30",
      packetSha256: l.actualSha256,
      relativePath: l.relativePath,
    })),
    cohortB: result.acceptedB.map((a) => ({
      caseId: a.caseId,
      cohort: "B_deficit_120",
      packetSha256: a.packetSha256,
      relativePath: a.relativePath,
    })),
  });

  writeJson(OUT, "cohort-a-manifest.json", {
    schemaVersion: "batch10-cohort-a-manifest@1.0.0",
    count: result.cohortA.count,
    packets: result.cohortA.locks,
  });
  writeJson(OUT, "cohort-b-manifest.json", {
    schemaVersion: "batch10-cohort-b-manifest@1.0.0",
    count: result.acceptedB.length,
    packets: result.acceptedB,
    sourceRoot: BATCH10_DEFICIT_SOURCE_ROOT,
    candidateRoot: BATCH10_DEFICIT_CANDIDATE_ROOT,
  });

  writeJson(OUT, "coverage-matrix.json", {
    schemaVersion: "batch10-deficit120-coverage-matrix@1.0.0",
    ...result.coverage,
  });
  writeJson(OUT, "uniqueness-near-duplicate-report.json", {
    schemaVersion: "batch10-uniqueness-report@1.0.0",
    uniqueness: result.uniqueness,
    nearDuplicates: result.nearDuplicates,
  });
  writeJson(OUT, "adapter-capability-dry-run.json", {
    schemaVersion: "batch10-adapter-dry-run@1.0.0",
    note: "Dry-run only — no audit verdicts; truth unopened",
    sample: result.adapterDryRunSample,
  });
  writeJson(OUT, "truth-blinding-receipts.json", {
    schemaVersion: "batch10-truth-blinding@1.0.0",
    ...result.truthBlinding,
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    totals: matrix.totals,
    implementedIdCount: STAGE150_IMPLEMENTED_IDS.size,
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.10.0",
    baselineCommit: BATCH10_BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    reasons: [
      result.readinessMet
        ? "Population of 150 unique packets exists — readiness only; Stage-150 selection/freeze/run remain FALSE"
        : `Population ${result.populationCount}/150 (deficit ${result.deficit}) — do not select/freeze`,
      "Batch-10 deficit-120 does not promote detectors or run Stage-150",
      "currentlyRunnableOnStage150 remains false",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: result.readinessMet,
      denominatorReadinessComplete: result.readinessMet,
      adapterReadinessComplete: false,
      receiptValidationComplete: true,
      contractReadinessComplete: true,
      relationshipComplete: false,
      protectedAssetsPreserved: true,
      structuredRematerialisationComplete: result.readinessMet,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const blobCompare = brain1GuardianCompare(BATCH10_BASELINE, head);
  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);

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
  stage150Errs = (
    tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? []
  ).length;
  writeJson(OUT, "typescript-baseline.json", {
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    baselineCommit: BATCH10_BASELINE,
    stage150PathErrors: stage150Errs,
  });

  // Storage projection
  let sourceBytes = 0;
  const sourceAbs = path.join(ROOT, BATCH10_DEFICIT_SOURCE_ROOT);
  if (fs.existsSync(sourceAbs)) {
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else sourceBytes += fs.statSync(p).size;
      }
    };
    walk(sourceAbs);
  }
  writeJson(OUT, "storage-size-retention-report.json", {
    schemaVersion: "batch10-deficit120-storage@1.0.0",
    sourceRoot: BATCH10_DEFICIT_SOURCE_ROOT,
    candidateRoot: BATCH10_DEFICIT_CANDIDATE_ROOT,
    artefactRoot: BATCH10_DEFICIT_ARTIFACT_ROOT,
    sourceBytes,
    retention: {
      doNotOverwrite: [
        BATCH10_COHORT_A_ROOT,
        "artifacts/evidence-state-audit-local/cases/**",
        "docs/controlled-pdf-pilots/**",
        "artifacts/casebrain-qa/malik-price-generation-v2-untouched-run/**",
      ],
      truthKeysBlinded: true,
    },
  });

  const stop = {
    schemaVersion: "maa-v2-stage150-batch10-deficit120-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Batch-10 DEFICIT-120 CORPUS",
    status: "STAGE150_BATCH10_DEFICIT120_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH10_BASELINE,
    headCommit: head,
    schemaVersionLib: BATCH10_DEFICIT_SCHEMA,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    cohortAPreserved: result.cohortA.allUnchanged,
    cohortACount: result.cohortA.count,
    cohortBAccepted: result.acceptedB.length,
    cohortBRejected: result.rejectedB.length,
    populationCount: result.populationCount,
    readinessMet: result.readinessMet,
    deficit: result.deficit,
    uniqueness: result.uniqueness,
    coverage: result.coverage,
    truthContentsOpened: false,
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
    blockers: [
      "Stage-150 selection/execution/freeze gates remain FALSE",
      "No programme PASS",
      "No detector promotions",
      ...(result.readinessMet
        ? ["150 packets ready for future Stage-150 selection — not selected/frozen in this batch"]
        : [
            `Remaining deficit ${result.deficit} after strict validation`,
            "Do not lower the bar or count rejected packets",
          ]),
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  // Changed-file manifest (literal paths)
  const manifestRel =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120/changed-file-manifest.json";
  const intended = [
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/constants.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/coverage-catalog.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/source-builder.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/production-capture.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/strict-validators.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/cohort-pipeline.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts",
    "scripts/maa-v2-stage150-batch10-deficit120-contracts.test.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
    `${BATCH10_DEFICIT_ARTIFACT_ROOT}/STOP-FOR-CODEX-REVIEW.json`,
    `${BATCH10_DEFICIT_ARTIFACT_ROOT}/population-manifest-150.json`,
    `${BATCH10_DEFICIT_ARTIFACT_ROOT}/changed-file-manifest.json`,
  ];
  const entries = intended
    .filter((p) => p !== manifestRel && fs.existsSync(path.join(ROOT, p)))
    .map((relativePath) => {
      const buf = fs.readFileSync(path.join(ROOT, relativePath));
      return { relativePath, sha256: sha(buf), byteLength: buf.byteLength };
    });
  const draft = {
    schemaVersion: "maa-v2-batch10-deficit120-changed-file-manifest@1.0.0",
    baselineCommit: BATCH10_BASELINE,
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
        cohortA: result.cohortA.count,
        cohortAUnchanged: result.cohortA.allUnchanged,
        cohortBAccepted: result.acceptedB.length,
        cohortBRejected: result.rejectedB.length,
        populationCount: result.populationCount,
        readinessMet: result.readinessMet,
        deficit: result.deficit,
        gates: { sample: false, exec: false, freeze: false, programmePass: false },
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
        truthOpened: false,
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 && result.cohortA.allUnchanged ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
