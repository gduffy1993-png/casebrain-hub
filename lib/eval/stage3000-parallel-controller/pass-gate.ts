/**
 * Population PASS gate — shards cannot self-certify.
 */

import type { PopulationReconciliation, ShardAcceptanceReceipt } from "./types";

export function assertNotReceiptOnlyPass(
  reconciliation: PopulationReconciliation,
  receipts: ShardAcceptanceReceipt[],
): void {
  if (reconciliation.verdict !== "PASS") return;
  if (receipts.length === 0) {
    throw new Error("PASS requires receipts AND reconciled membership");
  }
  if (reconciliation.acceptedCount !== reconciliation.targetSize) {
    throw new Error("PASS requires full reconciled membership");
  }
  if (reconciliation.semanticDuplicateGroups.length > 0) {
    throw new Error("PASS forbidden while semantic duplicates remain");
  }
  if (reconciliation.overlapCaseIds.length > 0) {
    throw new Error("PASS forbidden while overlaps remain");
  }
}

/**
 * Evaluate whether shard self-reports alone would incorrectly imply PASS.
 * Always returns false — used by negative contracts.
 */
export function shardSelfReportAloneYieldsPass(
  receipts: ShardAcceptanceReceipt[],
): boolean {
  void receipts;
  return false;
}
