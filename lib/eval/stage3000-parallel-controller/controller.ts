/**
 * Resumable Stage-3000 Parallel Corpus Controller.
 *
 * Coordinates 3 waves × 4 shards × 250 cases = 3000.
 * Foundation: works with any Stage3000GeneratorPort (unbound by default;
 * synthetic fixture port for contracts only). Does NOT implement V2.1.2.
 */

import {
  CONTROLLER_VERSION,
  CASES_PER_SHARD,
  TARGET_POPULATION_SIZE,
} from "./constants";
import {
  revealTruthAfterCandidateFreeze,
  initialBlindingGate,
  assertTruthSealedForGenerator,
} from "./blinding";
import {
  buildCheckpoint,
  checkpointsDue,
  hasCheckpoint,
} from "./checkpoints";
import {
  acceptedCaseIdSet,
  shouldSkipSlotOnResume,
  writeControllerState,
  tryLoadControllerState,
} from "./checkpoint-store";
import { createUnboundGeneratorPort } from "./generator-port";
import { sha256Hex, semanticFingerprint } from "./hash";
import { buildPrimaryIdentity, buildReplacementIdentity } from "./ids";
import { buildLineage, lineageSha256, assertGeneratorVersionPin } from "./lineage";
import {
  appendAcceptedMembership,
  emptyMembershipManifest,
  freezeMembership,
} from "./manifests";
import {
  buildWorkspaceLayout,
  ensureWorkspaceLayout,
  generatorVisibleRoots,
} from "./paths";
import { issueShardAcceptanceReceipt } from "./receipts";
import { reconcilePopulation } from "./reconciliation";
import {
  recordRejection,
  withdrawAcceptedBeforeFreeze,
  issueReplacementAcceptance,
} from "./rejection";
import {
  assertNonOverlappingOwnership,
  buildShardOwnership,
  shardKey,
} from "./shards";
import type {
  ControllerState,
  GeneratorCaseCandidate,
  MembershipEntry,
  PopulationPlan,
  PopulationReconciliation,
  ShardOwnership,
  Stage3000GeneratorPort,
  WaveIndex,
  ShardIndex,
} from "./types";

export interface ControllerOptions {
  populationId: string;
  artefactsRoot: string;
  generator?: Stage3000GeneratorPort;
  generatorVersionPin?: string;
  nowIso?: () => string;
  /** Max crash retries per slot before hard fail. */
  maxSlotRetries?: number;
  /** If candidate content starts with this marker, reject. */
  rejectContentPrefix?: string;
}

export class ParallelCorpusController {
  readonly layout;
  private generator: Stage3000GeneratorPort;
  private readonly nowIso: () => string;
  private readonly maxSlotRetries: number;
  private readonly rejectContentPrefix: string;
  private state: ControllerState;

  constructor(opts: ControllerOptions) {
    this.layout = buildWorkspaceLayout(opts.artefactsRoot);
    ensureWorkspaceLayout(this.layout);
    this.generator = opts.generator ?? createUnboundGeneratorPort();
    this.nowIso = opts.nowIso ?? (() => new Date().toISOString());
    this.maxSlotRetries = opts.maxSlotRetries ?? 3;
    this.rejectContentPrefix = opts.rejectContentPrefix ?? "REJECT_MARKER";

    const existing = tryLoadControllerState(this.layout.roles.control);
    if (existing && existing.populationId === opts.populationId) {
      this.state = existing;
      return;
    }

    const generatorVersionPin =
      opts.generatorVersionPin ?? this.generator.generatorVersionPin;
    const plan: PopulationPlan = {
      populationId: opts.populationId,
      controllerVersion: CONTROLLER_VERSION,
      generatorVersionPin,
      waveCount: 3,
      shardsPerWave: 4,
      casesPerShard: 250,
      targetSize: 3000,
      createdAtIso: this.nowIso(),
    };
    const ownership = buildShardOwnership();
    assertNonOverlappingOwnership(ownership);
    this.state = {
      populationId: opts.populationId,
      plan,
      ownership,
      membership: emptyMembershipManifest(plan),
      rejections: [],
      receipts: [],
      checkpoints: [],
      replacementCounters: {},
      lastResumeToken: null,
    };
    this.persist();
  }

  getState(): ControllerState {
    return this.state;
  }

