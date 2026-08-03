/**
 * Central semantic-duplicate scanning (controller-owned, not shard-owned).
 */

import type { MembershipEntry } from "./types";

export interface SemanticDuplicateReport {
  duplicateGroups: string[][];
  clean: boolean;
}

/**
 * Scan accepted membership for colliding semantic fingerprints.
 * Identical fingerprints across different caseIds are duplicates.
 */
export function scanSemanticDuplicates(
  accepted: MembershipEntry[],
): SemanticDuplicateReport {
  const byFp = new Map<string, string[]>();
  for (const entry of accepted) {
    const list = byFp.get(entry.semanticFingerprint) ?? [];
    list.push(entry.caseId);
    byFp.set(entry.semanticFingerprint, list);
  }
  const duplicateGroups = [...byFp.values()]
    .filter((ids) => ids.length > 1)
    .map((ids) => ids.slice().sort())
    .sort((a, b) => a[0]!.localeCompare(b[0]!));
  return {
    duplicateGroups,
    clean: duplicateGroups.length === 0,
  };
}
