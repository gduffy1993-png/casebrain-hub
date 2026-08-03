/**
 * Deterministic case IDs and seeds for Stage-3000 parallel ownership.
 */

import {
  CONTROLLER_VERSION,
  CASES_PER_SHARD,
  CASES_PER_WAVE,
} from "./constants";
import { sha256Hex } from "./hash";
import type { CaseIdentity, ShardIndex, WaveIndex } from "./types";

export function assertWave(wave: number): asserts wave is WaveIndex {
  if (wave !== 1 && wave !== 2 && wave !== 3) {
    throw new Error(`invalid wave ${wave}; expected 1|2|3`);
  }
}

export function assertShard(shard: number): asserts shard is ShardIndex {
  if (shard !== 0 && shard !== 1 && shard !== 2 && shard !== 3) {
    throw new Error(`invalid shard ${shard}; expected 0|1|2|3`);
  }
}

/** Global planned slot for primary (non-replacement) cases: 0..2999. */
export function globalSlotFor(
  wave: WaveIndex,
  shard: ShardIndex,
  localIndex: number,
): number {
  if (localIndex < 0 || localIndex >= CASES_PER_SHARD) {
    throw new Error(
      `primary localIndex ${localIndex} out of range 0..${CASES_PER_SHARD - 1}`,
    );
  }
  return (wave - 1) * CASES_PER_WAVE + shard * CASES_PER_SHARD + localIndex;
}

export function parseGlobalSlot(slot: number): {
  wave: WaveIndex;
  shard: ShardIndex;
  localIndex: number;
} {
  if (slot < 0 || slot >= 3000 || !Number.isInteger(slot)) {
    throw new Error(`global slot ${slot} out of range 0..2999`);
  }
  const wave = (Math.floor(slot / CASES_PER_WAVE) + 1) as WaveIndex;
  const withinWave = slot % CASES_PER_WAVE;
  const shard = Math.floor(withinWave / CASES_PER_SHARD) as ShardIndex;
  const localIndex = withinWave % CASES_PER_SHARD;
  return { wave, shard, localIndex };
}

/**
 * Deterministic primary case ID.
 * Format: S3000-W{wave}-S{shard}-{localIndex:03d}
 */
export function primaryCaseId(
  wave: WaveIndex,
  shard: ShardIndex,
  localIndex: number,
): string {
  if (localIndex < 0 || localIndex >= CASES_PER_SHARD) {
    throw new Error(`localIndex out of primary range`);
  }
  return `S3000-W${wave}-S${shard}-${String(localIndex).padStart(3, "0")}`;
}

/**
 * Replacement IDs never collide with primary membership IDs.
 * Format: S3000-W{wave}-S{shard}-R{n:03d}
 */
export function replacementCaseId(
  wave: WaveIndex,
  shard: ShardIndex,
  replacementSerial: number,
): string {
  if (replacementSerial < 1) {
    throw new Error(`replacementSerial must be >= 1`);
  }
  return `S3000-W${wave}-S${shard}-R${String(replacementSerial).padStart(3, "0")}`;
}

export function deriveSeed(input: {
  populationId: string;
  caseId: string;
  generatorVersionPin: string;
  controllerVersion?: string;
}): string {
  const ctrl = input.controllerVersion ?? CONTROLLER_VERSION;
  return sha256Hex(
    [
      "s3000-seed-v1",
      input.populationId,
      input.caseId,
      input.generatorVersionPin,
      ctrl,
    ].join("|"),
  );
}

export function buildPrimaryIdentity(input: {
  populationId: string;
  wave: WaveIndex;
  shard: ShardIndex;
  localIndex: number;
  generatorVersionPin: string;
  controllerVersion?: string;
}): CaseIdentity {
  assertWave(input.wave);
  assertShard(input.shard);
  const controllerVersion = input.controllerVersion ?? CONTROLLER_VERSION;
  const caseId = primaryCaseId(input.wave, input.shard, input.localIndex);
  const globalSlot = globalSlotFor(input.wave, input.shard, input.localIndex);
  const seed = deriveSeed({
    populationId: input.populationId,
    caseId,
    generatorVersionPin: input.generatorVersionPin,
    controllerVersion,
  });
  return {
    caseId,
    seed,
    wave: input.wave,
    shard: input.shard,
    localIndex: input.localIndex,
    globalSlot,
    generatorVersionPin: input.generatorVersionPin,
    controllerVersion,
  };
}

export function buildReplacementIdentity(input: {
  populationId: string;
  wave: WaveIndex;
  shard: ShardIndex;
  replacementSerial: number;
  /**
   * Slot of the rejected/withdrawn primary being replaced.
   * Replacement reuses the slot for ownership coverage but gets a NEW caseId/seed.
   * Previously accepted membership IDs (other cases) are never rewritten.
   */
  rejectedGlobalSlot: number;
  generatorVersionPin: string;
  controllerVersion?: string;
}): CaseIdentity {
  assertWave(input.wave);
  assertShard(input.shard);
  if (
    input.rejectedGlobalSlot < 0 ||
    input.rejectedGlobalSlot >= 3000 ||
    !Number.isInteger(input.rejectedGlobalSlot)
  ) {
    throw new Error(
      `rejectedGlobalSlot ${input.rejectedGlobalSlot} out of range 0..2999`,
    );
  }
  const controllerVersion = input.controllerVersion ?? CONTROLLER_VERSION;
  const caseId = replacementCaseId(
    input.wave,
    input.shard,
    input.replacementSerial,
  );
  const seed = deriveSeed({
    populationId: input.populationId,
    caseId,
    generatorVersionPin: input.generatorVersionPin,
    controllerVersion,
  });
  return {
    caseId,
    seed,
    wave: input.wave,
    shard: input.shard,
    // Local index beyond primary range marks replacement lineage.
    localIndex: CASES_PER_SHARD - 1 + input.replacementSerial,
    globalSlot: input.rejectedGlobalSlot,
    generatorVersionPin: input.generatorVersionPin,
    controllerVersion,
  };
}
