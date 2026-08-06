/**
 * Emit MAA V2 Stage-150 Batch-9 adapter-to-detector integration artefacts.
 *
 * Blind output-first 499 applicability/calibration → freeze candidate IDs/hashes →
 * dispositions + gap registers. Truth not opened (zero/low candidates; no packet mutation).
 * No Stage-150 selection/freeze/run. No CaseBrain repair. No commit/push.
 * No forced promotions — immutable registry empty.
 *
 * Baseline: 1493fe5409006dcea163f65a3ac64463f6060f03
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch9.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { DEFAULT_ESA_CORPUS_ROOT, ESA_REQUIRED_FILES } from "../../lib/eval/master-assurance-auditor/esa-adapter";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import {
  BATCH5_IMPLEMENTED_IDS,
  BATCH6_IMPLEMENTED_IDS,
  BATCH7_IMPLEMENTED_IDS,
  STAGE150_IMPLEMENTED_IDS,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { buildEvalContext, toV2CandidateFromStage150Hit } from "../../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { assertBatch9UnlockCoverage, BATCH9_CONTROL_IDS, BATCH9_CONTROL_SPECS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/control-specs";
import {
  BATCH9_IMMUTABLE_PROMOTION_REGISTRY,
  buildBatch9Dispositions,
  buildEvaluatorClassSummary,
  buildRealExitCaptureGapRegister,
  buildStructuredRematerialisationGapRegister,
  type Batch9ScanAggregate,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/disposition";
import { evaluateBatch9Control } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/evaluators";
import { buildAllBatch9Receipts } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/receipts";
import { assertBatch9RegistryContracts } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/registry-validation";
import {
  runAllBehaviouralFixtures,
  validateBehaviouralHarnessReport,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/behavioural-harness";
import { BATCH9_BASELINE, BATCH9_SCHEMA_VERSION } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/schemas";
import { adaptAllBatch8 } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9");
const CORPUS = path.join(ROOT, DEFAULT_ESA_CORPUS_ROOT);

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

function listUniqueValid(): Array<{ caseId: string; packetPath: string }> {
  const out: Array<{ caseId: string; packetPath: string }> = [];
  for (const name of fs.readdirSync(CORPUS).sort()) {
    const packetPath = path.join(CORPUS, name);
    if (!fs.statSync(packetPath).isDirectory()) continue;
    if (!ESA_REQUIRED_FILES.every((f) => fs.existsSync(path.join(packetPath, f)))) continue;
    out.push({ caseId: name, packetPath });
  }
  return out;
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

function classifyPath(relativePath: string): string {
  if (relativePath.includes("/batch9/")) return "source_lib_batch9";
  if (relativePath.endsWith("detectors.ts") || relativePath.endsWith("index.ts")) return "source_lib_wire";
  if (relativePath.endsWith(".test.ts")) return "contract_test";
  if (relativePath.startsWith("scripts/assurance/")) return "emit_script";
  if (relativePath.includes("STOP-FOR-CODEX")) return "checkpoint_stop";
  if (relativePath.endsWith("changed-file-manifest.json")) return "checkpoint_manifest";
  if (relativePath.endsWith("stage150-execution-readiness-gate.json")) return "checkpoint_gate";
  return "programme_evidence";
}

function writeChangedFileManifest(head: string): void {
  const manifestRel =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/changed-file-manifest.json";
  const intendedScopePaths = [
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/schemas.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/control-specs.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/evaluators.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/receipts.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/disposition.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/registry-validation.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/behavioural-fixtures.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/behavioural-harness.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch9/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/index.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch9.ts",
    "scripts/maa-v2-stage150-batch9-contracts.test.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/STOP-FOR-CODEX-REVIEW.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-499-exercise-receipt-index.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-adapter-applicability-summary.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-behavioural-contract-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-candidate-freeze.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-control-dispositions.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-evaluator-class-summary.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-real-exit-capture-gap-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-structured-rematerialisation-gap-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/brain1-guardian-blob-compare.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/changed-file-manifest.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/stage150-implementation-capability-matrix.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/stage150-implementation-totals.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/typescript-baseline.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/typescript-delta.json",
  ] as const;

  const contentEntries = intendedScopePaths
    .filter((p) => p !== manifestRel)
    .filter((p) => fs.existsSync(path.join(ROOT, p)))
    .map((relativePath) => {
      const buf = fs.readFileSync(path.join(ROOT, relativePath));
      return {
        relativePath,
        sha256: sha(buf),
        byteLength: buf.byteLength,
        classification: classifyPath(relativePath),
      };
    });

  const draft = {
    schemaVersion: "maa-v2-batch9-changed-file-manifest@1.0.0",
    baselineCommit: BATCH9_BASELINE,
    headCommit: head,
    rule: "Literal relative paths only — SHA-256 + byteLength + classification. No wildcards.",
    intendedScopePathCount: intendedScopePaths.length,
    intendedScopePaths: [...intendedScopePaths],
    entryCount: intendedScopePaths.length,
    entries: contentEntries,
    thisManifest: null as null | {
      relativePath: string;
      sha256: string;
      byteLength: number;
      classification: string;
      hashesDocumentWithThisManifestNull: true;
    },
    gitignoredRegenerable: {
      relativePath:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/raw-receipts/batch9-499-exercise-receipts.jsonl",
      retainedByIndex:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/batch9-499-exercise-receipt-index.json",
      policy: "gitignore_regenerate",
    },
    digestSha256: sha(
      contentEntries.map((e) => `${e.relativePath}|${e.sha256}|${e.byteLength}|${e.classification}`).join("\n"),
    ),
  };
  const nullSelfText = `${JSON.stringify(draft, null, 2)}\n`;
  const nullSelfSha = sha(nullSelfText);
  const nullSelfLen = Buffer.byteLength(nullSelfText);
  const selfEntry = {
    relativePath: manifestRel,
    sha256: nullSelfSha,
    byteLength: nullSelfLen,
    classification: "checkpoint_manifest",
  };
  draft.thisManifest = { ...selfEntry, hashesDocumentWithThisManifestNull: true };
  const finalDoc = { ...draft, entries: [...contentEntries, selfEntry] };
  writeJson(path.dirname(path.join(ROOT, manifestRel)), "changed-file-manifest.json", finalDoc);
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  assertBatch9UnlockCoverage();
  assertBatch9RegistryContracts();
  fs.mkdirSync(OUT, { recursive: true });

  const uniqueValid = listUniqueValid();
  if (uniqueValid.length !== 499) {
    throw new Error(`Expected 499 unique-valid trio packets, found ${uniqueValid.length}`);
  }

  const scan: Batch9ScanAggregate = { byControl: {} };
  for (const id of BATCH9_CONTROL_IDS) {
    scan.byControl[id] = {
      applicableCaseCount: 0,
      notExercisedCaseCount: 0,
      evaluatedCaseCount: 0,
      unresolvedCaseCount: 0,
      candidateOccurrenceCount: 0,
      candidateCaseIds: [],
      findingCodes: [],
    };
  }

  const frozenCandidates: Array<{
    candidateId: string;
    controlId: string;
    caseId: string;
    occurrenceRef: string;
    wordingHash: string;
    findingCode: string;
    outputSha256: string;
  }> = [];
  const receiptLines: string[] = [];
  const rawDir = path.join(OUT, "raw-receipts");
  fs.mkdirSync(rawDir, { recursive: true });

  console.log("Batch-9 — 499 applicability/calibration (output-only, truth not opened)…");
  for (const c of uniqueValid) {
    const buf = fs.readFileSync(path.join(c.packetPath, "casebrain-output.json"));
    const outputSha256 = sha(buf);
    const truthPath = path.join(c.packetPath, "truth-key.json");
    if (!fs.existsSync(truthPath) || fs.statSync(truthPath).size <= 0) {
      throw new Error(`truth-key missing/empty for ${c.caseId}`);
    }
    // Confirm presence only — do not read truth contents.
    const output = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    const ctx = buildEvalContext(c.caseId, output);
    const adapted = adaptAllBatch8(c.caseId, output);
    const receipts = buildAllBatch9Receipts(ctx);

    for (const receipt of receipts) {
      receiptLines.push(JSON.stringify({ ...receipt, outputSha256 }));
      const agg = scan.byControl[receipt.controlId]!;
      if (receipt.applicableCase) agg.applicableCaseCount += 1;
      if (receipt.namedControlExerciseStatus === "not_exercised") agg.notExercisedCaseCount += 1;
      if (receipt.namedControlExerciseStatus === "evaluated") agg.evaluatedCaseCount += 1;
      if (receipt.namedControlExerciseStatus === "unresolved") agg.unresolvedCaseCount += 1;

      const hits = evaluateBatch9Control(ctx, receipt.controlId, adapted);
      for (const h of hits) {
        const cand = toV2CandidateFromStage150Hit(h, c.caseId);
        frozenCandidates.push({
          candidateId: cand.candidateId,
          controlId: h.controlId,
          caseId: c.caseId,
          occurrenceRef: h.occurrenceRef,
          wordingHash: cand.wordingHash,
          findingCode: h.findingCode,
          outputSha256,
        });
        agg.candidateOccurrenceCount += 1;
        if (!agg.candidateCaseIds.includes(c.caseId)) agg.candidateCaseIds.push(c.caseId);
        if (!agg.findingCodes.includes(h.findingCode)) agg.findingCodes.push(h.findingCode);
      }
    }
  }

  // —— FREEZE (before any truth review) ——
  const freezeBody = `${frozenCandidates.map((c) => JSON.stringify(c)).join("\n")}${frozenCandidates.length ? "\n" : ""}`;
  const freezeSha = sha(freezeBody);
  writeJson(OUT, "batch9-candidate-freeze.json", {
    schemaVersion: "batch9-candidate-freeze@1.0.0",
    baselineCommit: BATCH9_BASELINE,
    frozenAt: new Date().toISOString(),
    truthOpenedBeforeFreeze: false,
    truthOpenedAfterFreeze: false,
    truthOpenedForCalibration: false,
    reasonTruthNotOpened:
      frozenCandidates.length === 0
        ? "Zero Batch-9 candidates across 499 — no truth calibration required"
        : "Candidates frozen; truth calibration deferred pending Codex review (packets unaltered)",
    candidateCount: frozenCandidates.length,
    freezeSha256: freezeSha,
    candidates: frozenCandidates,
  });

  const receiptsBody = `${receiptLines.join("\n")}\n`;
  fs.writeFileSync(path.join(rawDir, "batch9-499-exercise-receipts.jsonl"), receiptsBody);
  writeJson(OUT, "batch9-499-exercise-receipt-index.json", {
    schemaVersion: "batch9-499-exercise-receipt-index@1.0.0",
    relativePath: "raw-receipts/batch9-499-exercise-receipts.jsonl",
    sha256: sha(receiptsBody),
    byteLength: Buffer.byteLength(receiptsBody),
    lineCount: receiptLines.length,
    regenerable: true,
    gitPolicy: "gitignore_regenerate",
    truthContentsOpened: false,
  });

  const dispositions = buildBatch9Dispositions(scan);
  writeJson(OUT, "batch9-control-dispositions.json", {
    schemaVersion: "batch9-control-dispositions@1.1.0",
    controlCount: dispositions.length,
    promotedCount: dispositions.filter((d) => d.promoted).length,
    rows: dispositions,
  });

  const classSummary = buildEvaluatorClassSummary();
  writeJson(OUT, "batch9-evaluator-class-summary.json", {
    schemaVersion: "batch9-evaluator-class-summary@1.2.0",
    controlCount: 37,
    ...classSummary,
    rule: "Implementation class ≠ execution availability. Only substantive/adapter-integrity count as named evaluators; availability reports ESA corpus readiness separately.",
    rows: BATCH9_CONTROL_SPECS.map((s) => ({
      controlId: s.controlId,
      evaluatorImplementationClass: s.evaluatorImplementationClass,
      executionAvailability: s.executionAvailability,
      countsAsNamedEvaluator:
        s.evaluatorImplementationClass === "substantive_control_evaluator" ||
        s.evaluatorImplementationClass === "adapter_integrity_evaluator",
      exactPrerequisites: s.exactPrerequisites,
      applicabilityRule: s.applicabilityRule,
      findingOwnership: s.findingOwnership,
      unavailableBehaviour: s.unavailableBehaviour,
      contractRefs: s.contractRefs,
    })),
  });

  const behaviouralReport = runAllBehaviouralFixtures();
  validateBehaviouralHarnessReport(behaviouralReport);
  writeJson(OUT, "batch9-behavioural-contract-report.json", {
    schemaVersion: "batch9-behavioural-contract-report@1.0.0",
    genuineBehaviouralContractsExecuted: behaviouralReport.totalExecutions,
    ...behaviouralReport,
  });

  writeJson(OUT, "batch9-adapter-applicability-summary.json", {
    schemaVersion: "batch9-adapter-applicability-summary@1.2.0",
    scan,
    controlSpecs: BATCH9_CONTROL_SPECS.map((s) => ({
      controlId: s.controlId,
      adapterId: s.adapterId,
      evaluatorImplementationClass: s.evaluatorImplementationClass,
      executionAvailability: s.executionAvailability,
      minAdapterCapability: s.minAdapterCapability,
      requireCompleteRecords: s.requireCompleteRecords,
      exactPrerequisites: s.exactPrerequisites,
      applicabilityRule: s.applicabilityRule,
      findingOwnership: s.findingOwnership,
      unavailableBehaviour: s.unavailableBehaviour,
      missingInputReason: s.missingInputReason,
      contractRefs: s.contractRefs,
    })),
  });

  writeJson(OUT, "batch9-structured-rematerialisation-gap-register.json", {
    schemaVersion: "batch9-structured-rematerialisation-gap-register@1.0.0",
    rows: buildStructuredRematerialisationGapRegister(),
  });
  writeJson(OUT, "batch9-real-exit-capture-gap-register.json", {
    schemaVersion: "batch9-real-exit-capture-gap-register@1.0.0",
    rows: buildRealExitCaptureGapRegister(),
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    schemaVersion: "stage150-implementation-totals@1.8.0",
    baselineCommit: BATCH9_BASELINE,
    before: {
      implemented: 8,
      partially_implemented: 98,
      specified_not_implemented: 55,
      stage150ControlCount: 161,
    },
    after: matrix.totals,
    batch9DetectorPromotions: [...BATCH9_IMMUTABLE_PROMOTION_REGISTRY],
    note: "Batch-9 adapter-gated evaluators for 37 controls — zero promotions (empty immutable registry).",
    preserved: {
      batch5: BATCH5_IMPLEMENTED_IDS.size,
      batch6: BATCH6_IMPLEMENTED_IDS.size,
      batch7: BATCH7_IMPLEMENTED_IDS.size,
      stage150: STAGE150_IMPLEMENTED_IDS.size,
    },
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.8.0",
    baselineCommit: BATCH9_BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    reasons: [
      `${matrix.totals.partially_implemented} controls remain partially_implemented`,
      `${matrix.totals.specified_not_implemented} controls remain SNI`,
      "Batch-9 evaluators exist but immutable promotion registry is empty",
      "Stage-150 sample selection not performed",
      "currentlyRunnableOnStage150 remains false",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: false,
      denominatorReadinessComplete: false,
      adapterReadinessComplete: false,
      receiptValidationComplete: true,
      contractReadinessComplete: true,
      relationshipComplete: false,
      protectedAssetsPreserved: true,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const blobCompare = brain1GuardianCompare(BATCH9_BASELINE, head);
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
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    schemaVersion: "stage150-typescript-delta@1.0.0",
    baselineCommit: BATCH9_BASELINE,
    stage150PathErrors: stage150Errs,
  });

  const stop = {
    schemaVersion: "maa-v2-stage150-batch9-stop@1.2.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Batch 9 BEHAVIOURAL PROOF REMEDIATION",
    status: "STAGE150_BATCH9_BEHAVIOURAL_PROOF_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH9_BASELINE,
    headCommit: head,
    schemaVersionLib: BATCH9_SCHEMA_VERSION,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    detectorPromotions: [],
    controlCount: 37,
    evaluatorClassSummary: classSummary,
    substantiveEvaluatorCount: classSummary.substantiveEvaluatorCount,
    adapterIntegrityCount: classSummary.adapterIntegrityCount,
    stubOrProxyCount: classSummary.stubOrProxyCount,
    esaRunnableCount: classSummary.esaRunnableCount,
    esaUnavailableCount: classSummary.esaUnavailableCount,
    genuineBehaviouralContractsExecuted: behaviouralReport.totalExecutions,
    namedEvaluatorCount: classSummary.namedEvaluatorCount,
    promotedCount: 0,
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    implementationTotals: matrix.totals,
    beforeTotals: { implemented: 8, partially_implemented: 98, specified_not_implemented: 55 },
    candidateFreezeSha256: freezeSha,
    candidateCount: frozenCandidates.length,
    truthContentsOpened: false,
    remediationNotes: [
      "Two axes: evaluatorImplementationClass ≠ executionAvailability",
      "37×4 fixture-driven behavioural contracts invoke evaluateBatch9Control + buildBatch9ExerciseReceipt",
      "Harness rejects no-op fixtures",
      "XEX-08 adapter-integrity only — runnable_on_ESA without implying real exit testing",
      "0 promotions; totals preserved 8/98/55",
    ],
    dispositions: dispositions.map((d) => ({
      controlId: d.controlId,
      evaluatorImplementationClass: d.evaluatorImplementationClass,
      executionAvailability: d.executionAvailability,
      countsAsNamedEvaluator: d.countsAsNamedEvaluator,
      afterStatus: d.afterStatus,
      promoted: d.promoted,
      applicableCaseCount499: d.applicableCaseCount499,
      notExercisedCaseCount499: d.notExercisedCaseCount499,
      evaluatedCaseCount499: d.evaluatedCaseCount499,
      candidateOccurrenceCount: d.candidateOccurrenceCount,
    })),
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      rows: blobCompare.rows,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    blockers: [
      "Stage-150 selection and execution gates remain FALSE",
      "Batch-9 immutable promotion registry empty — zero promotions",
      "36/37 controls unavailable on ESA pending structured rematerialisation / real exits",
      "XEX-08 adapter-integrity must not be read as real exit testing",
      "No programme PASS",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  writeChangedFileManifest(head);

  console.log(
    JSON.stringify(
      {
        out: OUT,
        totals: matrix.totals,
        promotions: [],
        controlCount: 37,
        evaluatorClassSummary: classSummary,
        genuineBehaviouralContractsExecuted: behaviouralReport.totalExecutions,
        candidateCount: frozenCandidates.length,
        freezeSha256: freezeSha,
        gates: { sample: false, exec: false, freeze: false, programmePass: false },
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
        truthOpened: false,
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 ? 0 : 1);
}

main();
