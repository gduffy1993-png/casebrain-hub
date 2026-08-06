/**
 * Batch-7 selection — structured controls that clear the corrected acceptance bar.
 * ATR-01 is calibrated for honesty receipts but is not promotion-eligible.
 */

import { buildBatch7Audit } from "./batch7-audit";
import { domainsAreDisjoint } from "./evidence-dimension-domain-registry";

/** Controls exercised in Batch-7 calibration (promotion subset may be smaller). */
export const BATCH7_SELECTED_CONTROL_IDS: readonly string[] = [
  "MAA2-EVS-01-DIMENSION-SEPARATION",
  "MAA2-ATR-01-DEFENDANT-SEPARATION",
] as const;

/** Only EVS-01 is promotion-eligible when domains are disjoint. */
export const BATCH7_PROMOTION_ELIGIBLE_IDS: readonly string[] = domainsAreDisjoint()
  ? (["MAA2-EVS-01-DIMENSION-SEPARATION"] as const)
  : ([] as const);

const REASONS: Record<string, string> = {
  "MAA2-EVS-01-DIMENSION-SEPARATION":
    "Bidirectional existence/reliability dimension separation against versioned domain registry derived from canonical five-answers schema + observed ESA tokens.",
  "MAA2-ATR-01-DEFENDANT-SEPARATION":
    "Calibrated for honesty receipts only — remains partially_implemented (missing subjectDefendantId/personId + evidenceUnitId relationships + cross-surface receipts).",
};

export function buildBatch7Selection() {
  const audit = buildBatch7Audit();
  const byId = new Map(audit.rows.map((r) => [r.controlId, r]));
  const selected = BATCH7_SELECTED_CONTROL_IDS.map((controlId, i) => {
    const row = byId.get(controlId);
    if (!row) throw new Error(`Batch-7 selection missing audit row for ${controlId}`);
    const promotionEligible = BATCH7_PROMOTION_ELIGIBLE_IDS.includes(controlId);
    if (promotionEligible && row.bucket !== "promotable_now") {
      throw new Error(`Batch-7 promotion selection invalid for ${controlId}: ${row.bucket}`);
    }
    return {
      controlId,
      selected: true as const,
      promotionEligible,
      rank: i + 1,
      reason: REASONS[controlId]!,
      bucket: row.bucket,
      esaInputsAvailable: row.esaInputsAvailable,
      requiredContracts: ["positive", "multiple_safe_negatives", "unavailable_input", "mutation"],
    };
  });
  return {
    schemaVersion: "batch7-selection@1.1.0",
    selectedCount: selected.length,
    promotionEligibleCount: selected.filter((s) => s.promotionEligible).length,
    domainsDisjoint: domainsAreDisjoint(),
    selected,
    auditBucketCounts: audit.bucketCounts,
    notPromotedHighPrioritySample: audit.rows
      .filter((r) => !BATCH7_PROMOTION_ELIGIBLE_IDS.includes(r.controlId))
      .filter((r) =>
        ["blocked_missing_adapter", "overpromise_narrow_probe", "batch6_returned", "phrase_probe", "returned_atr01"].includes(
          r.bucket,
        ),
      )
      .slice(0, 40)
      .map((r) => ({ controlId: r.controlId, bucket: r.bucket, reason: r.promotionBlockedReason })),
  };
}

export const BATCH7_SELECTED_SET = new Set(BATCH7_SELECTED_CONTROL_IDS);
