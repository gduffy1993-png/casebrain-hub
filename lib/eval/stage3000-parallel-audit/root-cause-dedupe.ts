/**
 * Deduplicate occurrences into shared root causes.
 * Link — do not silently delete — occurrences.
 */

import { rootCauseSignature, shortHash, templateHash } from "./hashes";
import { buildRootCauseUnit } from "./units";
import type { EvidenceUnit, FrozenCandidate, RootCauseCluster } from "./types";

export type DedupeResult = {
  clusters: RootCauseCluster[];
  occurrenceToRootCause: Record<string, string>;
  rootCauseUnits: EvidenceUnit[];
};

export function dedupeOccurrencesToRootCauses(
  candidates: FrozenCandidate[],
  familyForControl: (controlId: string) => string = () => "shared_template",
): DedupeResult {
  const bySig = new Map<
    string,
    {
      family: string;
      occurrenceIds: string[];
      caseIds: Set<string>;
      controlIds: Set<string>;
      templateHashes: Set<string>;
      stringHashes: Set<string>;
      handlerId: string;
    }
  >();

  for (const c of candidates) {
    const family = familyForControl(c.controlId);
    const th = c.templateHash || templateHash(c.exactWording);
    const sig = rootCauseSignature({
      family,
      controlId: c.controlId,
      templateHash: th,
      handlerId: c.handlerId,
    });
    const row = bySig.get(sig) ?? {
      family,
      occurrenceIds: [],
      caseIds: new Set<string>(),
      controlIds: new Set<string>(),
      templateHashes: new Set<string>(),
      stringHashes: new Set<string>(),
      handlerId: c.handlerId,
    };
    row.occurrenceIds.push(c.occurrenceId);
    row.caseIds.add(c.caseId);
    row.controlIds.add(c.controlId);
    row.templateHashes.add(th);
    row.stringHashes.add(c.wordingHash);
    bySig.set(sig, row);
  }

  const clusters: RootCauseCluster[] = [];
  const occurrenceToRootCause: Record<string, string> = {};
  const rootCauseUnits: EvidenceUnit[] = [];

  for (const [sig, row] of bySig) {
    const rootCauseId = `rc-${shortHash(sig)}`;
    const cluster: RootCauseCluster = {
      rootCauseId,
      family: row.family,
      sharedSignature: sig,
      occurrenceIds: [...row.occurrenceIds],
      caseIds: [...row.caseIds].sort(),
      controlIds: [...row.controlIds].sort(),
      templateHashes: [...row.templateHashes],
      stringHashes: [...row.stringHashes],
    };
    clusters.push(cluster);
    for (const occ of row.occurrenceIds) {
      occurrenceToRootCause[occ] = rootCauseId;
    }
    rootCauseUnits.push(
      buildRootCauseUnit({
        rootCauseId,
        caseIds: cluster.caseIds,
        controlId: cluster.controlIds[0] ?? null,
      }),
    );
  }

  return { clusters, occurrenceToRootCause, rootCauseUnits };
}
