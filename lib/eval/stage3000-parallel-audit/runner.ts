/**
 * Resumable Stage-3000 parallel audit/rerun foundation runner.
 * Synthetic-fixture safe. Does not run the real 3000 corpus.
 */

import fs from "node:fs";
import path from "node:path";

import { S3000_AUDIT_BASELINE_COMMIT, S3000_AUDIT_SCHEMA, type RunnerPhase } from "./constants";
import { planAffectedRerun } from "./affected-rerun";
import { candidatesFromReceipts, freezeCandidates } from "./candidate-freeze";
import { appendCheckpoint, openCheckpointStore } from "./checkpoint";
import { buildDecisionCard } from "./decision-card";
import {
  buildEvidencePaths,
  ensureEvidenceDirs,
  writeEvidenceIndex,
} from "./evidence-layout";
import { fastChecksPassed, runFastDeterministicChecks } from "./fast-checks";
import { verifyShardHashes } from "./hash-verify";
import { invokeRegisteredHandler, type InvokeRegistry } from "./invoke";
import { appendJsonl, iterateJsonl } from "./jsonl-stream";
import { assertReceiptHasIdentity } from "./machine-receipt";
import { createFullRegressionGate, assertFullRegressionStillRequired } from "./regression-gate";
import { dedupeOccurrencesToRootCauses } from "./root-cause-dedupe";
import { loadFrozenShardManifest } from "./shard-manifest";
import { openTruthAfterFreeze } from "./truth-gate";
import { expandOccurrenceUnits } from "./units";
import type {
  DecisionCard,
  MachineReceipt,
  RegisteredHandlerRef,
  RunnerConfig,
  RunnerSummary,
} from "./types";

async function loadExistingReceipts(absPath: string): Promise<MachineReceipt[]> {
  const out: MachineReceipt[] = [];
  for await (const row of iterateJsonl<MachineReceipt>(absPath)) {
    out.push(row);
  }
  return out;
}

export type RunFoundationInput = RunnerConfig & {
  /** controlId list to exercise (subset of handlers). */
  controlIds: string[];
  invokeRegistry: InvokeRegistry;
  /** Optional shared-fix simulation for affected rerun planning. */
  sharedFix?: { rootCauseFamilyControlId: string; sharedFixId: string } | null;
};

