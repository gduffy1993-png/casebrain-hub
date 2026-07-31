/**
 * Emit Stage-300 Batch-A six-evaluator artefacts + regenerate compact Batch-A indexes.
 * Keeps adapter work; adds substantive evaluators + blind 120 calibration.
 * Stop uncommitted. No CaseBrain changes. No Stage-300 freeze/run. No promotions.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-batch-a-six-evaluators.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import type { PopulationFreezeReceipt } from "../../lib/eval/master-assurance-auditor/v2/stage150/calibration/population-freeze";
import {
  BATCH_A_ADAPTER_IDS,
  BATCH_A_ARTIFACT_ROOT,
  BATCH_A_BASELINE,
  BATCH_A_SCHEMA_VERSION,
  CANDIDATE_FREEZE_SHA256,
  ORDERED_MEMBERSHIP_SHA256,
  buildAdapterRegistry,
  buildBeforeAfterMatrix,
  buildOwnershipDedupGraph,
  buildRemainingEssentialBlockerRegister,
  runTruthBlind120CapabilityScan,
  type BatchAAdapterId,
  type SixControlExerciseCounts,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/batch-a";
import {
  BATCH_A_CALIBRATION_ARTIFACT_SUBDIR,
  BATCH_A_EVAL_SCHEMA,
  BATCH_A_SIX_CONTROL_IDS,
  BATCH_A_SIX_SPECS,
  PINNED_LEGAL_STATE_CATEGORY_SET,
  calibrationArtifactRoot,
  openTruthAfterSixEvaluatorFreeze,
  runAllHarnessKinds,
  runBlindSixEvaluatorCalibration,
  type BatchASixControlId,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/batch-a/evaluators";

type LocalSixCounts = Record<
  BatchASixControlId,
  { eligible: number; partial: number; unavailable: number; candidateCount: number }
>;

const ROOT = process.cwd();
const OUT = path.join(ROOT, BATCH_A_ARTIFACT_ROOT);
const CAL = path.join(OUT, BATCH_A_CALIBRATION_ARTIFACT_SUBDIR);
const FROZEN_POPULATION_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json";
const FREEZE_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/freeze-receipt.json";
const CANDIDATE_FREEZE_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json";

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
    const workBlobId = execSync(`git hash-object ${p}`, { encoding: "utf8", cwd: ROOT }).trim();
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      workTreeBlobId: workBlobId,
      blobUnchanged:
        baselineBlobId != null &&
        headBlobId != null &&
        baselineBlobId === headBlobId &&
        baselineBlobId === workBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    }
  };
  walk(dir);
  return total;
}

function codeSizeBytes(paths: string[]): number {
  let total = 0;
  for (const p of paths) {
    const abs = path.join(ROOT, p);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) total += dirSizeBytes(abs);
    else total += fs.statSync(abs).size;
  }
  return total;
}

function changedFileManifest(head: string) {
  const out: Array<{ path: string; kind: "added" | "modified" | "untracked"; sha256: string | null }> =
    [];
  const prefixes = [
    "lib/eval/master-assurance-auditor/v2/stage300/batch-a",
    "scripts/assurance/emit-maa-v2-stage300-batch-a-structured-adapters.ts",
    "scripts/assurance/emit-maa-v2-stage300-batch-a-six-evaluators.ts",
    "scripts/maa-v2-stage300-batch-a-contracts.test.ts",
    "scripts/maa-v2-stage300-batch-a-six-evaluators-contracts.test.ts",
    ".gitignore",
    BATCH_A_ARTIFACT_ROOT,
  ];
  const seen = new Set<string>();
  const add = (rel: string, kind: "added" | "modified" | "untracked") => {
    const norm = rel.replace(/\\/g, "/");
    if (seen.has(norm)) return;
    // Skip regenerable raw receipt trees from commit-scope manifest listing note
    if (norm.includes("/120-packet-capability-receipts/")) return;
    if (norm.includes("/six-evaluator-calibration/raw-receipts/")) return;
    if (norm.includes("/six-evaluator-calibration/work/")) return;
    if (norm.endsWith("candidate-freeze.jsonl")) return;
    if (norm.endsWith("exercise-rows.jsonl")) return;
    if (norm.endsWith("disposition-ledger.jsonl")) return;
    if (norm.endsWith("truth-open-sequencing.jsonl")) return;
    seen.add(norm);
    const abs = path.join(ROOT, norm);
    out.push({
      path: norm,
      kind,
      sha256: fs.existsSync(abs) && fs.statSync(abs).isFile() ? sha(fs.readFileSync(abs)) : null,
    });
  };
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else add(path.relative(ROOT, full), "untracked");
    }
  };
  for (const pre of prefixes) {
    const abs = path.join(ROOT, pre);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) walk(abs);
    else add(pre, "untracked");
  }
  // Capture .gitignore modified via git if tracked
  try {
    const diff = execSync("git diff --name-only HEAD -- .gitignore", { encoding: "utf8", cwd: ROOT });
    if (diff.trim()) add(".gitignore", "modified");
  } catch {
    /* ignore */
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: "changed-file-manifest@1.1.0",
    baselineCommit: BATCH_A_BASELINE,
    headCommit: head,
    note: "Raw per-case receipts / jsonl ledgers gitignored — regenerable; hashes committed in indexes.",
    files: out,
    count: out.length,
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  fs.mkdirSync(CAL, { recursive: true });
  fs.mkdirSync(path.join(CAL, "raw-receipts"), { recursive: true });

  const freezeReceipt = JSON.parse(fs.readFileSync(path.join(ROOT, FREEZE_PATH), "utf8")) as {
    orderedMembershipSha256: string;
  };
  const freeze = JSON.parse(
    fs.readFileSync(path.join(ROOT, FROZEN_POPULATION_PATH), "utf8"),
  ) as PopulationFreezeReceipt;
  const candidateFreezePrior = JSON.parse(
    fs.readFileSync(path.join(ROOT, CANDIDATE_FREEZE_PATH), "utf8"),
  ) as { freezeSha256: string };

  if (freezeReceipt.orderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error("Freeze membership hash drift");
  }
  if (freeze.orderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error("Frozen population membership hash drift");
  }
  if (candidateFreezePrior.freezeSha256 !== CANDIDATE_FREEZE_SHA256) {
    throw new Error("Stage-150 candidate freeze hash drift");
  }

  // Contracts self-check (fixtures only)
  const harnessTraces = runAllHarnessKinds();
  writeJson(CAL, "fixture-harness-report.json", {
    schemaVersion: "stage300-batch-a-six-fixture-harness@1.0.0",
    executions: harnessTraces.length,
    note: "Fixtures prove behaviour only — not corpus calibration.",
    traces: harnessTraces,
  });

  // Six-control evaluator registry
  const evaluatorRegistry = {
    schemaVersion: "stage300-batch-a-six-evaluator-registry@1.0.0",
    batchAEvalSchema: BATCH_A_EVAL_SCHEMA,
    baselineCommit: BATCH_A_BASELINE,
    controlCount: 6,
    pinnedLegalStateCategorySet: [...PINNED_LEGAL_STATE_CATEGORY_SET],
    promotedToImmutableImplementedRegistry: false,
    specs: BATCH_A_SIX_SPECS,
  };
  writeJson(OUT, "six-control-evaluator-registry.json", evaluatorRegistry);

  console.log("Blind 120-packet six-evaluator calibration…");
  const blind = runBlindSixEvaluatorCalibration({ repoRoot: ROOT, freeze });

  const candidateBody =
    blind.candidates.map((c) => JSON.stringify(c)).join("\n") + (blind.candidates.length ? "\n" : "");
  fs.writeFileSync(path.join(CAL, "candidate-freeze.jsonl"), candidateBody, "utf8");
  const candidateFreezeSha256 = sha(candidateBody);

  const exerciseBody =
    blind.exerciseRows.map((r) => JSON.stringify(r)).join("\n") + (blind.exerciseRows.length ? "\n" : "");
  fs.writeFileSync(path.join(CAL, "exercise-rows.jsonl"), exerciseBody, "utf8");

  writeJson(CAL, "candidate-freeze-receipt.json", {
    schemaVersion: "stage300-batch-a-six-candidate-freeze@1.0.0",
    frozenAt: new Date().toISOString(),
    candidateCount: blind.candidates.length,
    freezeSha256: candidateFreezeSha256,
    exerciseRowsSha256: blind.exerciseRowsSha256,
    truthOpenedBeforeFreeze: false,
    scanned: blind.scanned,
    controlIds: [...BATCH_A_SIX_CONTROL_IDS],
  });

  // Per-control eligibility / exercise matrix (compact)
  const sixCounts = {} as LocalSixCounts;
  for (const id of BATCH_A_SIX_CONTROL_IDS) {
    sixCounts[id] = { eligible: 0, partial: 0, unavailable: 0, candidateCount: 0 };
  }
  for (const row of blind.exerciseRows) {
    sixCounts[row.controlId][row.capabilityStatus] += 1;
    sixCounts[row.controlId].candidateCount += row.candidateCount;
  }
  writeJson(OUT, "six-control-eligibility-exercise-matrix.json", {
    schemaVersion: "stage300-batch-a-six-eligibility-exercise-matrix@1.0.0",
    scanned: 120,
    projectionOnlyExcluded: 30,
    truthOpenedDuringBlind: false,
    byControl: sixCounts,
    namedExerciseTotals: {
      evaluated: blind.exerciseRows.filter((r) => r.namedControlExerciseStatus === "evaluated").length,
      unresolved: blind.exerciseRows.filter((r) => r.namedControlExerciseStatus === "unresolved").length,
      not_exercised: blind.exerciseRows.filter((r) => r.namedControlExerciseStatus === "not_exercised")
        .length,
    },
  });

  console.log("Opening truth after candidate freeze…");
  const truth = openTruthAfterSixEvaluatorFreeze({
    repoRoot: ROOT,
    freeze,
    exerciseRows: blind.exerciseRows,
    candidates: blind.candidates,
    candidateFreezeSha256,
  });

  const dispositionBody =
    truth.dispositionRows.map((r) => JSON.stringify(r)).join("\n") +
    (truth.dispositionRows.length ? "\n" : "");
  fs.writeFileSync(path.join(CAL, "disposition-ledger.jsonl"), dispositionBody, "utf8");
  const sequencingBody =
    truth.sequencingReceipts.map((r) => JSON.stringify(r)).join("\n") +
    (truth.sequencingReceipts.length ? "\n" : "");
  fs.writeFileSync(path.join(CAL, "truth-open-sequencing.jsonl"), sequencingBody, "utf8");

  writeJson(OUT, "calibration-disposition-ledger-summary.json", {
    schemaVersion: "stage300-batch-a-six-calibration-disposition-summary@1.0.0",
    candidateFreezeSha256,
    dispositionLedgerSha256: sha(dispositionBody),
    truthOpenSequencingSha256: sha(sequencingBody),
    candidateCount: blind.candidates.length,
    exerciseRowCount: blind.exerciseRows.length,
    truthContentsOpened: true,
    openedAfterCandidateFreeze: true,
    humanRatesAvailable: false,
    zeroCandidateMetricsForbidden: true,
    fpFnRecallClaims: false,
    dispositionTotals: truth.dispositionRows.reduce(
      (acc, r) => {
        const k = r.dispositionAfterTruth ?? "null";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  });

  writeJson(CAL, "truth-open-sequencing-receipt.json", {
    schemaVersion: "stage300-batch-a-six-truth-open-sequencing@1.0.0",
    openedAfterCandidateFreeze: true,
    candidateFreezeSha256,
    caseCount: truth.sequencingReceipts.length,
    sequencingSha256: sha(sequencingBody),
  });

  // Refresh adapter capability summary (compact) — keep prior scan behaviour
  console.log("Refreshing 120-packet adapter capability summary…");
  const { summary: adapterSummary } = runTruthBlind120CapabilityScan({ repoRoot: ROOT, freeze });
  writeJson(OUT, "120-packet-capability-summary.json", adapterSummary);
  // Do NOT rewrite 120 raw receipts in this unit — regenerable/gitignored; keep hash index if present
  writeJson(OUT, "120-packet-capability-receipt-index.json", {
    schemaVersion: "stage300-batch-a-120-receipt-index@1.1.0",
    count: 120,
    truthOpened: false,
    candidatesGenerated: false,
    projectionOnlyExcluded: 30,
    regenerable: true,
    gitignored: true,
    note: "Raw per-case receipts regenerable via emit-maa-v2-stage300-batch-a-structured-adapters.ts; not committed.",
  });

  const adapterEligibleCounts = {} as Record<
    BatchAAdapterId,
    { eligible: number; partial: number; unavailable: number }
  >;
  for (const id of BATCH_A_ADAPTER_IDS) {
    adapterEligibleCounts[id] = {
      eligible: adapterSummary.byAdapter[id].eligible,
      partial: adapterSummary.byAdapter[id].partial,
      unavailable: adapterSummary.byAdapter[id].unavailable,
    };
  }

  const beforeAfter = buildBeforeAfterMatrix({
    adapterEligibleCounts,
    sixControlExerciseCounts: sixCounts as unknown as SixControlExerciseCounts,
    sixEvaluatorsImplemented: true,
  });
  writeJson(OUT, "43-control-before-after-matrix.json", beforeAfter);

  const remaining = buildRemainingEssentialBlockerRegister({ beforeAfterRows: beforeAfter.rows });
  writeJson(OUT, "remaining-essential-blocker-register.json", remaining);

  writeJson(OUT, "batch-a-adapter-registry.json", buildAdapterRegistry());
  writeJson(OUT, "ownership-deduplication-graph.json", buildOwnershipDedupGraph());

  const regression = {
    schemaVersion: "stage300-batch-a-six-regression-report@1.0.0",
    stage150ImplementedRegistryUntouched: true,
    stage150FreezeHashesUnchanged: true,
    orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
    candidateFreezeSha256Stage150: CANDIDATE_FREEZE_SHA256,
    partialAdaptersNotUpgradedFromScaffolding: {
      evidence_unit_identity_with_aliases: adapterSummary.byAdapter.evidence_unit_identity_with_aliases,
      source_vs_compiled_page_binding: adapterSummary.byAdapter.source_vs_compiled_page_binding,
      chase_item_to_evidence_unit_edges: adapterSummary.byAdapter.chase_item_to_evidence_unit_edges,
      view_copy_export_api_pdf_composed_prose_capture:
        adapterSummary.byAdapter.view_copy_export_api_pdf_composed_prose_capture,
      note: "Remain partial unless complete required fields genuinely arise — not upgraded.",
    },
    sixControlsPromoted: false,
    brain1GuardianExpectedUnchanged: true,
  };
  writeJson(OUT, "regression-report.json", regression);

  const blob = brain1GuardianCompare(BATCH_A_BASELINE, head);
  writeJson(OUT, "brain1-guardian-blob-compare.json", blob);

  const codeBytes = codeSizeBytes([
    "lib/eval/master-assurance-auditor/v2/stage300/batch-a",
    "scripts/assurance/emit-maa-v2-stage300-batch-a-six-evaluators.ts",
    "scripts/maa-v2-stage300-batch-a-six-evaluators-contracts.test.ts",
    "scripts/maa-v2-stage300-batch-a-contracts.test.ts",
    "scripts/assurance/emit-maa-v2-stage300-batch-a-structured-adapters.ts",
  ]);
  const generatedBytes =
    dirSizeBytes(path.join(OUT, "120-packet-capability-receipts")) +
    dirSizeBytes(path.join(CAL, "raw-receipts")) +
    (fs.existsSync(path.join(CAL, "candidate-freeze.jsonl"))
      ? fs.statSync(path.join(CAL, "candidate-freeze.jsonl")).size
      : 0) +
    (fs.existsSync(path.join(CAL, "exercise-rows.jsonl"))
      ? fs.statSync(path.join(CAL, "exercise-rows.jsonl")).size
      : 0) +
    (fs.existsSync(path.join(CAL, "disposition-ledger.jsonl"))
      ? fs.statSync(path.join(CAL, "disposition-ledger.jsonl")).size
      : 0) +
    (fs.existsSync(path.join(CAL, "truth-open-sequencing.jsonl"))
      ? fs.statSync(path.join(CAL, "truth-open-sequencing.jsonl")).size
      : 0);

  writeJson(OUT, "retention-size-report.json", {
    schemaVersion: "stage300-batch-a-retention-size@1.0.0",
    codeAndContractsBytes: codeBytes,
    generatedEvidenceBytes: generatedBytes,
    codeVersusGeneratedRatio:
      generatedBytes === 0 ? null : Number((codeBytes / generatedBytes).toFixed(4)),
    commitScope:
      "code, contracts, compact indexes/summaries, hash receipts — raw per-case receipts gitignored/regenerable",
    gitignoredPaths: [
      `${BATCH_A_ARTIFACT_ROOT}/120-packet-capability-receipts/`,
      `${BATCH_A_ARTIFACT_ROOT}/six-evaluator-calibration/raw-receipts/`,
      `${BATCH_A_ARTIFACT_ROOT}/six-evaluator-calibration/candidate-freeze.jsonl`,
      `${BATCH_A_ARTIFACT_ROOT}/six-evaluator-calibration/exercise-rows.jsonl`,
      `${BATCH_A_ARTIFACT_ROOT}/six-evaluator-calibration/disposition-ledger.jsonl`,
      `${BATCH_A_ARTIFACT_ROOT}/six-evaluator-calibration/truth-open-sequencing.jsonl`,
    ],
  });

  const manifest = changedFileManifest(head);
  writeJson(OUT, "changed-file-manifest.json", manifest);

  const stop = {
    schemaVersion: "maa-v2-stage300-batch-a-six-evaluators-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — STAGE-300 BATCH-A SIX SUBSTANTIVE EVALUATORS",
    status: "STAGE300_BATCH_A_SIX_EVALUATORS_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH_A_BASELINE,
    headCommit: head,
    batchASchemaVersion: BATCH_A_SCHEMA_VERSION,
    batchAEvalSchema: BATCH_A_EVAL_SCHEMA,
    orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
    candidateFreezeSha256Stage150: CANDIDATE_FREEZE_SHA256,
    sixEvaluatorCandidateFreezeSha256: candidateFreezeSha256,
    freezeHashesVerified: true,
    freezeHashStage50: FREEZE_HASH_STAGE50,
    engineeringJobs: {
      sharedAdapters: 6,
      substantiveEvaluators: 6,
      note: "Do not double-count shared adapters as completed controls.",
    },
    essentialControls: 43,
    sixControls: [...BATCH_A_SIX_CONTROL_IDS],
    fullyImplementedEssentialControls: 0,
    promotedToImmutableImplementedRegistry: false,
    afterStatusTotals: beforeAfter.afterStatusTotals,
    sixControlExercise: sixCounts,
    candidateCount: blind.candidates.length,
    humanRatesAvailable: false,
    fpFnRecallClaims: false,
    stage300CorpusGenerationAllowed: false,
    stage300PopulationAcceptanceAllowed: false,
    stage300BlindFreezeAllowed: false,
    stage300CalibrationExecutionAllowed: false,
    stage300RemediationRerunAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    stage300Generated: false,
    stage300Frozen: false,
    stage300Run: false,
    applicationRepaired: false,
    caseGeneration: false,
    detectorsPromoted: false,
    brain1GuardianBlobUnchanged: blob.brain1GuardianBlobUnchanged,
    committed: false,
    pushed: false,
    artefacts: [
      "six-control-evaluator-registry.json",
      "six-control-eligibility-exercise-matrix.json",
      "calibration-disposition-ledger-summary.json",
      "six-evaluator-calibration/candidate-freeze-receipt.json",
      "six-evaluator-calibration/truth-open-sequencing-receipt.json",
      "43-control-before-after-matrix.json",
      "remaining-essential-blocker-register.json",
      "regression-report.json",
      "retention-size-report.json",
      "changed-file-manifest.json",
      "brain1-guardian-blob-compare.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    blockers: [
      "Uncommitted — stop for Codex review",
      "No Stage-300 generation/freeze/run",
      "No commit/push/merge/deploy",
      "No corpus or programme PASS",
      "Six evaluators not promoted to immutable implemented registry",
      "Human rates unavailable; no FP/FN/recall",
    ],
    calibrationRoot: calibrationArtifactRoot(ROOT).replace(/\\/g, "/"),
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  // Refresh manifest after STOP
  writeJson(OUT, "changed-file-manifest.json", changedFileManifest(head));

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: stop.status,
        candidates: blind.candidates.length,
        sixExercise: sixCounts,
        afterStatusTotals: beforeAfter.afterStatusTotals,
        brain1: blob.brain1GuardianBlobUnchanged,
        codeBytes,
        generatedBytes,
        out: BATCH_A_ARTIFACT_ROOT,
      },
      null,
      2,
    ),
  );
}

main();
