/**
 * Membership manifests and SHA-256 freezes.
 * Accepted membership is append-only; rejection never mutates accepted IDs.
 */

import {
  CONTROLLER_VERSION,
  MEMBERSHIP_MANIFEST_SCHEMA,
  TARGET_POPULATION_SIZE,
} from "./constants";
import { canonicalJson, sha256CanonicalJson, sha256Hex } from "./hash";
import type {
  MembershipEntry,
  MembershipManifest,
  PopulationPlan,
} from "./types";

export function emptyMembershipManifest(
  plan: PopulationPlan,
): MembershipManifest {
  const base: Omit<MembershipManifest, "membershipSha256"> = {
    schema: MEMBERSHIP_MANIFEST_SCHEMA,
    populationId: plan.populationId,
    controllerVersion: plan.controllerVersion,
    generatorVersionPin: plan.generatorVersionPin,
    accepted: [],
    acceptedCount: 0,
    frozen: false,
    frozenAtIso: null,
  };
  return {
    ...base,
    membershipSha256: computeMembershipSha256(base.accepted),
  };
}

export function computeMembershipSha256(accepted: MembershipEntry[]): string {
  // Order-independent freeze over accepted case identities + content pins.
  const rows = accepted
    .map((e) =>
      [
        e.caseId,
        e.seed,
        String(e.wave),
        String(e.shard),
        String(e.globalSlot),
        e.lineageSha256,
        e.candidateContentSha256,
        e.semanticFingerprint,
      ].join("|"),
    )
    .sort();
  return sha256Hex(rows.join("\n"));
}

export function appendAcceptedMembership(
  manifest: MembershipManifest,
  entry: MembershipEntry,
): MembershipManifest {
  if (manifest.frozen) {
    throw new Error("cannot append to frozen membership manifest");
  }
  if (manifest.accepted.some((e) => e.caseId === entry.caseId)) {
    throw new Error(`duplicate accepted caseId ${entry.caseId}`);
  }
  if (manifest.accepted.some((e) => e.globalSlot === entry.globalSlot)) {
    throw new Error(`duplicate accepted globalSlot ${entry.globalSlot}`);
  }
  if (manifest.accepted.some((e) => e.seed === entry.seed)) {
    throw new Error(`duplicate accepted seed ${entry.seed}`);
  }
  const accepted = [...manifest.accepted, entry];
  return {
    ...manifest,
    accepted,
    acceptedCount: accepted.length,
    membershipSha256: computeMembershipSha256(accepted),
    controllerVersion: CONTROLLER_VERSION,
  };
}

/**
 * Freeze membership when target size is reached.
 * Freezing seals the accepted set — replacements for later defects require a
 * new population revision (out of scope for foundation).
 */
export function freezeMembership(
  manifest: MembershipManifest,
  atIso: string,
  opts?: { requireTargetSize?: boolean },
): MembershipManifest {
  if (manifest.frozen) {
    return manifest;
  }
  const requireTarget = opts?.requireTargetSize !== false;
  if (requireTarget && manifest.acceptedCount !== TARGET_POPULATION_SIZE) {
    throw new Error(
      `cannot freeze: acceptedCount ${manifest.acceptedCount} != ${TARGET_POPULATION_SIZE}`,
    );
  }
  const sha = computeMembershipSha256(manifest.accepted);
  if (sha !== manifest.membershipSha256) {
    throw new Error("membershipSha256 mismatch at freeze — refuse to freeze");
  }
  return {
    ...manifest,
    membershipSha256: sha,
    frozen: true,
    frozenAtIso: atIso,
  };
}

export function assertMembershipUntampered(manifest: MembershipManifest): void {
  const sha = computeMembershipSha256(manifest.accepted);
  if (sha !== manifest.membershipSha256) {
    throw new Error("membership tamper detected: sha mismatch");
  }
  if (manifest.acceptedCount !== manifest.accepted.length) {
    throw new Error("membership tamper detected: count mismatch");
  }
}

export function membershipSubsetSha256(caseIds: string[]): string {
  return sha256Hex(caseIds.slice().sort().join("\n"));
}

export function serializeManifest(manifest: MembershipManifest): string {
  return canonicalJson(manifest);
}

export function manifestFreezeEnvelope(manifest: MembershipManifest): string {
  return sha256CanonicalJson({
    schema: manifest.schema,
    populationId: manifest.populationId,
    membershipSha256: manifest.membershipSha256,
    acceptedCount: manifest.acceptedCount,
    frozen: manifest.frozen,
    frozenAtIso: manifest.frozenAtIso,
  });
}
