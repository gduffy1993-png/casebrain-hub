/**
 * Stage-3000 Parallel Corpus Controller — foundation contracts.
 * Tiny synthetic fixtures only. Does NOT generate a real population or claim PASS.
 *
 * Run (from worktree root, with deps available):
 *   npx tsx scripts/stage3000-parallel-controller/stage3000-parallel-controller-contracts.test.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CHECKPOINT_THRESHOLDS,
  CONTROLLER_VERSION,
  TARGET_POPULATION_SIZE,
  WAVE_COUNT,
  SHARDS_PER_WAVE,
  CASES_PER_SHARD,
  GENERATOR_VERSION_PIN_UNBOUND,
  ParallelCorpusController,
  SyntheticFixtureGeneratorPort,
  UnboundGeneratorPort,
  assertNonOverlappingOwnership,
  buildShardOwnership,
  buildPrimaryIdentity,
  deriveSeed,
  primaryCaseId,
  replacementCaseId,
  computeMembershipSha256,
  emptyMembershipManifest,
  appendAcceptedMembership,
  freezeMembership,
  scanSemanticDuplicates,
  reconcilePopulation,
  shardSelfReportAloneYieldsPass,
  assertTruthSealedForGenerator,
  initialBlindingGate,
  revealTruthAfterCandidateFreeze,
  buildLineage,
  generatorVisibleRoots,
  buildWorkspaceLayout,
  ensureWorkspaceLayout,
  assertPathNotUnderForbidden,
  issueShardAcceptanceReceipt,
  writeControllerState,
  loadControllerState,
  shouldSkipSlotOnResume,
  acceptedMembershipIdsStableAcross,
  type MembershipEntry,
  type ControllerState,
  type PopulationPlan,
  type ShardAcceptanceReceipt,
} from "@/lib/eval/stage3000-parallel-controller";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
    passed += 1;
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(err);
  }
}

function tmpRoot(label: string): string {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), `s3000-ctrl-${label}-`),
  );
}

function planFor(populationId: string): PopulationPlan {
  return {
    populationId,
    controllerVersion: CONTROLLER_VERSION,
    generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    waveCount: 3,
    shardsPerWave: 4,
    casesPerShard: 250,
    targetSize: 3000,
    createdAtIso: "2026-08-02T00:00:00.000Z",
  };
}

function synthEntry(
  over: Partial<MembershipEntry> & {
    caseId: string;
    wave: 1 | 2 | 3;
    shard: 0 | 1 | 2 | 3;
    globalSlot: number;
  },
): MembershipEntry {
  return {
    seed: over.seed ?? deriveSeed({
      populationId: "pop",
      caseId: over.caseId,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    }),
    lineageSha256: over.lineageSha256 ?? `lin-${over.caseId}`,
    candidateContentSha256: over.candidateContentSha256 ?? `cnt-${over.caseId}`,
    semanticFingerprint: over.semanticFingerprint ?? `sem-${over.caseId}`,
    acceptedAtIso: over.acceptedAtIso ?? "2026-08-02T00:00:00.000Z",
    caseId: over.caseId,
    wave: over.wave,
    shard: over.shard,
    globalSlot: over.globalSlot,
    ...over,
  };
}

async function main() {
  console.log("STAGE-3000 PARALLEL CORPUS CONTROLLER — FOUNDATION CONTRACTS\n");
  console.log(`controllerVersion=${CONTROLLER_VERSION}`);
  console.log(
    `topology=${WAVE_COUNT}x${SHARDS_PER_WAVE}x${CASES_PER_SHARD}=${TARGET_POPULATION_SIZE}\n`,
  );

  // ── POSITIVE ──────────────────────────────────────────────
  console.log("POSITIVE");

  await check("deterministic primary case IDs and seeds", () => {
    const a = buildPrimaryIdentity({
      populationId: "pop-a",
      wave: 1,
      shard: 0,
      localIndex: 7,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    });
    const b = buildPrimaryIdentity({
      populationId: "pop-a",
      wave: 1,
      shard: 0,
      localIndex: 7,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    });
    assert.equal(a.caseId, "S3000-W1-S0-007");
    assert.equal(a.caseId, b.caseId);
    assert.equal(a.seed, b.seed);
    assert.equal(a.globalSlot, 7);
    assert.equal(primaryCaseId(2, 3, 249), "S3000-W2-S3-249");
    assert.equal(replacementCaseId(1, 0, 1), "S3000-W1-S0-R001");
  });

  await check("non-overlapping shard ownership covers exactly 3000 slots", () => {
    const ownership = buildShardOwnership();
    assert.equal(ownership.length, 12);
    assertNonOverlappingOwnership(ownership);
    assert.equal(ownership[0]!.slotStart, 0);
    assert.equal(ownership[0]!.slotEnd, 250);
    assert.equal(ownership[11]!.slotStart, 2750);
    assert.equal(ownership[11]!.slotEnd, 3000);
  });

  await check("source/truth/output separation + CaseBrain forbidden plane", () => {
    const root = tmpRoot("paths");
    const layout = buildWorkspaceLayout(root);
    ensureWorkspaceLayout(layout);
    for (const role of [
      "source",
      "truth",
      "output",
      "control",
      "casebrain_forbidden",
    ] as const) {
      assert.ok(fs.existsSync(layout.roles[role]));
    }
    const visible = generatorVisibleRoots(layout);
    assert.equal(visible.sourceRoot, layout.roles.source);
    assert.ok(visible.forbiddenRoots.includes(layout.roles.truth));
    assert.ok(
      visible.forbiddenRoots.includes(layout.roles.casebrain_forbidden),
    );
    assert.throws(() =>
      assertPathNotUnderForbidden(
        path.join(layout.roles.truth, "secret.json"),
        visible.forbiddenRoots,
      ),
    );
  });

  await check("truth blinding sealed until candidate freeze", () => {
    const gate = initialBlindingGate();
    assert.equal(gate.truthVisibility, "sealed");
    assert.throws(() => assertTruthSealedForGenerator(gate, true));
    const identity = buildPrimaryIdentity({
      populationId: "pop-b",
      wave: 1,
      shard: 0,
      localIndex: 0,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    });
    const lineage = buildLineage({
      identity,
      status: "candidate",
      candidateContentSha256: null,
      createdAtIso: "2026-08-02T00:00:00.000Z",
    });
    assert.throws(() => revealTruthAfterCandidateFreeze(lineage));
    const frozen = buildLineage({
      identity,
      status: "candidate",
      candidateContentSha256: "abc",
      createdAtIso: "2026-08-02T00:00:00.000Z",
    });
    const revealed = revealTruthAfterCandidateFreeze(frozen);
    assert.equal(revealed.truthVisibility, "revealed_after_candidate_freeze");
  });

  await check("membership SHA-256 freeze is deterministic", () => {
    const plan = planFor("pop-freeze");
    let m = emptyMembershipManifest(plan);
    m = appendAcceptedMembership(
      m,
      synthEntry({ caseId: "S3000-W1-S0-000", wave: 1, shard: 0, globalSlot: 0 }),
    );
    m = appendAcceptedMembership(
      m,
      synthEntry({ caseId: "S3000-W1-S0-001", wave: 1, shard: 0, globalSlot: 1 }),
    );
    const sha = computeMembershipSha256(m.accepted);
    assert.equal(m.membershipSha256, sha);
    assert.equal(computeMembershipSha256(m.accepted.slice().reverse()), sha);
  });

  await check("scaled synthetic run accepts without duplicate IDs", async () => {
    const root = tmpRoot("pos-run");
    const gen = new SyntheticFixtureGeneratorPort();
    const ctrl = new ParallelCorpusController({
      populationId: "pop-pos-run",
      artefactsRoot: root,
      generator: gen,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      nowIso: () => "2026-08-02T12:00:00.000Z",
    });
    await ctrl.runScaledFixture({ waves: [1], shards: [0, 1], casesPerShard: 3 });
    const state = ctrl.getState();
    assert.equal(state.membership.acceptedCount, 6);
    const ids = state.membership.accepted.map((e) => e.caseId);
    assert.equal(new Set(ids).size, 6);
    assert.ok(state.receipts.length === 2);
  });

  await check("checkpoints fire at thresholds on synthetic membership growth", async () => {
    const root = tmpRoot("ckpt");
    const ctrl = new ParallelCorpusController({
      populationId: "pop-ckpt",
      artefactsRoot: root,
      generator: new SyntheticFixtureGeneratorPort(),
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      nowIso: () => "2026-08-02T12:00:00.000Z",
    });
    // Drive first 20 slots on W1-S0 to hit checkpoint 20.
    await ctrl.runScaledFixture({ waves: [1], shards: [0], casesPerShard: 20 });
    const state = ctrl.getState();
    assert.equal(state.membership.acceptedCount, 20);
    assert.ok(state.checkpoints.some((c) => c.threshold === 20));
    assert.deepEqual(
      CHECKPOINT_THRESHOLDS.slice(0, 1),
      state.checkpoints.map((c) => c.threshold),
    );
  });

  await check("lineage pins controller + generator versions", () => {
    const identity = buildPrimaryIdentity({
      populationId: "pop-lin",
      wave: 3,
      shard: 2,
      localIndex: 5,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    });
    assert.equal(identity.controllerVersion, CONTROLLER_VERSION);
    assert.equal(identity.generatorVersionPin, "SYNTHETIC-FIXTURE-v0");
    const lineage = buildLineage({
      identity,
      status: "accepted",
      createdAtIso: "2026-08-02T00:00:00.000Z",
    });
    assert.equal(lineage.schema, "s3000-case-lineage-v1");
  });

  await check("central semantic-duplicate scan clean for unique fixtures", () => {
    const accepted = [
      synthEntry({ caseId: "a", wave: 1, shard: 0, globalSlot: 0, semanticFingerprint: "s1" }),
      synthEntry({ caseId: "b", wave: 1, shard: 0, globalSlot: 1, semanticFingerprint: "s2" }),
    ];
    const report = scanSemanticDuplicates(accepted);
    assert.equal(report.clean, true);
  });

  await check("full synthetic membership reconciles to PASS when bound", () => {
    const plan = planFor("pop-full");
    let membership = emptyMembershipManifest(plan);
    const ownership = buildShardOwnership();
    for (let slot = 0; slot < TARGET_POPULATION_SIZE; slot++) {
      const wave = (Math.floor(slot / 1000) + 1) as 1 | 2 | 3;
      const within = slot % 1000;
      const shard = Math.floor(within / 250) as 0 | 1 | 2 | 3;
      const local = within % 250;
      membership = appendAcceptedMembership(
        membership,
        synthEntry({
          caseId: primaryCaseId(wave, shard, local),
          wave,
          shard,
          globalSlot: slot,
        }),
      );
    }
    const receipts: ShardAcceptanceReceipt[] = ownership.map((o) =>
      issueShardAcceptanceReceipt({
        populationId: "pop-full",
        ownership: o,
        membership,
        issuedAtIso: "2026-08-02T00:00:00.000Z",
      }),
    );
    const checkpoints = CHECKPOINT_THRESHOLDS.map((threshold) => ({
      schema: "s3000-controller-checkpoint-v1" as const,
      populationId: "pop-full",
      threshold,
      acceptedCount: TARGET_POPULATION_SIZE,
      membershipSha256: membership.membershipSha256,
      completedShardKeys: ownership.map((o) => o.shardKey),
      pendingShardKeys: [],
      writtenAtIso: "2026-08-02T00:00:00.000Z",
    }));
    const state: ControllerState = {
      populationId: "pop-full",
      plan,
      ownership,
      membership,
      rejections: [],
      receipts,
      checkpoints,
      replacementCounters: {},
      lastResumeToken: null,
    };
    const report = reconcilePopulation(state, {
      generatorBound: true,
      nowIso: "2026-08-02T00:00:00.000Z",
    });
    assert.equal(report.verdict, "PASS");
    assert.equal(report.acceptedCount, 3000);
  });

  // ── NEGATIVE ──────────────────────────────────────────────
  console.log("\nNEGATIVE");

  await check("unbound generator port refuses generateCase", async () => {
    const port = new UnboundGeneratorPort();
    assert.equal(port.isBound, false);
    assert.equal(port.generatorVersionPin, GENERATOR_VERSION_PIN_UNBOUND);
    await assert.rejects(
      () =>
        port.generateCase({
          identity: buildPrimaryIdentity({
            populationId: "x",
            wave: 1,
            shard: 0,
            localIndex: 0,
            generatorVersionPin: GENERATOR_VERSION_PIN_UNBOUND,
          }),
          sourceRoot: "/tmp/source",
          forbiddenRoots: ["/tmp/truth"],
        }),
      /unbound/i,
    );
  });

  await check("shard self-reporting alone never yields PASS", () => {
    assert.equal(shardSelfReportAloneYieldsPass([]), false);
    const plan = planFor("pop-receipt-only");
    const ownership = buildShardOwnership();
    const membership = emptyMembershipManifest(plan);
    // Fabricate receipts that claim completion without membership.
    const receipts: ShardAcceptanceReceipt[] = ownership.map((o) => ({
      schema: "s3000-shard-acceptance-receipt-v1",
      populationId: "pop-receipt-only",
      wave: o.wave,
      shard: o.shard,
      shardKey: o.shardKey,
      claimedAcceptedCount: 250,
      acceptedCaseIds: [],
      membershipSubsetSha256: "deadbeef",
      generatorVersionPin: plan.generatorVersionPin,
      controllerVersion: CONTROLLER_VERSION,
      issuedAtIso: "2026-08-02T00:00:00.000Z",
      selfReportStatus: "shard_complete_claimed",
    }));
    const state: ControllerState = {
      populationId: "pop-receipt-only",
      plan,
      ownership,
      membership,
      rejections: [],
      receipts,
      checkpoints: [],
      replacementCounters: {},
      lastResumeToken: null,
    };
    const report = reconcilePopulation(state, { generatorBound: true });
    assert.notEqual(report.verdict, "PASS");
    assert.ok(
      report.verdict === "FAIL_INCOMPLETE" ||
        report.verdict === "FAIL_RECEIPT_ONLY" ||
        report.verdict === "FAIL_COUNT_MISMATCH",
    );
  });

  await check("generator cannot use CaseBrain / truth as sourceRoot", async () => {
    const root = tmpRoot("forbid");
    const layout = buildWorkspaceLayout(root);
    ensureWorkspaceLayout(layout);
    const gen = new SyntheticFixtureGeneratorPort();
    const identity = buildPrimaryIdentity({
      populationId: "pop-forbid",
      wave: 1,
      shard: 0,
      localIndex: 0,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
    });
    await assert.rejects(
      () =>
        gen.generateCase({
          identity,
          sourceRoot: layout.roles.truth,
          forbiddenRoots: [
            layout.roles.truth,
            layout.roles.casebrain_forbidden,
          ],
        }),
      /forbidden/i,
    );
  });

  await check("cannot freeze membership below target size", () => {
    const plan = planFor("pop-nofreeze");
    let m = emptyMembershipManifest(plan);
    m = appendAcceptedMembership(
      m,
      synthEntry({ caseId: "S3000-W1-S0-000", wave: 1, shard: 0, globalSlot: 0 }),
    );
    assert.throws(() => freezeMembership(m, "2026-08-02T00:00:00.000Z"));
  });

  await check("duplicate accepted caseId rejected", () => {
    const plan = planFor("pop-dup");
    let m = emptyMembershipManifest(plan);
    const e = synthEntry({
      caseId: "S3000-W1-S0-000",
      wave: 1,
      shard: 0,
      globalSlot: 0,
    });
    m = appendAcceptedMembership(m, e);
    assert.throws(() => appendAcceptedMembership(m, { ...e, globalSlot: 1, seed: "other" }));
  });

  await check("unbound generator fails reconciliation PASS", () => {
    const plan = planFor("pop-unbound");
    const state: ControllerState = {
      populationId: "pop-unbound",
      plan: { ...plan, generatorVersionPin: GENERATOR_VERSION_PIN_UNBOUND },
      ownership: buildShardOwnership(),
      membership: emptyMembershipManifest(plan),
      rejections: [],
      receipts: [],
      checkpoints: [],
      replacementCounters: {},
      lastResumeToken: null,
    };
    const report = reconcilePopulation(state, { generatorBound: false });
    assert.equal(report.verdict, "FAIL_GENERATOR_UNBOUND");
  });

  // ── MUTATION ──────────────────────────────────────────────
  console.log("\nMUTATION");

  await check("membership tamper mutates SHA and fails reconciliation", () => {
    const plan = planFor("pop-tamper");
    let membership = emptyMembershipManifest(plan);
    membership = appendAcceptedMembership(
      membership,
      synthEntry({ caseId: "S3000-W1-S0-000", wave: 1, shard: 0, globalSlot: 0 }),
    );
    const tampered = {
      ...membership,
      accepted: [
        ...membership.accepted,
        synthEntry({
          caseId: "S3000-W1-S0-001",
          wave: 1,
          shard: 0,
          globalSlot: 1,
        }),
      ],
      acceptedCount: 2,
      // leave membershipSha256 stale
    };
    const state: ControllerState = {
      populationId: "pop-tamper",
      plan,
      ownership: buildShardOwnership(),
      membership: tampered,
      rejections: [],
      receipts: [],
      checkpoints: [],
      replacementCounters: {},
      lastResumeToken: null,
    };
    const report = reconcilePopulation(state, { generatorBound: true });
    assert.equal(report.verdict, "FAIL_MEMBERSHIP_TAMPER");
  });

  await check("semantic duplicate mutation is detected centrally", () => {
    const accepted = [
      synthEntry({
        caseId: "a",
        wave: 1,
        shard: 0,
        globalSlot: 0,
        semanticFingerprint: "SAME",
      }),
      synthEntry({
        caseId: "b",
        wave: 1,
        shard: 0,
        globalSlot: 1,
        semanticFingerprint: "SAME",
      }),
    ];
    const report = scanSemanticDuplicates(accepted);
    assert.equal(report.clean, false);
    assert.deepEqual(report.duplicateGroups, [["a", "b"]]);
  });

  await check("rejection + replacement keeps other accepted IDs stable", async () => {
    const root = tmpRoot("mut-rej");
    const gen = new SyntheticFixtureGeneratorPort({
      rejectKeys: ["1:0:1"],
    });
    const ctrl = new ParallelCorpusController({
      populationId: "pop-mut-rej",
      artefactsRoot: root,
      generator: gen,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      nowIso: () => "2026-08-02T12:00:00.000Z",
    });
    await ctrl.runScaledFixture({ waves: [1], shards: [0], casesPerShard: 3 });
    const state = ctrl.getState();
    assert.equal(state.membership.acceptedCount, 3);
    assert.ok(state.rejections.some((r) => r.caseId === "S3000-W1-S0-001"));
    assert.ok(
      !state.membership.accepted.some((e) => e.caseId === "S3000-W1-S0-001"),
    );
    assert.ok(
      state.membership.accepted.some((e) => e.caseId === "S3000-W1-S0-R001"),
    );
    assert.ok(
      state.membership.accepted.some((e) => e.caseId === "S3000-W1-S0-000"),
    );
    assert.ok(
      state.membership.accepted.some((e) => e.caseId === "S3000-W1-S0-002"),
    );
  });

  await check("withdraw+replace does not alter remaining accepted membership IDs", async () => {
    const root = tmpRoot("mut-wd");
    const ctrl = new ParallelCorpusController({
      populationId: "pop-mut-wd",
      artefactsRoot: root,
      generator: new SyntheticFixtureGeneratorPort(),
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      nowIso: () => "2026-08-02T12:00:00.000Z",
    });
    await ctrl.runScaledFixture({ waves: [1], shards: [0], casesPerShard: 3 });
    const before = ctrl
      .getState()
      .membership.accepted.map((e) => e.caseId)
      .sort();
    ctrl.withdrawAndReplaceForContracts({
      caseId: "S3000-W1-S0-001",
      wave: 1,
      shard: 0,
      candidateText: "replacement-unique-text",
    });
    const after = ctrl
      .getState()
      .membership.accepted.map((e) => e.caseId)
      .sort();
    assert.ok(
      acceptedMembershipIdsStableAcross(
        before,
        after,
        "S3000-W1-S0-001",
        "S3000-W1-S0-R001",
      ),
    );
    assert.ok(after.includes("S3000-W1-S0-000"));
    assert.ok(after.includes("S3000-W1-S0-002"));
    assert.ok(!after.includes("S3000-W1-S0-001"));
  });

  await check("overlapping ownership mutation throws", () => {
    const ownership = buildShardOwnership();
    const broken = [
      ...ownership,
      {
        ...ownership[0]!,
        shardKey: "W1-S0-DUP",
      },
    ];
    assert.throws(() => assertNonOverlappingOwnership(broken));
  });

  // ── RESUME ────────────────────────────────────────────────
  console.log("\nRESUME");

  await check("interrupt/resume does not duplicate accepted cases", async () => {
    const root = tmpRoot("resume");
    const gen = new SyntheticFixtureGeneratorPort({
      crashSlots: [1], // crash once on slot 1
    });
    const ctrl1 = new ParallelCorpusController({
      populationId: "pop-resume",
      artefactsRoot: root,
      generator: gen,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      nowIso: () => "2026-08-02T12:00:00.000Z",
      maxSlotRetries: 3,
    });
    await ctrl1.runScaledFixture({ waves: [1], shards: [0], casesPerShard: 3 });
    const mid = ctrl1.getState();
    assert.equal(mid.membership.acceptedCount, 3);
    assert.ok(mid.lastResumeToken);

    // Simulate interrupt after partial progress then resume with new controller instance.
    const ctrl2 = new ParallelCorpusController({
      populationId: "pop-resume",
      artefactsRoot: root,
      generator: new SyntheticFixtureGeneratorPort(),
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      nowIso: () => "2026-08-02T13:00:00.000Z",
    });
    const loaded = ctrl2.getState();
    assert.equal(loaded.membership.acceptedCount, 3);
    assert.equal(
      loaded.membership.membershipSha256,
      mid.membership.membershipSha256,
    );
    for (const entry of loaded.membership.accepted) {
      assert.equal(shouldSkipSlotOnResume(loaded, entry.globalSlot), true);
    }
    await ctrl2.runScaledFixture({ waves: [1], shards: [0], casesPerShard: 3 });
    const after = ctrl2.getState();
    assert.equal(after.membership.acceptedCount, 3);
    const ids = after.membership.accepted.map((e) => e.caseId);
    assert.equal(new Set(ids).size, 3);
  });

  await check("checkpoint store round-trip preserves membership freeze hash", () => {
    const root = tmpRoot("store");
    const layout = buildWorkspaceLayout(root);
    ensureWorkspaceLayout(layout);
    const plan = planFor("pop-store");
    let membership = emptyMembershipManifest(plan);
    membership = appendAcceptedMembership(
      membership,
      synthEntry({ caseId: "S3000-W1-S0-000", wave: 1, shard: 0, globalSlot: 0 }),
    );
    const state: ControllerState = {
      populationId: "pop-store",
      plan,
      ownership: buildShardOwnership(),
      membership,
      rejections: [],
      receipts: [],
      checkpoints: [],
      replacementCounters: {},
      lastResumeToken: null,
    };
    const { resumeToken } = writeControllerState(layout.roles.control, state);
    const loaded = loadControllerState(layout.roles.control);
    assert.equal(loaded.membership.membershipSha256, membership.membershipSha256);
    assert.equal(loaded.lastResumeToken, resumeToken);
  });

  await check("shard crash retry recovers without skipping slot permanently", async () => {
    const root = tmpRoot("crash");
    const gen = new SyntheticFixtureGeneratorPort({
      crashSlots: [0, 0], // only first throw consumed; second call succeeds after clear
    });
    // crashSlots Set: first generate for slot 0 throws and deletes; retry succeeds.
    const ctrl = new ParallelCorpusController({
      populationId: "pop-crash",
      artefactsRoot: root,
      generator: gen,
      generatorVersionPin: "SYNTHETIC-FIXTURE-v0",
      maxSlotRetries: 3,
      nowIso: () => "2026-08-02T12:00:00.000Z",
    });
    await ctrl.runScaledFixture({ waves: [1], shards: [0], casesPerShard: 1 });
    assert.equal(ctrl.getState().membership.acceptedCount, 1);
    assert.equal(ctrl.getState().membership.accepted[0]!.caseId, "S3000-W1-S0-000");
  });

  console.log(
    `\n${passed} passed, ${failed} failed (foundation contracts; not a population PASS claim)`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
