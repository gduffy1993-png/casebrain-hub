/**
 * Case rejection and replacement without changing accepted membership IDs.
 *
 * Rules:
 * - Rejected candidates never enter the accepted membership set.
 * - If an accepted case must be withdrawn before freeze, it is removed ONLY via
 *   an explicit unaccept-before-freeze path that records rejection AND issues a
 *   replacement candidate with a NEW caseId/seed. The withdrawn ID is never
 *   re-used. After freeze, membership IDs are immutable.
 * - Replacement IDs use the R### namespace and do not alter historical accepted IDs
 *   that remain in the set.
 */

import { buildReplacementIdentity } from "./ids";
import {
  appendAcceptedMembership,
  computeMembershipSha256,
} from "./manifests";
import { buildLineage, lineageSha256 } from "./lineage";
import type {
  ControllerState,
  GeneratorCaseCandidate,
  MembershipEntry,
  MembershipManifest,
  RejectionRecord,
  ShardIndex,
  WaveIndex,
} from "./types";

export function recordRejection(
  state: ControllerState,
  record: RejectionRecord,
): ControllerState {
  if (state.rejections.some((r) => r.caseId === record.caseId)) {
    return state;
  }
  return {
    ...state,
    rejections: [...state.rejections, record],
  };
}

/**
 * Withdraw an accepted (unfrozen) membership entry and record rejection.
 * Does not insert a replacement — call issueReplacementAcceptance separately.
 * The withdrawn caseId remains permanently non-reusable.
 */
export function withdrawAcceptedBeforeFreeze(
  manifest: MembershipManifest,
  caseId: string,
): { manifest: MembershipManifest; withdrawn: MembershipEntry } {
  if (manifest.frozen) {
    throw new Error("cannot withdraw from frozen membership");
  }
  const withdrawn = manifest.accepted.find((e) => e.caseId === caseId);
  if (!withdrawn) {
    throw new Error(`caseId ${caseId} not in accepted membership`);
  }
  const accepted = manifest.accepted.filter((e) => e.caseId !== caseId);
  return {
    withdrawn,
    manifest: {
      ...manifest,
      accepted,
      acceptedCount: accepted.length,
      membershipSha256: computeMembershipSha256(accepted),
    },
  };
}

export function nextReplacementSerial(
  state: ControllerState,
  shardKey: string,
): number {
  return (state.replacementCounters[shardKey] ?? 0) + 1;
}

export function issueReplacementAcceptance(input: {
  state: ControllerState;
  wave: WaveIndex;
  shard: ShardIndex;
  shardKey: string;
  rejectedGlobalSlot: number;
  replacesCaseId: string;
  candidate: GeneratorCaseCandidate;
  acceptedAtIso: string;
}): {
  state: ControllerState;
  entry: MembershipEntry;
} {
  const serial = nextReplacementSerial(input.state, input.shardKey);
  const identity = buildReplacementIdentity({
    populationId: input.state.populationId,
    wave: input.wave,
    shard: input.shard,
    replacementSerial: serial,
    rejectedGlobalSlot: input.rejectedGlobalSlot,
    generatorVersionPin: input.state.plan.generatorVersionPin,
  });

  if (input.candidate.caseId !== identity.caseId) {
    throw new Error(
      `replacement candidate caseId ${input.candidate.caseId} != ${identity.caseId}`,
    );
  }

  const lineage = buildLineage({
    identity,
    status: "accepted",
    replacesCaseId: input.replacesCaseId,
    candidateContentSha256: input.candidate.contentSha256,
    semanticFingerprint: input.candidate.semanticFingerprint,
    truthVisibility: "revealed_after_candidate_freeze",
    createdAtIso: input.acceptedAtIso,
  });

  const entry: MembershipEntry = {
    caseId: identity.caseId,
    seed: identity.seed,
    wave: identity.wave,
    shard: identity.shard,
    globalSlot: identity.globalSlot,
    lineageSha256: lineageSha256(lineage),
    candidateContentSha256: input.candidate.contentSha256,
    semanticFingerprint: input.candidate.semanticFingerprint,
    acceptedAtIso: input.acceptedAtIso,
  };

  // Reuse appendAcceptedMembership: slot must be free (never accepted or withdrawn).
  const manifest = appendAcceptedMembership(input.state.membership, entry);

  return {
    entry,
    state: {
      ...input.state,
      membership: manifest,
      replacementCounters: {
        ...input.state.replacementCounters,
        [input.shardKey]: serial,
      },
    },
  };
}

/** Accepted caseIds that were never rejected remain stable across replacements. */
export function acceptedMembershipIdsStableAcross(
  beforeIds: string[],
  afterIds: string[],
  withdrawnId: string,
  replacementId: string,
): boolean {
  const expected = new Set(beforeIds.filter((id) => id !== withdrawnId));
  expected.add(replacementId);
  if (afterIds.length !== expected.size) return false;
  return afterIds.every((id) => expected.has(id));
}
