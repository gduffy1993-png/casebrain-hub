/**
 * Batch-6 selection — honesty-corrected promotion cohort.
 * Only EVS-02 and EVS-03 are selected for immutable promotion.
 * Six over-promoted controls are dispositioned separately (not selected for promotion).
 */

import { buildBatch6ReadinessInventory, type Batch6ReadinessRow } from "./batch6-readiness-inventory";
import {
  BATCH6_PROMOTED_CONTROL_IDS,
  BATCH6_RETURNED_TO_PARTIAL,
} from "./batch6-overpromotion-disposition";

export type Batch6SelectionRow = {
  controlId: string;
  selected: true;
  rank: number;
  totalScore: number;
  familyCode: string;
  reason: string;
  requiredContracts: string[];
  esaInputBasis: string;
};

/** Promotion cohort only — EVS structured evidence-state controls. */
export const BATCH6_SELECTED_CONTROL_IDS: readonly string[] = [...BATCH6_PROMOTED_CONTROL_IDS];

const SELECTION_REASONS: Record<string, string> = {
  "MAA2-EVS-02-STATE-ENUM":
    "Evidence identity/state: unknown inferredSourceState enum on nonempty evidenceStates; structured named-control receipts.",
  "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED":
    "Evidence reliability: unreliable without source-bound reason note on fiveAnswers rows; structured named-control receipts.",
};

export function buildBatch6Selection(inventoryRows?: Batch6ReadinessRow[]): {
  schemaVersion: string;
  selectedCount: number;
  selected: Batch6SelectionRow[];
  returnedToPartial: typeof BATCH6_RETURNED_TO_PARTIAL;
  notSelectedPrioritySample: Array<{ controlId: string; reason: string }>;
  excludedFid10: true;
  excludedPhraseProbe: true;
  honestyNote: string;
} {
  const inv = inventoryRows ?? buildBatch6ReadinessInventory().rows;
  const byId = new Map(inv.map((r) => [r.controlId, r]));

  const selected: Batch6SelectionRow[] = BATCH6_SELECTED_CONTROL_IDS.map((controlId, i) => {
    const row = byId.get(controlId);
    if (!row || row.phraseProbeOnly || row.excludedFid10) {
      throw new Error(`Batch-6 selection invalid for ${controlId}`);
    }
    return {
      controlId,
      selected: true as const,
      rank: i + 1,
      totalScore: row.totalScore,
      familyCode: row.familyCode,
      reason: SELECTION_REASONS[controlId] ?? row.notes,
      requiredContracts: ["positive", "multiple_safe_negatives", "unavailable_input", "mutation"],
      esaInputBasis: "non-synthetic ESA nonempty:/evidenceStates or nonempty:/fiveAnswersEvidenceRows",
    };
  });

  const selectedSet = new Set(BATCH6_SELECTED_CONTROL_IDS);
  const returnedSet = new Set(BATCH6_RETURNED_TO_PARTIAL.map((r) => r.controlId));
  const notSelectedPrioritySample = inv
    .filter((r) => r.priorityFamily && !selectedSet.has(r.controlId))
    .slice(0, 40)
    .map((r) => {
      const returned = BATCH6_RETURNED_TO_PARTIAL.find((x) => x.controlId === r.controlId);
      return {
        controlId: r.controlId,
        reason: returned
          ? returned.promotionBlockedReason
          : r.excludedFid10
            ? "FID-10 excluded — no new source-binding capability; remains partial"
            : r.phraseProbeOnly
              ? "phrase_probe_only — not selected for promotion"
              : r.promotionBlockedReason ??
                "Not in Batch-6 honesty-corrected promotion cohort — remains partially_implemented",
      };
    });

  return {
    schemaVersion: "batch6-selection@1.1.0",
    selectedCount: selected.length,
    selected,
    returnedToPartial: BATCH6_RETURNED_TO_PARTIAL,
    notSelectedPrioritySample,
    excludedFid10: true,
    excludedPhraseProbe: true,
    honestyNote: `Promoted ${selected.length}; returned ${returnedSet.size} over-promoted narrow probes to partially_implemented.`,
  };
}

export const BATCH6_SELECTED_SET = new Set(BATCH6_SELECTED_CONTROL_IDS);
