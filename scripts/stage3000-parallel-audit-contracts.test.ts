/**
 * Stage-3000 parallel audit/rerun foundation contracts.
 * Tiny synthetic fixtures only — no real corpus run.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  S3000_AUDIT_BASELINE_COMMIT,
  S3000_BULK_GITIGNORE_PATTERNS,
  S3000_POPULATION_TARGET,
  assertHandlerRegistered,
  assertReceiptHasIdentity,
  buildMachineReceipt,
  createFullRegressionGate,
  GenericReceiptRejectedError,
  loadFrozenShardManifest,
  materialiseSyntheticFixtures,
  openCheckpointStore,
  appendCheckpoint,
  planAffectedRerun,
  refuseTruthOpenWithoutFreeze,
  runParallelAuditFoundation,
  SYNTHETIC_CONTROL_ID,
  SYNTHETIC_HANDLER,
  validateHandlerIdentity,
  verifyShardHashes,
  iterateJsonl,
  collectJsonlFieldSet,
  dedupeOccurrencesToRootCauses,
  expandOccurrenceUnits,
  UNIT_KINDS,
} from "../lib/eval/stage3000-parallel-audit";

const REPO = process.cwd();

describe("stage3000 parallel audit foundation — synthetic fixtures", () => {
  it("materialises frozen shard manifest with verifiable hashes", () => {
    const { manifest, manifestRel } = materialiseSyntheticFixtures(REPO);
    assert.equal(manifest.baselineCommit, S3000_AUDIT_BASELINE_COMMIT);
    assert.equal(manifest.populationTarget, S3000_POPULATION_TARGET);
    assert.equal(manifest.shardCaseCount, 2);
    const loaded = loadFrozenShardManifest(path.join(REPO, manifestRel));
    assert.equal(loaded.orderedMembershipSha256, manifest.orderedMembershipSha256);
    const { failures } = verifyShardHashes(REPO, loaded);
    assert.equal(failures.length, 0);
    // Surfaces captured separately for all 7 exits
    for (const row of loaded.cases) {
      assert.equal(Object.keys(row.surfaces).length, 7);
      assert.ok(row.surfaces.view);
      assert.ok(row.surfaces.authenticated_browser);
    }
  });

  it("rejects generic detector-ran receipts; requires handler identity + contracts", () => {
    assert.throws(
      () =>
        buildMachineReceipt({
          runId: "t",
          phase: "handler_invoke",
          invocation: {
            caseId: "syn-case-001",
            controlId: SYNTHETIC_HANDLER.controlId,
            handler: { ...SYNTHETIC_HANDLER, handlerId: "detector" },
            applicability: "applicable",
            presentInputs: [],
            missingInputs: [],
            outputSha256: null,
            surfaceAvailability: {
              view: "available",
              copy: "available",
              export: "unavailable",
              api: "available",
              pdf: "unavailable",
              composed_prose: "partial",
              authenticated_browser: "not_exercised",
            },
          },
          exerciseStatus: "evaluated",
          occurrenceIds: [],
          exactWordings: [],
          templateHashes: [],
          evidenceRefs: [],
          plainEnglish: "detector ran successfully",
        }),
      (e: unknown) =>
        e instanceof GenericReceiptRejectedError ||
        (e instanceof Error && /generic|handlerId|functionIdentity/i.test(e.message)),
    );

    const ok = buildMachineReceipt({
      runId: "t",
      phase: "handler_invoke",
      invocation: {
        caseId: "syn-case-001",
        controlId: SYNTHETIC_HANDLER.controlId,
        handler: SYNTHETIC_HANDLER,
        applicability: "applicable",
        presentInputs: ["packet.json"],
        missingInputs: [],
        outputSha256: null,
        surfaceAvailability: {
          view: "available",
          copy: "available",
          export: "unavailable",
          api: "available",
          pdf: "unavailable",
          composed_prose: "partial",
          authenticated_browser: "not_exercised",
        },
      },
      exerciseStatus: "evaluated",
      occurrenceIds: ["occ-1"],
      exactWordings: ["This absolutely proves guilt."],
      templateHashes: [],
      evidenceRefs: ["casebrain-output.json"],
      plainEnglish:
        "syntheticFixtures#detectAbsoluteProofStub evaluated candidate EXACT::<<This absolutely proves guilt.>>",
    });
    assertReceiptHasIdentity(ok);
    assert.equal(ok.handlerId, SYNTHETIC_HANDLER.handlerId);
    assert.equal(ok.functionIdentity, SYNTHETIC_HANDLER.functionIdentity);
    assert.ok(ok.contracts.positive);
    assert.ok(ok.contracts.negative);
  });

  it("retains occurrence/string/template/case/root-cause units separately", () => {
    const units = expandOccurrenceUnits({
      caseId: "syn-case-001",
      controlId: SYNTHETIC_CONTROL_ID,
      occurrenceId: "occ-x",
      exactWording: "This absolutely proves guilt.",
    });
    const kinds = new Set(units.map((u) => u.unitKind));
    assert.ok(kinds.has("occurrence"));
    assert.ok(kinds.has("string"));
    assert.ok(kinds.has("template"));
    assert.ok(kinds.has("case"));
    assert.ok(units.every((u) => u.retainedSeparately === true));
    // root_cause added by dedupe
    const dedupe = dedupeOccurrencesToRootCauses([
      {
        candidateId: "c1",
        caseId: "syn-case-001",
        controlId: SYNTHETIC_CONTROL_ID,
        handlerId: SYNTHETIC_HANDLER.handlerId,
        functionIdentity: SYNTHETIC_HANDLER.functionIdentity,
        findingCode: "SYN_ABSOLUTE_PROOF",
        occurrenceId: "occ-x",
        exactWording: "This absolutely proves guilt.",
        wordingHash: "a",
        templateHash: "b",
        outputSha256: null,
        evidenceRefs: [],
        frozenBeforeTruthOpen: true,
      },
      {
        candidateId: "c2",
        caseId: "syn-case-002",
        controlId: SYNTHETIC_CONTROL_ID,
        handlerId: SYNTHETIC_HANDLER.handlerId,
        functionIdentity: SYNTHETIC_HANDLER.functionIdentity,
        findingCode: "SYN_ABSOLUTE_PROOF",
        occurrenceId: "occ-y",
        exactWording: "This absolutely proves guilt on count 1.",
        wordingHash: "c",
        templateHash: "b",
        outputSha256: null,
        evidenceRefs: [],
        frozenBeforeTruthOpen: true,
      },
    ]);
    assert.equal(dedupe.clusters.length, 1);
    assert.equal(dedupe.clusters[0]!.occurrenceIds.length, 2);
    assert.equal(dedupe.rootCauseUnits[0]!.unitKind, "root_cause");
    assert.ok(UNIT_KINDS.includes("root_cause"));
  });

  it("checkpoints without ledger duplication on resume", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "s3000-cp-"));
    const ledger = path.join(dir, "checkpoint-ledger.jsonl");
    const store1 = await openCheckpointStore(ledger, false);
    const a = appendCheckpoint(store1, {
      runId: "r1",
      phase: "handler_invoke",
      caseId: "syn-case-001",
      controlId: SYNTHETIC_CONTROL_ID,
      content: { k: 1 },
    });
    const dup = appendCheckpoint(store1, {
      runId: "r1",
      phase: "handler_invoke",
      caseId: "syn-case-001",
      controlId: SYNTHETIC_CONTROL_ID,
      content: { k: 1 },
    });
    assert.ok(a);
    assert.equal(dup, null);
    assert.equal(store1.duplicatesSkipped, 1);

    const store2 = await openCheckpointStore(ledger, true);
    const again = appendCheckpoint(store2, {
      runId: "r1",
      phase: "handler_invoke",
      caseId: "syn-case-001",
      controlId: SYNTHETIC_CONTROL_ID,
      content: { k: 1 },
    });
    assert.equal(again, null);
    assert.equal(store2.duplicatesSkipped, 1);
  });

  it("runs resumable foundation on synthetic shard: freeze before truth, cards, affected rerun, regression gate", async () => {
    const { manifestRel, handlers, invokeRegistry } = materialiseSyntheticFixtures(REPO);
    const runId = "syn-foundation-run-1";
    const artifactRootRel =
      "artifacts/casebrain-qa/assurance/stage3000-parallel-audit/fixtures-run";

    const summary = await runParallelAuditFoundation({
      schemaVersion: "stage3000-parallel-audit@1.0.0",
      runId,
      repoRoot: REPO,
      shardManifestPath: manifestRel,
      artifactRootRel,
      resume: false,
      handlers,
      allowTruthOpenAfterFreeze: true,
      scheduleFullRegression: true,
      controlIds: [SYNTHETIC_CONTROL_ID],
      invokeRegistry,
      sharedFix: {
        rootCauseFamilyControlId: SYNTHETIC_CONTROL_ID,
        sharedFixId: "fix-syn-absolute-proof-v1",
      },
    });

    assert.equal(summary.status, "foundation_ok");
    assert.ok(summary.phasesCompleted.includes("candidate_freeze"));
    assert.ok(summary.phasesCompleted.includes("truth_open"));
    assert.ok(summary.truthOpened);
    assert.ok(summary.receiptsWritten >= 2);
    assert.ok(summary.decisionCardsWritten >= 2);
    assert.ok(summary.candidatesFrozen >= 1);
    assert.ok(summary.rootCauseClusters >= 1);
    assert.ok(summary.affectedRerunPlan);
    assert.equal(summary.affectedRerunPlan!.fullRegressionStillMandatory, true);
    assert.ok(summary.fullRegressionGate);
    assert.equal(summary.fullRegressionGate!.mandatory, true);
    assert.equal(summary.fullRegressionGate!.populationTarget, S3000_POPULATION_TARGET);
    assert.equal(summary.fullRegressionGate!.status, "not_started");

    // Honest statuses present
    const receiptsPath = path.join(
      REPO,
      artifactRootRel,
      "bulk-evidence",
      runId,
      "machine-receipts.jsonl",
    );
    const statuses = new Set<string>();
    for await (const row of iterateJsonl<{ exerciseStatus: string; handlerId: string; functionIdentity: string }>(
      receiptsPath,
    )) {
      statuses.add(row.exerciseStatus);
      assert.ok(row.handlerId);
      assert.ok(row.functionIdentity);
      assert.notEqual(row.handlerId, "detector");
    }
    assert.ok(statuses.has("evaluated"));

    // Resume without ledger duplication
    const resumed = await runParallelAuditFoundation({
      schemaVersion: "stage3000-parallel-audit@1.0.0",
      runId,
      repoRoot: REPO,
      shardManifestPath: manifestRel,
      artifactRootRel,
      resume: true,
      handlers,
      allowTruthOpenAfterFreeze: true,
      scheduleFullRegression: true,
      controlIds: [SYNTHETIC_CONTROL_ID],
      invokeRegistry,
      sharedFix: {
        rootCauseFamilyControlId: SYNTHETIC_CONTROL_ID,
        sharedFixId: "fix-syn-absolute-proof-v1",
      },
    });
    assert.ok(resumed.duplicateLedgerKeysSkipped > 0);
    assert.equal(resumed.status, "foundation_ok");

    // Evidence index retains hashes; bulk marked regenerable
    const indexPath = path.join(REPO, resumed.evidenceIndexRel);
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
      entries: Array<{ regenerable: boolean; retainedInGit: boolean; sha256: string }>;
    };
    assert.ok(index.entries.some((e) => e.regenerable && !e.retainedInGit));
    assert.ok(index.entries.some((e) => e.retainedInGit));
    assert.ok(index.entries.every((e) => e.sha256.length === 64));

    // gitignore patterns cover bulk evidence
    assert.ok(S3000_BULK_GITIGNORE_PATTERNS.length >= 3);
  });

  it("refuses truth open without freeze; plans affected-only rerun; keeps full regression mandatory", () => {
    assert.throws(() => refuseTruthOpenWithoutFreeze());
    const plan = planAffectedRerun({
      rootCause: {
        rootCauseId: "rc-1",
        family: "shared_template",
        sharedSignature: "sig",
        occurrenceIds: ["o1"],
        caseIds: ["syn-case-001"],
        controlIds: [SYNTHETIC_CONTROL_ID],
        templateHashes: ["t"],
        stringHashes: ["s"],
      },
      sharedFixId: "fix-1",
      shardCaseIds: ["syn-case-001", "syn-case-002"],
    });
    assert.deepEqual(plan.affectedCaseIds, ["syn-case-001"]);
    assert.deepEqual(plan.unaffectedCaseIds, ["syn-case-002"]);
    assert.equal(plan.fullRegressionStillMandatory, true);

    const gate = createFullRegressionGate({ plannedCaseCount: 100 });
    assert.equal(gate.status, "blocked");
    const okGate = createFullRegressionGate();
    assert.equal(okGate.status, "not_started");
    assert.equal(okGate.mandatory, true);
  });

  it("streams JSONL field collection without requiring full in-memory corpus", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "s3000-jsonl-"));
    const file = path.join(dir, "big.jsonl");
    const lines = [];
    for (let i = 0; i < 200; i++) {
      lines.push(JSON.stringify({ id: `id-${i}`, n: i }));
    }
    fs.writeFileSync(file, lines.join("\n") + "\n");
    const ids = await collectJsonlFieldSet(file, "id");
    assert.equal(ids.size, 200);
  });

  it("only allows genuine registered handlers", () => {
    validateHandlerIdentity(SYNTHETIC_HANDLER);
    assert.throws(() =>
      assertHandlerRegistered([SYNTHETIC_HANDLER], "MAA2-NOT-REGISTERED"),
    );
  });
});
