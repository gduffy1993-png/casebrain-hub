/**
 * Exact lineage records and generator-version pins.
 */

import { CONTROLLER_VERSION, LINEAGE_SCHEMA } from "./constants";
import { sha256CanonicalJson } from "./hash";
import type {
  CaseIdentity,
  CaseLineage,
  CaseStatus,
  TruthVisibility,
} from "./types";

export function buildLineage(input: {
  identity: CaseIdentity;
  status: CaseStatus;
  replacesCaseId?: string | null;
  rejectionReason?: string | null;
  sourceManifestSha256?: string | null;
  candidateContentSha256?: string | null;
  semanticFingerprint?: string | null;
  truthVisibility?: TruthVisibility;
  createdAtIso: string;
}): CaseLineage {
  if (input.identity.controllerVersion !== CONTROLLER_VERSION) {
    throw new Error(
      `lineage controllerVersion pin mismatch: ${input.identity.controllerVersion} != ${CONTROLLER_VERSION}`,
    );
  }
  return {
    schema: LINEAGE_SCHEMA,
    identity: input.identity,
    status: input.status,
    replacesCaseId: input.replacesCaseId ?? null,
    rejectionReason: input.rejectionReason ?? null,
    sourceManifestSha256: input.sourceManifestSha256 ?? null,
    candidateContentSha256: input.candidateContentSha256 ?? null,
    semanticFingerprint: input.semanticFingerprint ?? null,
    truthVisibility: input.truthVisibility ?? "sealed",
    createdAtIso: input.createdAtIso,
  };
}

export function lineageSha256(lineage: CaseLineage): string {
  return sha256CanonicalJson(lineage);
}

export function assertGeneratorVersionPin(
  expected: string,
  actual: string,
): void {
  if (expected !== actual) {
    throw new Error(
      `generator version pin mismatch: expected ${expected}, got ${actual}`,
    );
  }
}
