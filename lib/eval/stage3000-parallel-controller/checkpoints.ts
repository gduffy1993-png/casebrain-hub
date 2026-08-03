/**
 * Checkpoint thresholds 20 / 50 / 150 / 300 / 1000 / 3000.
 */

import {
  CHECKPOINT_SCHEMA,
  CHECKPOINT_THRESHOLDS,
  type CheckpointThreshold,
} from "./constants";
import type {
  ControllerCheckpoint,
  MembershipManifest,
  ShardOwnership,
} from "./types";

export function checkpointsDue(
  previousCount: number,
  nextCount: number,
): CheckpointThreshold[] {
  return CHECKPOINT_THRESHOLDS.filter(
    (t) => previousCount < t && nextCount >= t,
  );
}

export function buildCheckpoint(input: {
  populationId: string;
  threshold: CheckpointThreshold;
  membership: MembershipManifest;
  ownership: ShardOwnership[];
  completedShardKeys: string[];
  writtenAtIso: string;
}): ControllerCheckpoint {
  const pendingShardKeys = input.ownership
    .map((o) => o.shardKey)
    .filter((k) => !input.completedShardKeys.includes(k))
    .sort();
  return {
    schema: CHECKPOINT_SCHEMA,
    populationId: input.populationId,
    threshold: input.threshold,
    acceptedCount: input.membership.acceptedCount,
    membershipSha256: input.membership.membershipSha256,
    completedShardKeys: input.completedShardKeys.slice().sort(),
    pendingShardKeys,
    writtenAtIso: input.writtenAtIso,
  };
}

export function hasCheckpoint(
  checkpoints: ControllerCheckpoint[],
  threshold: CheckpointThreshold,
): boolean {
  return checkpoints.some((c) => c.threshold === threshold);
}
