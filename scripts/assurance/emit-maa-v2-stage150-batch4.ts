/**
 * Emit MAA V2 Stage-150 Batch-4 honesty remediation artefacts.
 * No Stage-150 freeze/run. No CaseBrain/Brain1/Guardian/ledger changes.
 * Baseline: da98277c3038b40b2408a7af6a41475e88b21e17
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import os from "node:os";

import {
  BATCH4_DISPOSITIONS,
  BATCH4_REMAINING_SNI,
  BATCH4_SELECTED,
  batch4DispositionCounts,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch4-disposition";
import {
  BATCH4_CONTROL_CLASSIFICATIONS,
  BATCH4_FORTY_EIGHT,
  assertBatch4FortyEightHonesty,
  batch4HonestyStatusCounts,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch4-control-classification";
import { BATCH4_INPUT_ADAPTER_DEFS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch4-adapters";
import {
  STAGE150_BATCH4_FOUNDATION_SCAFFOLDS,
  STAGE150_BATCH4_HANDLERS,
  buildBatch4ContractResolutionAudit,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch4-registry";
import { buildBatch4ControlDenominators } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch4-denominators";
import {
  EVIDENCE_RETENTION_POLICY,
  projectEvidenceSizes,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/evidence-retention";
import {
  buildRetentionReceipt,
  reproduceInterruptedResumeIdentity,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/evidence-retention-writer";
import { STAGE150_PACKET_LOCAL_HANDLERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { STAGE150_INPUT_ADAPTERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/input-adapters";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";

const ROOT = process.cwd();
const BASELINE = "da98277c3038b40b2408a7af6a41475e88b21e17";
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch4",
);
const DENOM_OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/denominator-readiness",
);

const BRAIN1_FILES = [
  "lib/criminal/strategy-fight-engine.ts",
  "lib/criminal/strategy-fight-engine-generators.ts",
  "lib/criminal/get-aggressive-defense.ts",
  "lib/criminal/strategy-battleboard.ts",
  "lib/criminal/strategy-routes.ts",
  "lib/criminal/bundle-truth-ledger.ts",
  "lib/criminal/bundle-material-normalizer.ts",
] as const;

const GUARDIAN_FILES = [
  "lib/criminal/source-truth-guardian/fingerprint.ts",
  "lib/criminal/source-truth-guardian/guardian.ts",
  "lib/criminal/source-truth-guardian/index.ts",
  "lib/criminal/source-truth-guardian/types.ts",
] as const;

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(path.join(dir, name), body, "utf8");
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
    return execSync(`git rev-parse ${ref}:${file}`, {
      encoding: "utf8",
      cwd: ROOT,
    }).trim();
  } catch {
    return null;
  }
}

function brain1GuardianBlobCompare(baseline: string, head: string) {
  const files = [...BRAIN1_FILES, ...GUARDIAN_FILES];
  const rows = files.map((p) => {
    const baselineBlobId = gitBlobId(baseline, p);
    const headBlobId = gitBlobId(head, p);
    return {
      path: p,
      family: (BRAIN1_FILES as readonly string[]).includes(p) ? "brain1" : "guardian",
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  const allUnchanged = rows.every((r) => r.blobUnchanged);
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology:
      "git rev-parse <baseline>:<exact-file> vs git rev-parse HEAD:<exact-file>. No directory/tree IDs; no working-tree bytes.",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1RowsUnchanged: rows.filter((r) => r.family === "brain1").every((r) => r.blobUnchanged),
    guardianRowsUnchanged: rows.filter((r) => r.family === "guardian").every((r) => r.blobUnchanged),
    brain1GuardianBlobUnchanged: allUnchanged,
    allUnchanged,
  };
}

function runRetentionReproduction() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "maa-b4-retention-"));
  const receipts = Array.from({ length: 12 }, (_, i) =>
    buildRetentionReceipt({
      receiptId: `rcpt-${String(i).padStart(4, "0")}`,
      ordinal: i,
      controlId: "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
      caseId: `case-${i}`,
      probeStatus: "not_exercised",
      namedControlExerciseStatus: "not_exercised",
      sha256Payload: sha(`payload-${i}`),
      emittedAtEpochMs: 1_700_000_000_000 + i,
    }),
  );
  const result = reproduceInterruptedResumeIdentity({
    workDir,
    receipts,
    interruptAfter: 5,
  });

  // Commit small index/summary under OUT; leave large regenerable under gitignored raw-receipts
  const rawDir = path.join(OUT, "raw-receipts");
  fs.mkdirSync(rawDir, { recursive: true });
  const demoPath = path.join(rawDir, "retention-demo-receipts.jsonl");
  // Copy clean output into regenerable dir for local inspection (gitignored)
  const cleanSrc = path.join(workDir, "clean-receipts.jsonl");
  if (fs.existsSync(cleanSrc)) {
    fs.copyFileSync(cleanSrc, demoPath);
  }

  const index = {
    schemaVersion: "maa-v2-retention-receipt-index@1.0.0",
    measurementKind: "measured_reproduction" as const,
    relativePath: "raw-receipts/retention-demo-receipts.jsonl",
    sha256: result.cleanSha256,
    byteLength: result.cleanByteLength,
    lineCount: result.lineCount,
    regenerable: true,
    gitPolicy: "gitignore_regenerate" as const,
    interruptResume: {
      interruptAfter: 5,
      resumedSha256: result.resumedSha256,
      byteIdentical: result.byteIdentical,
    },
  };
  writeJson(OUT, "retention-receipt-index.json", index);
  writeJson(OUT, "retention-reproduction-result.json", {
    schemaVersion: "maa-v2-retention-reproduction@1.0.0",
    ...result,
    workDirNote: "temp dir used for clean vs resume; demo JSONL copied to gitignored raw-receipts/",
  });
  return { ...result, index };
}

function changedFileManifest(baseline: string): {
  schemaVersion: string;
  baselineCommit: string;
  headCommit: string;
  note: string;
  paths: string[];
} {
  const head = headCommit();
  let paths: string[] = [];
  try {
    const out = execSync(`git diff --name-only ${baseline}`, {
      encoding: "utf8",
      cwd: ROOT,
    });
    const untracked = execSync("git ls-files --others --exclude-standard", {
      encoding: "utf8",
      cwd: ROOT,
    });
    paths = [...out.split(/\r?\n/), ...untracked.split(/\r?\n/)]
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (p) =>
          p.includes("stage150") ||
          p.includes("batch4") ||
          p.includes("evidence-retention") ||
          p.includes("eld/") ||
          p.includes("denominator-readiness") ||
          p.includes("maa-v2-stage150-batch4") ||
          p.includes(".gitignore"),
      )
      .sort();
    paths = [...new Set(paths)];
  } catch {
    paths = [];
  }
  return {
    schemaVersion: "maa-v2-batch4-changed-file-manifest@1.0.0",
    baselineCommit: baseline,
    headCommit: head,
    note: "Working-tree paths related to Batch-4 honesty remediation (uncommitted).",
    paths,
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  assertBatch4FortyEightHonesty();
  if (STAGE150_BATCH4_HANDLERS.length !== 0) {
    throw new Error("Batch-4 must not register packet-local handlers after honesty remediation");
  }
  if (STAGE150_BATCH4_FOUNDATION_SCAFFOLDS.length !== BATCH4_SELECTED.length) {
    throw new Error("Batch4 scaffold/selection mismatch");
  }

  const honestyCounts = batch4HonestyStatusCounts();
  const matrixBefore = {
    partially_implemented: 106,
    specified_not_implemented: 55,
    implemented: 0,
  };
  const matrix = buildStage150ImplementationCapabilityMatrix();
  const denominators = buildBatch4ControlDenominators();
  const sizeProjections = projectEvidenceSizes({
    stage150Cases: 150,
    stage150Controls: matrix.totals.stage150ControlCount,
  });
  const dispositionCounts = batch4DispositionCounts();
  const contractAudit = buildBatch4ContractResolutionAudit();
  const retentionRepro = runRetentionReproduction();
  const blobCompare = brain1GuardianBlobCompare(BASELINE, head);
  const manifest = changedFileManifest(BASELINE);

  writeJson(OUT, "batch4-control-classification.json", {
    schemaVersion: "batch4-control-classification@1.0.0",
    baselineCommit: BASELINE,
    headCommit: head,
    counts: honestyCounts,
    fortyEightCount: BATCH4_FORTY_EIGHT.length,
    realDetectorCount: honestyCounts.partially_implemented_detector,
    adapterFoundationOnlyCount: honestyCounts.adapter_foundation_only,
    sniOrDeferredCount:
      honestyCounts.specified_not_implemented + honestyCounts.deferred_stage300,
    classifications: BATCH4_CONTROL_CLASSIFICATIONS,
  });

  writeJson(OUT, "batch4-disposition-of-55.json", {
    schemaVersion: "stage150-batch4-disposition@1.1.0",
    baselineCommit: BASELINE,
    headCommit: head,
    note: "implementInBatch4 means adapter foundation targeted — see classification for honesty status",
    counts: dispositionCounts,
    selectedCount: BATCH4_SELECTED.length,
    remainingSniCount: BATCH4_REMAINING_SNI.length,
    honestyCounts,
    dispositions: BATCH4_DISPOSITIONS,
  });

  writeJson(OUT, "batch4-selected.json", {
    schemaVersion: "stage150-batch4-selected@1.1.0",
    baselineCommit: BASELINE,
    count: BATCH4_SELECTED.length,
    honesty: "adapter_foundation_only",
    controls: BATCH4_SELECTED,
    remainingSni: BATCH4_REMAINING_SNI,
  });

  writeJson(OUT, "batch4-adapters.json", {
    schemaVersion: "stage150-batch4-adapters@1.1.0",
    baselineCommit: BASELINE,
    adapters: BATCH4_INPUT_ADAPTER_DEFS,
    stage150InputAdapters: STAGE150_INPUT_ADAPTERS,
    rule: "Missing evidence → not_exercised. Never invent ESA inputs or PASS. Adapter ≠ detector.",
  });

  writeJson(OUT, "batch4-foundation-scaffolds.json", {
    schemaVersion: "stage150-batch4-foundation-scaffolds@1.0.0",
    scaffolds: STAGE150_BATCH4_FOUNDATION_SCAFFOLDS,
  });

  writeJson(OUT, "batch4-contract-resolution-audit.json", contractAudit);

  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    schemaVersion: "stage150-implementation-totals@1.4.0",
    baselineCommit: BASELINE,
    before: matrixBefore,
    after: matrix.totals,
    packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    batch4FoundationScaffolds: STAGE150_BATCH4_FOUNDATION_SCAFFOLDS.length,
    batch4RegisteredAsPartialHandlers: STAGE150_BATCH4_HANDLERS.length,
    remainingSni: matrix.totals.specified_not_implemented,
    note: "Batch-4 honesty remediation: 0 Batch-4 partials. Matrix returns to Batch-3 totals (106 partial / 55 SNI).",
  });

  writeJson(OUT, "batch4-control-denominators.json", denominators);
  writeJson(DENOM_OUT, "batch4-control-denominators.json", denominators);
  writeJson(DENOM_OUT, "eligibility-vs-denominator-matrix.json", {
    schemaVersion: "eligibility-vs-denominator-matrix@2.0.0",
    baselineCommit: BASELINE,
    caseSelectionForbidden: true,
    counts: denominators.counts,
    approvedForSelectionCount: denominators.approvedForSelectionCount,
    note: "No APPROVED_FOR_SELECTION in Batch-4 remediation. Stage-150 case selection not performed.",
  });

  writeJson(OUT, "evidence-retention-policy.json", EVIDENCE_RETENTION_POLICY);
  writeJson(OUT, "evidence-size-projections.json", {
    schemaVersion: "maa-v2-evidence-size-projections@1.1.0",
    baselineCommit: BASELINE,
    measurementKind: "estimate",
    projections: sizeProjections,
    batch3ObservedMonolithicReceiptsMiB: 76.9,
    note: "ESTIMATES only — assumptions documented per row. Not measured Stage-150/300/3000 output. Batch-4 does not emit/commit monolithic receipt JSON.",
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.4.0",
    baselineCommit: BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    reasons: [
      `${honestyCounts.adapter_foundation_only} Batch-4 controls are adapter_foundation_only (0 real detectors)`,
      `${honestyCounts.deferred_stage300} controls deferred_stage300`,
      "No control APPROVED_FOR_SELECTION",
      "Contract IDs for Batch-4 scaffolds unresolved",
      "Stage-150 case selection not performed",
      "partially_implemented never counts as fully exercised",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: false,
      denominatorReadinessComplete: false,
      adapterReadinessComplete: false,
      receiptValidationComplete: false,
      contractReadinessComplete: false,
      relationshipComplete: true,
      protectedAssetsPreserved: blobCompare.brain1GuardianBlobUnchanged,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);
  writeJson(OUT, "changed-file-manifest.json", manifest);

  let tscOk = true;
  let tscExcerpt = "";
  let stage150Errs = 0;
  try {
    tscExcerpt = execSync("npx tsc --noEmit", {
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
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    schemaVersion: "stage150-typescript-delta@1.0.0",
    baselineCommit: BASELINE,
    stage150PathErrors: stage150Errs,
    note: "Repo-wide tsc may be non-zero on unrelated paths; Batch-4 requires stage150 path errors = 0.",
  });

  const stop = {
    schemaVersion: "maa-v2-stage150-batch4-stop@2.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Batch 4 Honesty Remediation",
    status: "STAGE150_BATCH4_HONESTY_REMEDIATION_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BASELINE,
    headCommit: head,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    honesty: {
      counts: honestyCounts,
      realDetectorCount: honestyCounts.partially_implemented_detector,
      adapterFoundationOnlyCount: honestyCounts.adapter_foundation_only,
      sniOrDeferredCount:
        honestyCounts.specified_not_implemented + honestyCounts.deferred_stage300,
      fortyEight: BATCH4_FORTY_EIGHT.map((c) => ({
        controlId: c.controlId,
        status: c.status,
        denominatorUnit: c.denominatorUnit,
        reason: c.reason,
      })),
    },
    implementationTotals: {
      before: matrixBefore,
      after: {
        partially_implemented: matrix.totals.partially_implemented,
        specified_not_implemented: matrix.totals.specified_not_implemented,
        implemented: matrix.totals.implemented,
      },
      packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    },
    dispositionCounts,
    selectedCount: BATCH4_SELECTED.length,
    remainingSni: BATCH4_REMAINING_SNI,
    adaptersAdded: BATCH4_INPUT_ADAPTER_DEFS.map((a) => a.adapterId),
    denominators: {
      counts: denominators.counts,
      approvedForSelectionCount: denominators.approvedForSelectionCount,
      approvedWithZeroEligibleForbidden: true,
    },
    contractResolutionAudit: {
      allUnresolved: contractAudit.allUnresolved,
      scaffoldCount: contractAudit.scaffoldCount,
    },
    sizeProjections: {
      measurementKind: "estimate",
      projections: sizeProjections,
    },
    retention: {
      schemaVersion: EVIDENCE_RETENTION_POLICY.schemaVersion,
      gitignoreGlobs: EVIDENCE_RETENTION_POLICY.gitignoreGlobs,
      reproduction: {
        byteIdentical: retentionRepro.byteIdentical,
        cleanSha256: retentionRepro.cleanSha256,
        resumedSha256: retentionRepro.resumedSha256,
        lineCount: retentionRepro.lineCount,
      },
    },
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      brain1RowsUnchanged: blobCompare.brain1RowsUnchanged,
      guardianRowsUnchanged: blobCompare.guardianRowsUnchanged,
      methodology: blobCompare.methodology,
      rows: blobCompare.rows,
    },
    changedFileManifest: manifest,
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    blockers: [
      "0 Batch-4 partially_implemented_detector; 48 adapter_foundation_only; 7 deferred_stage300",
      "0 APPROVED_FOR_SELECTION denominators",
      "Batch-4 claimed contract IDs unresolved",
      "Stage-150 sample selection and execution gates false",
      "No programme PASS",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);
  writeJson(DENOM_OUT, "STOP-FOR-CODEX-REVIEW.json", {
    ...stop,
    title: "STOP FOR CODEX REVIEW — Denominator readiness after Batch 4 honesty remediation",
  });

  console.log(
    JSON.stringify(
      {
        out: OUT,
        honestyCounts,
        after: matrix.totals,
        packetLocal: STAGE150_PACKET_LOCAL_HANDLERS.length,
        retentionByteIdentical: retentionRepro.byteIdentical,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
        gates: {
          sample: gate.stage150SampleSelectionAllowed,
          exec: gate.stage150ExecutionAllowed,
          programmePass: gate.programmePassSupported,
        },
        tscStage150Errors: stage150Errs,
      },
      null,
      2,
    ),
  );
  process.exit(tscOk || stage150Errs === 0 ? 0 : 1);
}

main();
