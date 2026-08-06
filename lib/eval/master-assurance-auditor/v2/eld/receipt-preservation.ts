/**
 * Warning and approval receipt preservation across version pairs.
 */

import type { EldReceiptPreservationResult, EldVersionPair } from "./types";
import { ELD_RECEIPT_SCHEMA } from "./types";

/**
 * Receipts present on the before draft must remain addressable on the after draft
 * (same nodeIds). Loss of warning/approval receipts is a foundation defect signal —
 * not a programme PASS/FAIL audit verdict.
 */
export function assessReceiptPreservation(pair: EldVersionPair): EldReceiptPreservationResult {
  const beforeWarnings = new Set(pair.before.warnings.map((w) => w.nodeId));
  const afterWarnings = new Set(pair.after.warnings.map((w) => w.nodeId));
  const beforeApprovals = new Set(pair.before.approvals.map((a) => a.nodeId));
  const afterApprovals = new Set(pair.after.approvals.map((a) => a.nodeId));

  const lostWarningIds = [...beforeWarnings]
    .filter((id) => !afterWarnings.has(id))
    .sort() as EldReceiptPreservationResult["lostWarningIds"];
  const lostApprovalIds = [...beforeApprovals]
    .filter((id) => !afterApprovals.has(id))
    .sort() as EldReceiptPreservationResult["lostApprovalIds"];

  const warningReceiptsPreserved = lostWarningIds.length === 0;
  const approvalReceiptsPreserved = lostApprovalIds.length === 0;

  return {
    schemaVersion: ELD_RECEIPT_SCHEMA,
    pairId: pair.pairId,
    warningReceiptsPreserved,
    approvalReceiptsPreserved,
    lostWarningIds,
    lostApprovalIds,
    note:
      warningReceiptsPreserved && approvalReceiptsPreserved
        ? "All before warning/approval receipts retained on after version."
        : "One or more warning/approval receipts were dropped across the version pair.",
  };
}