  bindGenerator(port: Stage3000GeneratorPort): void {
    this.generator = port;
    this.state = {
      ...this.state,
      plan: {
        ...this.state.plan,
        generatorVersionPin: port.generatorVersionPin,
      },
      membership: {
        ...this.state.membership,
        generatorVersionPin: port.generatorVersionPin,
      },
    };
    this.persist();
  }

  /**
   * Run (or resume) generation across all shards/waves.
   * Skips already-accepted primary slots. Retries shard crashes per slot.
   */
  async runAll(): Promise<ControllerState> {
    for (const ownership of this.state.ownership) {
      await this.runShard(ownership);
    }
    return this.state;
  }

  async runShard(ownership: ShardOwnership): Promise<void> {
    const { sourceRoot, forbiddenRoots } = generatorVisibleRoots(this.layout);
    // Truth remains sealed from generator perspective for the whole shard run.
    const gate = initialBlindingGate();
    assertTruthSealedForGenerator(gate, false);

    for (let localIndex = 0; localIndex < CASES_PER_SHARD; localIndex++) {
      const identity = buildPrimaryIdentity({
        populationId: this.state.populationId,
        wave: ownership.wave,
        shard: ownership.shard,
        localIndex,
        generatorVersionPin: this.state.plan.generatorVersionPin,
      });

      if (shouldSkipSlotOnResume(this.state, identity.globalSlot)) {
        continue;
      }
      if (acceptedCaseIdSet(this.state).has(identity.caseId)) {
        continue;
      }

      const candidate = await this.generateWithRetry(identity, sourceRoot, forbiddenRoots);

      if (candidate.contentText.startsWith(this.rejectContentPrefix)) {
        this.state = recordRejection(this.state, {
          caseId: identity.caseId,
          reason: "reject_marker",
          rejectedAtIso: this.nowIso(),
          wave: identity.wave,
          shard: identity.shard,
          globalSlot: identity.globalSlot,
        });
        // Issue replacement for the same logical slot ownership without keeping
        // the rejected ID in membership.
        await this.acceptReplacementForRejection({
          ownership,
          rejectedCaseId: identity.caseId,
          rejectedGlobalSlot: identity.globalSlot,
          sourceRoot,
          forbiddenRoots,
        });
        this.persist();
        continue;
      }

      this.acceptCandidate(identity, candidate);
      this.persist();
    }

    // Issue / refresh shard receipt after shard loop.
    const receipt = issueShardAcceptanceReceipt({
      populationId: this.state.populationId,
      ownership,
      membership: this.state.membership,
      issuedAtIso: this.nowIso(),
    });
    this.state = {
      ...this.state,
      receipts: [
        ...this.state.receipts.filter((r) => r.shardKey !== ownership.shardKey),
        receipt,
      ],
    };
    this.persist();
  }