export async function runParallelAuditFoundation(
  input: RunFoundationInput,
): Promise<RunnerSummary> {
  const paths = buildEvidencePaths(
    input.repoRoot,
    input.runId,
    input.artifactRootRel,
  );
  ensureEvidenceDirs(paths);

  const store = await openCheckpointStore(paths.checkpointLedgerAbs, input.resume);
  const phasesCompleted: RunnerPhase[] = [];
  const receipts: MachineReceipt[] = input.resume
    ? await loadExistingReceipts(paths.receiptsJsonlAbs)
    : [];
  const cards: DecisionCard[] = [];
  let hashFailures = 0;
  let fastCheckFailures = 0;
  let truthOpened = false;
  let blockedReason: string | null = null;
  if (!input.resume && fs.existsSync(paths.receiptsJsonlAbs)) {
    fs.writeFileSync(paths.receiptsJsonlAbs, "");
  }
  if (!input.resume && fs.existsSync(paths.decisionCardsJsonlAbs)) {
    fs.writeFileSync(paths.decisionCardsJsonlAbs, "");
  }
  if (!input.resume && fs.existsSync(paths.unitsJsonlAbs)) {
    fs.writeFileSync(paths.unitsJsonlAbs, "");
  }

  // --- load_shard ---
  const manifest = loadFrozenShardManifest(
    path.isAbsolute(input.shardManifestPath)
      ? input.shardManifestPath
      : path.join(input.repoRoot, input.shardManifestPath),
  );
  appendCheckpoint(store, {
    runId: input.runId,
    phase: "load_shard",
    caseId: null,
    controlId: null,
    content: {
      shardId: manifest.shardId,
      orderedMembershipSha256: manifest.orderedMembershipSha256,
      caseCount: manifest.shardCaseCount,
    },
    payloadRelPath: input.shardManifestPath,
  });
  phasesCompleted.push("load_shard");

  // --- verify_hashes ---
  const hashReport = verifyShardHashes(input.repoRoot, manifest);
  hashFailures = hashReport.failures.length;
  appendCheckpoint(store, {
    runId: input.runId,
    phase: "verify_hashes",
    caseId: null,
    controlId: null,
    content: {
      checked: hashReport.results.length,
      failures: hashReport.failures.map((f) => ({
        kind: f.kind,
        relativePath: f.relativePath,
        reason: f.reason,
      })),
    },
  });
  phasesCompleted.push("verify_hashes");
  if (hashFailures > 0) {
    blockedReason = `hash verification failed (${hashFailures})`;
  }

  // --- per-case fast checks + handler invoke ---
  if (!blockedReason) {
    for (const row of manifest.cases) {
      const fast = runFastDeterministicChecks(input.repoRoot, row);
      const fastOk = fastChecksPassed(fast);
      if (!fastOk) fastCheckFailures += 1;
      appendCheckpoint(store, {
        runId: input.runId,
        phase: "fast_deterministic",
        caseId: row.caseId,
        controlId: null,
        content: { checks: fast },
      });

      if (!fastOk) continue;

      for (const controlId of input.controlIds) {
        const contentKey = { caseId: row.caseId, controlId, phase: "handler_invoke" };
        const prior = appendCheckpoint(store, {
          runId: input.runId,
          phase: "handler_invoke",
          caseId: row.caseId,
          controlId,
          content: contentKey,
        });
        // On resume, duplicate ledger key → skip re-invoke (receipts already loaded).
        if (prior === null && input.resume) {
          continue;
        }
        // On resume path where checkpoint was missing, avoid duplicating an existing receipt.
        if (input.resume && receipts.some((r) => r.caseId === row.caseId && r.controlId === controlId)) {
          continue;
        }

        const receipt = invokeRegisteredHandler({
          runId: input.runId,
          repoRoot: input.repoRoot,
          row,
          handlers: input.handlers,
          controlId,
          invokeRegistry: input.invokeRegistry,
        });
        assertReceiptHasIdentity(receipt);
        receipts.push(receipt);
        appendJsonl(paths.receiptsJsonlAbs, [receipt]);
      }
    }
    phasesCompleted.push("fast_deterministic", "handler_invoke");
  }

  // Rebuild occurrence/string/template/case units from receipts (idempotent derived artefact).
  fs.writeFileSync(paths.unitsJsonlAbs, "");
  for (const receipt of receipts) {
    for (let i = 0; i < receipt.occurrenceIds.length; i++) {
      const exact = extractExactFromEvidence(receipt, i) || `[hash:${receipt.wordingHashes[i] ?? ""}]`;
      appendJsonl(
        paths.unitsJsonlAbs,
        expandOccurrenceUnits({
          caseId: receipt.caseId,
          controlId: receipt.controlId,
          occurrenceId: receipt.occurrenceIds[i]!,
          exactWording: exact,
        }),
      );
    }
  }

  // --- candidate freeze (before truth) ---
  let freeze = freezeCandidates({
    runId: input.runId,
    shardId: manifest.shardId,
    candidates: candidatesFromReceipts(receipts).map((c) => {
      const r = receipts.find((x) => x.occurrenceIds.includes(c.occurrenceId));
      const idx = r?.occurrenceIds.indexOf(c.occurrenceId) ?? -1;
      const exact = r ? extractExactFromEvidence(r, idx >= 0 ? idx : 0) : "";
      return { ...c, exactWording: exact || c.exactWording };
    }),
  });

  fs.writeFileSync(paths.candidateFreezeAbs, JSON.stringify(freeze, null, 2) + "\n");
  appendCheckpoint(store, {
    runId: input.runId,
    phase: "candidate_freeze",
    caseId: null,
    controlId: null,
    content: {
      candidateCount: freeze.candidateCount,
      candidatesSha256: freeze.candidatesSha256,
      truthOpened: false,
    },
    payloadRelPath: path.relative(input.repoRoot, paths.candidateFreezeAbs).replace(/\\/g, "/"),
  });
  phasesCompleted.push("candidate_freeze");

  // --- truth open (optional, only after freeze) ---
  if (input.allowTruthOpenAfterFreeze && !blockedReason) {
    const truth = openTruthAfterFreeze({
      repoRoot: input.repoRoot,
      manifest,
      freeze,
    });
    truthOpened = truth.opened;
    if (truth.truthVerifications.some((t) => !t.ok)) {
      blockedReason = "truth open hash verification failed";
    }
    appendCheckpoint(store, {
      runId: input.runId,
      phase: "truth_open",
      caseId: null,
      controlId: null,
      content: {
        candidateFreezeSha256: truth.candidateFreezeSha256,
        failures: truth.truthVerifications.filter((t) => !t.ok),
      },
    });
    phasesCompleted.push("truth_open");
  }

  // --- root-cause dedupe ---
  const dedupe = dedupeOccurrencesToRootCauses(freeze.candidates);
  appendJsonl(paths.unitsJsonlAbs, dedupe.rootCauseUnits);
  appendCheckpoint(store, {
    runId: input.runId,
    phase: "root_cause_dedupe",
    caseId: null,
    controlId: null,
    content: {
      clusterCount: dedupe.clusters.length,
      rootCauseIds: dedupe.clusters.map((c) => c.rootCauseId),
    },
  });
  phasesCompleted.push("root_cause_dedupe");

  // --- decision cards ---
  fs.writeFileSync(paths.decisionCardsJsonlAbs, "");
  for (const receipt of receipts) {
    const rootCauseIds = receipt.occurrenceIds
      .map((o) => dedupe.occurrenceToRootCause[o])
      .filter((x): x is string => Boolean(x));
    const card = buildDecisionCard(receipt, [...new Set(rootCauseIds)]);
    cards.push(card);
    appendJsonl(paths.decisionCardsJsonlAbs, [card]);
  }
  appendCheckpoint(store, {
    runId: input.runId,
    phase: "decision_cards",
    caseId: null,
    controlId: null,
    content: { cardCount: cards.length },
  });
  phasesCompleted.push("decision_cards");

  // --- affected rerun plan (optional) ---
  let affectedRerunPlan = null;
  if (input.sharedFix && dedupe.clusters.length > 0) {
    const cluster =
      dedupe.clusters.find((c) =>
        c.controlIds.includes(input.sharedFix!.rootCauseFamilyControlId),
      ) ?? dedupe.clusters[0]!;
    affectedRerunPlan = planAffectedRerun({
      rootCause: cluster,
      sharedFixId: input.sharedFix.sharedFixId,
      shardCaseIds: manifest.cases.map((c) => c.caseId),
      populationTarget: manifest.populationTarget,
    });
    appendCheckpoint(store, {
      runId: input.runId,
      phase: "affected_rerun",
      caseId: null,
      controlId: null,
      content: affectedRerunPlan,
    });
    phasesCompleted.push("affected_rerun");
  }

  // --- full regression gate (scheduled, not executed on real corpus) ---
  let fullRegressionGate = null;
  if (input.scheduleFullRegression) {
    fullRegressionGate = createFullRegressionGate({
      populationTarget: manifest.populationTarget,
      plannedCaseCount: manifest.populationTarget,
    });
    assertFullRegressionStillRequired(fullRegressionGate, Boolean(affectedRerunPlan));
    appendCheckpoint(store, {
      runId: input.runId,
      phase: "full_regression",
      caseId: null,
      controlId: null,
      content: fullRegressionGate,
    });
    phasesCompleted.push("full_regression");
  }

  const summary: RunnerSummary = {
    schemaVersion: S3000_AUDIT_SCHEMA,
    runId: input.runId,
    shardId: manifest.shardId,
    baselineCommit: manifest.baselineCommit || S3000_AUDIT_BASELINE_COMMIT,
    phasesCompleted,
    casesProcessed: manifest.shardCaseCount,
    hashFailures,
    fastCheckFailures,
    receiptsWritten: receipts.length,
    decisionCardsWritten: cards.length,
    candidatesFrozen: freeze.candidateCount,
    truthOpened,
    rootCauseClusters: dedupe.clusters.length,
    checkpointRecords: store.recordsWritten,
    duplicateLedgerKeysSkipped: store.duplicatesSkipped,
    affectedRerunPlan,
    fullRegressionGate,
    evidenceIndexRel: path
      .relative(input.repoRoot, paths.evidenceIndexAbs)
      .replace(/\\/g, "/"),
    status: blockedReason ? "blocked" : "foundation_ok",
    blockedReason,
  };

  fs.writeFileSync(paths.summaryAbs, JSON.stringify(summary, null, 2) + "\n");
  writeEvidenceIndex(input.repoRoot, input.runId, paths);
  return summary;
}

function extractExactFromEvidence(receipt: MachineReceipt, index: number): string {
  // Fixtures may put EXACT::<wording> markers in plainEnglish for unit retention tests.
  const m = receipt.plainEnglish.match(/EXACT::<<([\s\S]*?)>>/);
  if (m) return m[1] ?? "";
  const multi = [...receipt.plainEnglish.matchAll(/EXACT\[(\d+)\]::<<([\s\S]*?)>>/g)];
  if (multi.length > 0) {
    const hit = multi.find((x) => Number(x[1]) === index);
    return hit?.[2] ?? multi[0]?.[2] ?? "";
  }
  return "";
}

export type { RegisteredHandlerRef };
