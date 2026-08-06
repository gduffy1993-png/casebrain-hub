/**
 * Batch-B dual-status honesty — schemaValidRepresentation ≠ namedControlPrerequisiteComplete.
 */

import type { BatchAAdapterId, BatchACapabilityStatus } from "../batch-a/constants";
import type { BatchAPacketAdapterBundle } from "../batch-a/adapters";
import { BATCH_B_FOCUS_ADAPTER_IDS, type BatchBFocusAdapterId } from "./constants";

export type DualStatusCounts = {
  schemaValidEligible: number;
  schemaValidPartial: number;
  schemaValidUnavailable: number;
  namedPrerequisiteEligible: number;
  namedPrerequisitePartial: number;
  namedPrerequisiteUnavailable: number;
};

export type FocusAdapterDualRollup = {
  adapterId: BatchBFocusAdapterId;
  dual: DualStatusCounts;
  chaseRelationshipTotals?: {
    linked: number;
    unresolved: number;
    unavailable: number;
    ambiguous: number;
  };
  provenancePageClassTotals?: Record<string, number>;
  exclusionLedgerEntries: number;
  note: string;
};

function pickBestChannel(bundle: BatchAPacketAdapterBundle, adapterId: BatchAAdapterId) {
  const roll = bundle.rollupByAdapter[adapterId];
  const channel = roll.bestChannel;
  if (!channel) return null;
  return bundle.channels[channel].find((r) => r.adapterId === adapterId) ?? null;
}

export function summarizeDualStatusAcross120(args: {
  bundles: BatchAPacketAdapterBundle[];
}): {
  schemaVersion: "stage300-batch-b-dual-status-summary@1.0.0";
  scanned: number;
  byFocusAdapter: FocusAdapterDualRollup[];
  honestyRule: string;
} {
  const byFocusAdapter: FocusAdapterDualRollup[] = [];

  for (const adapterId of BATCH_B_FOCUS_ADAPTER_IDS) {
    const dual: DualStatusCounts = {
      schemaValidEligible: 0,
      schemaValidPartial: 0,
      schemaValidUnavailable: 0,
      namedPrerequisiteEligible: 0,
      namedPrerequisitePartial: 0,
      namedPrerequisiteUnavailable: 0,
    };
    let exclusionLedgerEntries = 0;
    const chaseTotals = { linked: 0, unresolved: 0, unavailable: 0, ambiguous: 0 };
    const provTotals: Record<string, number> = {
      exact_source_page: 0,
      compiled_page_only: 0,
      document_only: 0,
      honest_unknown_page: 0,
      invalid_defaulted: 0,
    };
    let sawChase = false;
    let sawProv = false;

    for (const bundle of args.bundles) {
      const run = pickBestChannel(bundle, adapterId);
      if (!run) {
        dual.schemaValidUnavailable += 1;
        dual.namedPrerequisiteUnavailable += 1;
        continue;
      }
      const s = run.dualStatus.schemaValidRepresentation as BatchACapabilityStatus;
      const n = run.dualStatus.namedControlPrerequisiteComplete as BatchACapabilityStatus;
      if (s === "eligible") dual.schemaValidEligible += 1;
      else if (s === "partial") dual.schemaValidPartial += 1;
      else dual.schemaValidUnavailable += 1;
      if (n === "eligible") dual.namedPrerequisiteEligible += 1;
      else if (n === "partial") dual.namedPrerequisitePartial += 1;
      else dual.namedPrerequisiteUnavailable += 1;

      exclusionLedgerEntries += run.exclusionLedger?.length ?? 0;
      if (run.chaseRelationshipCounts) {
        sawChase = true;
        chaseTotals.linked += run.chaseRelationshipCounts.linked;
        chaseTotals.unresolved += run.chaseRelationshipCounts.unresolved;
        chaseTotals.unavailable += run.chaseRelationshipCounts.unavailable;
        chaseTotals.ambiguous += run.chaseRelationshipCounts.ambiguous;
      }
      if (run.provenancePageClassCounts) {
        sawProv = true;
        for (const [k, v] of Object.entries(run.provenancePageClassCounts)) {
          provTotals[k] = (provTotals[k] ?? 0) + v;
        }
      }
    }

    byFocusAdapter.push({
      adapterId,
      dual,
      chaseRelationshipTotals: sawChase ? chaseTotals : undefined,
      provenancePageClassTotals: sawProv ? provTotals : undefined,
      exclusionLedgerEntries,
      note:
        adapterId === "chase_item_to_evidence_unit_edges"
          ? "Unresolved without evidenceUnitId is schema-valid only; never named-control linked-edge complete."
          : adapterId === "source_vs_compiled_page_binding"
            ? "honest_unknown_page is schema-valid; exact-page prerequisite requires pageIdentityKnown+pages."
            : "schemaValidRepresentation ≠ namedControlPrerequisiteComplete",
    });
  }

  return {
    schemaVersion: "stage300-batch-b-dual-status-summary@1.0.0",
    scanned: args.bundles.length,
    byFocusAdapter,
    honestyRule:
      "Never treat schema-valid unresolved/unknown data as complete named-control evidence.",
  };
}