  private async generateWithRetry(
    identity: ReturnType<typeof buildPrimaryIdentity>,
    sourceRoot: string,
    forbiddenRoots: string[],
  ): Promise<GeneratorCaseCandidate> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxSlotRetries; attempt++) {
      try {
        const candidate = await this.generator.generateCase({
          identity,
          sourceRoot,
          forbiddenRoots,
        });
        assertGeneratorVersionPin(
          this.state.plan.generatorVersionPin,
          candidate.generatorVersionPin,
        );
        if (candidate.caseId !== identity.caseId) {
          throw new Error(
            `generator returned caseId ${candidate.caseId} != ${identity.caseId}`,
          );
        }
        return candidate;
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(
      `slot ${identity.globalSlot} failed after ${this.maxSlotRetries} retries: ${
        lastErr instanceof Error ? lastErr.message : String(lastErr)
      }`,
    );
  }

  private acceptCandidate(
    identity: ReturnType<typeof buildPrimaryIdentity>,
    candidate: GeneratorCaseCandidate,
  ): void {
    const prevCount = this.state.membership.acceptedCount;
    const lineage = buildLineage({
      identity,
      status: "accepted",
      candidateContentSha256: candidate.contentSha256,
      semanticFingerprint: candidate.semanticFingerprint,
      createdAtIso: this.nowIso(),
    });
    // Candidate freeze enables truth reveal for controller-side use only.
    const revealed = revealTruthAfterCandidateFreeze({
      ...lineage,
      candidateContentSha256: candidate.contentSha256,
    });
    const frozenLineage = {
      ...lineage,
      truthVisibility: revealed.truthVisibility,
    };

    const entry: MembershipEntry = {
      caseId: identity.caseId,
      seed: identity.seed,
      wave: identity.wave,
      shard: identity.shard,
      globalSlot: identity.globalSlot,
      lineageSha256: lineageSha256(frozenLineage),
      candidateContentSha256: candidate.contentSha256,
      semanticFingerprint: candidate.semanticFingerprint,
      acceptedAtIso: this.nowIso(),
    };

    const membership = appendAcceptedMembership(this.state.membership, entry);
    const due = checkpointsDue(prevCount, membership.acceptedCount);
    const completedShardKeys = this.completedShardKeys(membership);
    const checkpoints = [...this.state.checkpoints];
    for (const threshold of due) {
      if (!hasCheckpoint(checkpoints, threshold)) {
        checkpoints.push(
          buildCheckpoint({
            populationId: this.state.populationId,
            threshold,
            membership,
            ownership: this.state.ownership,
            completedShardKeys,
            writtenAtIso: this.nowIso(),
          }),
        );
      }
    }

    this.state = {
      ...this.state,
      membership,
      checkpoints,
    };
  }

  private async acceptReplacementForRejection(input: {
    ownership: ShardOwnership;
    rejectedCaseId: string;
    rejectedGlobalSlot: number;
    sourceRoot: string;
    forbiddenRoots: string[];
  }): Promise<void> {
    const serial =
      (this.state.replacementCounters[input.ownership.shardKey] ?? 0) + 1;
    const identity = buildReplacementIdentity({
      populationId: this.state.populationId,
      wave: input.ownership.wave,
      shard: input.ownership.shard,
      replacementSerial: serial,
      rejectedGlobalSlot: input.rejectedGlobalSlot,
      generatorVersionPin: this.state.plan.generatorVersionPin,
    });

    const candidate = await this.generator.generateCase({
      identity,
      sourceRoot: input.sourceRoot,
      forbiddenRoots: input.forbiddenRoots,
    });
    assertGeneratorVersionPin(
      this.state.plan.generatorVersionPin,
      candidate.generatorVersionPin,
    );

    const prevCount = this.state.membership.acceptedCount;
    const result = issueReplacementAcceptance({
      state: this.state,
      wave: input.ownership.wave,
      shard: input.ownership.shard,
      shardKey: input.ownership.shardKey,
      rejectedGlobalSlot: input.rejectedGlobalSlot,
      replacesCaseId: input.rejectedCaseId,
      candidate,
      acceptedAtIso: this.nowIso(),
    });
    this.state = result.state;

    const due = checkpointsDue(prevCount, result.state.membership.acceptedCount);
    const completedShardKeys = this.completedShardKeys(result.state.membership);
    const checkpoints = [...this.state.checkpoints];
    for (const threshold of due) {
      if (!hasCheckpoint(checkpoints, threshold)) {
        checkpoints.push(
          buildCheckpoint({
            populationId: this.state.populationId,
            threshold,
            membership: this.state.membership,
            ownership: this.state.ownership,
            completedShardKeys,
            writtenAtIso: this.nowIso(),
          }),
        );
      }
    }
    this.state = { ...this.state, checkpoints };
  }

  private completedShardKeys(
    membership: ControllerState["membership"],
  ): string[] {
    const keys: string[] = [];
    for (const o of this.state.ownership) {
      const count = membership.accepted.filter(
        (e) => e.wave === o.wave && e.shard === o.shard,
      ).length;
      if (count >= o.expectedCount) {
        keys.push(o.shardKey);
      }
    }
    return keys;
  }

  /**
   * Mini-run helper for contracts: only first N slots of wave1/shard0, etc.
   * Does not freeze a real 3000 population.
   */
  async runScaledFixture(opts: {
    waves: WaveIndex[];
    shards: ShardIndex[];
    casesPerShard: number;
  }): Promise<ControllerState> {
    const { sourceRoot, forbiddenRoots } = generatorVisibleRoots(this.layout);
    for (const wave of opts.waves) {
      for (const shard of opts.shards) {
        const ownership = this.state.ownership.find(
          (o) => o.wave === wave && o.shard === shard,
        );
        if (!ownership) throw new Error(`missing ownership ${wave}/${shard}`);

        for (let localIndex = 0; localIndex < opts.casesPerShard; localIndex++) {
          const identity = buildPrimaryIdentity({
            populationId: this.state.populationId,
            wave,
            shard,
            localIndex,
            generatorVersionPin: this.state.plan.generatorVersionPin,
          });
          if (shouldSkipSlotOnResume(this.state, identity.globalSlot)) continue;
          if (acceptedCaseIdSet(this.state).has(identity.caseId)) continue;

          try {
            const candidate = await this.generateWithRetry(
              identity,
              sourceRoot,
              forbiddenRoots,
            );
            if (candidate.contentText.startsWith(this.rejectContentPrefix)) {
              this.state = recordRejection(this.state, {
                caseId: identity.caseId,
                reason: "reject_marker",
                rejectedAtIso: this.nowIso(),
                wave,
                shard,
                globalSlot: identity.globalSlot,
              });
              await this.acceptReplacementForRejection({
                ownership,
                rejectedCaseId: identity.caseId,
                rejectedGlobalSlot: identity.globalSlot,
                sourceRoot,
                forbiddenRoots,
              });
            } else {
              this.acceptCandidate(identity, candidate);
            }
          } catch (err) {
            throw err;
          }
          this.persist();
        }

        const receipt = issueShardAcceptanceReceipt({
          populationId: this.state.populationId,
          ownership,
          membership: this.state.membership,
          issuedAtIso: this.nowIso(),
        });
        this.state = {
          ...this.state,
          receipts: [
            ...this.state.receipts.filter((r) => r.shardKey !== ownership.shardKey),
            receipt,
          ],
        };
        this.persist();
      }
    }
    return this.state;
  }

  withdrawAndReplaceForContracts(input: {
    caseId: string;
    wave: WaveIndex;
    shard: ShardIndex;
    candidateText: string;
  }): void {
    const { manifest, withdrawn } = withdrawAcceptedBeforeFreeze(
      this.state.membership,
      input.caseId,
    );
    this.state = {
      ...this.state,
      membership: manifest,
    };
    this.state = recordRejection(this.state, {
      caseId: input.caseId,
      reason: "contract_withdraw",
      rejectedAtIso: this.nowIso(),
      wave: input.wave,
      shard: input.shard,
      globalSlot: withdrawn.globalSlot,
    });

    const serial =
      (this.state.replacementCounters[shardKey(input.wave, input.shard)] ?? 0) + 1;
    const identity = buildReplacementIdentity({
      populationId: this.state.populationId,
      wave: input.wave,
      shard: input.shard,
      replacementSerial: serial,
      rejectedGlobalSlot: withdrawn.globalSlot,
      generatorVersionPin: this.state.plan.generatorVersionPin,
    });
    const candidate: GeneratorCaseCandidate = {
      caseId: identity.caseId,
      contentText: input.candidateText,
      contentSha256: sha256Hex(input.candidateText),
      semanticFingerprint: semanticFingerprint(input.candidateText),
      generatorVersionPin: this.state.plan.generatorVersionPin,
    };
    const result = issueReplacementAcceptance({
      state: this.state,
      wave: input.wave,
      shard: input.shard,
      shardKey: shardKey(input.wave, input.shard),
      rejectedGlobalSlot: withdrawn.globalSlot,
      replacesCaseId: input.caseId,
      candidate,
      acceptedAtIso: this.nowIso(),
    });
    this.state = result.state;
    this.persist();
  }

  freezeIfComplete(): ControllerState {
    if (this.state.membership.acceptedCount === TARGET_POPULATION_SIZE) {
      this.state = {
        ...this.state,
        membership: freezeMembership(this.state.membership, this.nowIso()),
      };
      this.persist();
    }
    return this.state;
  }

  reconcile(): PopulationReconciliation {
    return reconcilePopulation(this.state, {
      generatorBound: this.generator.isBound,
      nowIso: this.nowIso(),
    });
  }

  private persist(): void {
    const { resumeToken } = writeControllerState(
      this.layout.roles.control,
      this.state,
    );
    this.state = { ...this.state, lastResumeToken: resumeToken };
  }
}
