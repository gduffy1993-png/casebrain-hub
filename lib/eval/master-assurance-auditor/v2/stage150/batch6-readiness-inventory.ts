/**
 * Batch-6 readiness inventory — remaining partials after Batch-5 promotions.
 * Prioritises charge integrity, evidence state, chronology, provenance, cross-output.
 */

import { buildBatch5ReadinessInventory, type Batch5ReadinessRow } from "./batch5-readiness-inventory";
import { BATCH5_IMPLEMENTED_IDS } from "./batch5-implemented";

export const BATCH6_PRIORITY_FAMILIES = new Set([
  "CHG",
  "LSL",
  "EVS",
  "EID",
  "DEF",
  "ATR",
  "CHR",
  "CP",
  "SRC",
  "PRI",
  "FID",
  "XEX",
  "XOC",
]);

export type Batch6ReadinessRow = Batch5ReadinessRow & {
  remainingAfterBatch5: true;
  priorityFamily: boolean;
  excludedFid10: boolean;
};

export function buildBatch6ReadinessInventory(): {
  schemaVersion: string;
  baselineCommit: string;
  populationAssumed: 499;
  remainingPartialCount: number;
  rows: Batch6ReadinessRow[];
  priorityNonPhrase: Batch6ReadinessRow[];
} {
  const inv = buildBatch5ReadinessInventory();
  const rows: Batch6ReadinessRow[] = inv.rows
    .filter((r) => !BATCH5_IMPLEMENTED_IDS.has(r.controlId))
    .map((r) => ({
      ...r,
      remainingAfterBatch5: true as const,
      priorityFamily: BATCH6_PRIORITY_FAMILIES.has(r.familyCode),
      excludedFid10: r.controlId === "MAA2-FID-10-QUOTATION-FIDELITY",
    }));

  rows.sort((a, b) => {
    const pa = a.priorityFamily && !a.phraseProbeOnly && !a.excludedFid10 ? 1 : 0;
    const pb = b.priorityFamily && !b.phraseProbeOnly && !b.excludedFid10 ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.totalScore - a.totalScore || a.controlId.localeCompare(b.controlId);
  });

  const priorityNonPhrase = rows.filter(
    (r) => r.priorityFamily && !r.phraseProbeOnly && !r.excludedFid10,
  );

  return {
    schemaVersion: "batch6-readiness-inventory@1.0.0",
    baselineCommit: "85b597356ac332c309a9f6e7db4dd97c2276ffa3",
    populationAssumed: 499,
    remainingPartialCount: rows.length,
    rows,
    priorityNonPhrase,
  };
}
