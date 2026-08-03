/**
 * Non-overlapping shard ownership for 3 waves × 4 shards × 250 cases.
 */

import {
  CASES_PER_SHARD,
  CASES_PER_WAVE,
  SHARDS_PER_WAVE,
  WAVE_COUNT,
} from "./constants";
import type { ShardIndex, ShardOwnership, WaveIndex } from "./types";

export function shardKey(wave: WaveIndex, shard: ShardIndex): string {
  return `W${wave}-S${shard}`;
}

export function buildShardOwnership(): ShardOwnership[] {
  const out: ShardOwnership[] = [];
  for (let w = 1; w <= WAVE_COUNT; w++) {
    const wave = w as WaveIndex;
    for (let s = 0; s < SHARDS_PER_WAVE; s++) {
      const shard = s as ShardIndex;
      const slotStart = (wave - 1) * CASES_PER_WAVE + shard * CASES_PER_SHARD;
      const slotEnd = slotStart + CASES_PER_SHARD;
      out.push({
        wave,
        shard,
        slotStart,
        slotEnd,
        expectedCount: CASES_PER_SHARD,
        shardKey: shardKey(wave, shard),
      });
    }
  }
  return out;
}

/** Fail-closed overlap check across ownership ranges. */
export function assertNonOverlappingOwnership(
  ownership: ShardOwnership[],
): void {
  const seen = new Map<number, string>();
  for (const o of ownership) {
    if (o.slotEnd - o.slotStart !== o.expectedCount) {
      throw new Error(
        `ownership ${o.shardKey} span mismatch: ${o.slotEnd - o.slotStart} != ${o.expectedCount}`,
      );
    }
    for (let slot = o.slotStart; slot < o.slotEnd; slot++) {
      const prior = seen.get(slot);
      if (prior) {
        throw new Error(
          `overlapping slot ${slot} owned by ${prior} and ${o.shardKey}`,
        );
      }
      seen.set(slot, o.shardKey);
    }
  }
  if (seen.size !== WAVE_COUNT * SHARDS_PER_WAVE * CASES_PER_SHARD) {
    throw new Error(
      `ownership coverage ${seen.size} != target ${WAVE_COUNT * SHARDS_PER_WAVE * CASES_PER_SHARD}`,
    );
  }
}

export function ownershipForSlot(
  ownership: ShardOwnership[],
  globalSlot: number,
): ShardOwnership {
  const hit = ownership.find(
    (o) => globalSlot >= o.slotStart && globalSlot < o.slotEnd,
  );
  if (!hit) {
    throw new Error(`no shard owns global slot ${globalSlot}`);
  }
  return hit;
}
