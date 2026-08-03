/**
 * Per-shard acceptance receipts.
 * Necessary evidence — never sufficient alone for population PASS.
 */

import { RECEIPT_SCHEMA } from "./constants";
import { membershipSubsetSha256 } from "./manifests";
import type {
  MembershipManifest,
  ShardAcceptanceReceipt,
  ShardIndex,
  ShardOwnership,
  WaveIndex,
} from "./types";

export function issueShardAcceptanceReceipt(input: {
  populationId: string;
  ownership: ShardOwnership;
  membership: MembershipManifest;
  issuedAtIso: string;
}): ShardAcceptanceReceipt {
  const { ownership, membership } = input;
  const entries = membership.accepted.filter(
    (e) => e.wave === ownership.wave && e.shard === ownership.shard,
  );
  const acceptedCaseIds = entries.map((e) => e.caseId).sort();
  return {
    schema: RECEIPT_SCHEMA,
    populationId: input.populationId,
    wave: ownership.wave as WaveIndex,
    shard: ownership.shard as ShardIndex,
    shardKey: ownership.shardKey,
    claimedAcceptedCount: acceptedCaseIds.length,
    acceptedCaseIds,
    membershipSubsetSha256: membershipSubsetSha256(acceptedCaseIds),
    generatorVersionPin: membership.generatorVersionPin,
    controllerVersion: membership.controllerVersion,
    issuedAtIso: input.issuedAtIso,
    selfReportStatus: "shard_complete_claimed",
  };
}

export function assertReceiptMatchesMembership(
  receipt: ShardAcceptanceReceipt,
  membership: MembershipManifest,
): void {
  const entries = membership.accepted.filter(
    (e) => e.wave === receipt.wave && e.shard === receipt.shard,
  );
  const ids = entries.map((e) => e.caseId).sort();
  const subsetSha = membershipSubsetSha256(ids);
  if (subsetSha !== receipt.membershipSubsetSha256) {
    throw new Error(
      `receipt ${receipt.shardKey} subset sha mismatch vs membership`,
    );
  }
  if (ids.length !== receipt.claimedAcceptedCount) {
    throw new Error(
      `receipt ${receipt.shardKey} count mismatch vs membership`,
    );
  }
}
