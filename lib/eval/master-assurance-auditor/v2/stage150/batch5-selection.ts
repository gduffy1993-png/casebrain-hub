/**
 * Batch-5 selection — only controls that can genuinely pursue full implementation
 * on existing non-synthetic ESA inputs. No predetermined count.
 */

import { buildBatch5ReadinessInventory, type Batch5ReadinessRow } from "./batch5-readiness-inventory";

export type Batch5SelectionRow = {
  controlId: string;
  selected: true;
  rank: number;
  totalScore: number;
  reason: string;
  requiredContracts: string[];
  esaInputBasis: string;
};

/**
 * Priority selection after inventory ranking.
 * Excludes all phrase_probe_only. Requires ESA wording (or chase rows for CHS) readiness.
 */
export const BATCH5_SELECTED_CONTROL_IDS: readonly string[] = [
  "MAA2-WRD-10-NO-PLACEHOLDERS",
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
  "MAA2-WRD-02-NO-MID-TRUNCATION",
  "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
  "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
  "MAA2-FID-10-QUOTATION-FIDELITY",
] as const;

const SELECTION_REASONS: Record<string, string> = {
  "MAA2-WRD-10-NO-PLACEHOLDERS":
    "High safety/usefulness; control-specific placeholder/dev-leak logic on included solicitor-visible wording; ESA inputs non-synthetic; clear positive/negative shape.",
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF":
    "Safety-critical absolute-proof ban; wording-only ESA inputs; deterministic string detector.",
  "MAA2-WRD-02-NO-MID-TRUNCATION":
    "Solicitor-visible truncation defects; ESA wording; requires FP triage on hyphenated endings before promotion.",
  "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK":
    "Highest safety: internal/audit language must never leak to solicitor-visible exits; Batch-2 detector on ESA wording.",
  "MAA2-LSL-02-NO-ALLEGE-TO-FACT":
    "Charge-integrity allege→fact collapse; ESA wording; existing intelligence contracts to extend with mutation.",
  "MAA2-FID-10-QUOTATION-FIDELITY":
    "Most advanced prior calibration path (occurrence-aware); ESA wording; freeze-before-source pattern already proven in Batch-2/3.",
};

export function buildBatch5Selection(inventoryRows?: Batch5ReadinessRow[]): {
  schemaVersion: string;
  selectedCount: number;
  selected: Batch5SelectionRow[];
  notSelectedCount: number;
  notSelectedSampleReasons: Array<{ controlId: string; reason: string }>;
} {
  const inv = inventoryRows ?? buildBatch5ReadinessInventory().rows;
  const byId = new Map(inv.map((r) => [r.controlId, r]));

  const selected: Batch5SelectionRow[] = BATCH5_SELECTED_CONTROL_IDS.map((controlId, i) => {
    const row = byId.get(controlId);
    if (!row || row.phraseProbeOnly) {
      throw new Error(`Batch-5 selection invalid for ${controlId}`);
    }
    return {
      controlId,
      selected: true as const,
      rank: i + 1,
      totalScore: row.totalScore,
      reason: SELECTION_REASONS[controlId] ?? row.notes,
      requiredContracts: [
        "positive",
        "multiple_safe_negatives",
        "unavailable_input",
        "mutation",
      ],
      esaInputBasis: "casebrain-output.json + included_solicitor_visible_wording (non-synthetic ESA packets)",
    };
  });

  const selectedSet = new Set(BATCH5_SELECTED_CONTROL_IDS);
  const notSelectedSampleReasons = inv
    .filter((r) => !selectedSet.has(r.controlId))
    .slice(0, 40)
    .map((r) => ({
      controlId: r.controlId,
      reason:
        r.promotionBlockedReason ??
        (r.totalScore < 30
          ? "Lower readiness score vs selected cohort; remains partially_implemented"
          : "Not in Batch-5 priority cohort this unit — remains partially_implemented"),
    }));

  return {
    schemaVersion: "batch5-selection@1.0.0",
    selectedCount: selected.length,
    selected,
    notSelectedCount: inv.length - selected.length,
    notSelectedSampleReasons,
  };
}

export const BATCH5_SELECTED_SET = new Set(BATCH5_SELECTED_CONTROL_IDS);
