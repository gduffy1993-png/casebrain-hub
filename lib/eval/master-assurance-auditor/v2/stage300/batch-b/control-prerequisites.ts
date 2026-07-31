/**
 * Recompute 43 essential controls using exact per-control prerequisites.
 * Adapter schema-valid ≠ named prerequisite complete ≠ evaluator unlocked.
 */

import type { BatchACapabilityStatus } from "../batch-a/constants";
import { BATCH_A_ESSENTIAL_OWNERSHIP } from "../batch-a/ownership";
import { BATCH_A_SIX_CONTROL_IDS } from "../batch-a/evaluators/constants";
import type { FocusAdapterDualRollup } from "./dual-status";

export type ControlPrerequisiteRow = {
  controlId: string;
  adapterDependencyId: string | null;
  adapterDependencySatisfied: boolean;
  namedPrerequisiteComplete: boolean;
  partiallyAvailable: boolean;
  unavailable: boolean;
  blockerRemoved: string | null;
  blockersRemaining: string[];
  whyStillBlockedDespiteValidAdapters: string;
  afterStatus: string;
};

function adapterSatisfied(
  dual: FocusAdapterDualRollup | undefined,
  mode: "schema" | "named",
): { satisfied: boolean; partial: boolean; unavailable: boolean } {
  if (!dual) return { satisfied: false, partial: false, unavailable: true };
  const el =
    mode === "schema" ? dual.dual.schemaValidEligible : dual.dual.namedPrerequisiteEligible;
  const pa =
    mode === "schema" ? dual.dual.schemaValidPartial : dual.dual.namedPrerequisitePartial;
  const un =
    mode === "schema"
      ? dual.dual.schemaValidUnavailable
      : dual.dual.namedPrerequisiteUnavailable;
  return {
    satisfied: el === 120,
    partial: pa > 0 && el < 120,
    unavailable: un === 120 && el === 0 && pa === 0,
  };
}

export function recomputeEssential43(args: {
  focusDual: FocusAdapterDualRollup[];
  chargeNamedEligible: number;
  chronologyNamedEligible: number;
}): {
  schemaVersion: "stage300-batch-b-43-prerequisite-recompute@1.0.0";
  unlockedEssentialControlIds: string[];
  remainingBlockedCount: number;
  afterStatusTotals: Record<string, number>;
  rows: ControlPrerequisiteRow[];
  note: string;
} {
  const byId = Object.fromEntries(args.focusDual.map((d) => [d.adapterId, d]));
  const six = new Set<string>(BATCH_A_SIX_CONTROL_IDS);
  const unlockedEssentialControlIds: string[] = [];
  const afterStatusTotals: Record<string, number> = {};

  const rows: ControlPrerequisiteRow[] = BATCH_A_ESSENTIAL_OWNERSHIP.map((own) => {
    const blockers: string[] = [];
    let adapterDependencySatisfied = false;
    let namedPrerequisiteComplete = false;
    let partiallyAvailable = false;
    let unavailable = true;
    let blockerRemoved: string | null = null;
    let why = "";

    if (own.controlId.startsWith("MAA2-SRC-")) {
      blockers.push("Heavy PDF/OCR/binary adapters + original source documents required");
      why =
        "Evidence/provenance/chase/exit adapters do not supply OCR/binary redaction/pagination/password/attachment receipts.";
    } else if (six.has(own.controlId)) {
      const chargeOk = args.chargeNamedEligible === 120;
      const chronOk = args.chronologyNamedEligible === 120;
      adapterDependencySatisfied =
        own.controlId === "MAA2-LSL-05-CATEGORY-SET-COVERAGE" ? chargeOk : chronOk;
      namedPrerequisiteComplete = false; // specialty bags absent on Stage-150 packets
      partiallyAvailable = false;
      unavailable = true;
      blockerRemoved = adapterDependencySatisfied
        ? "Shared charge/chronology adapter foundation eligible on 120"
        : null;
      blockers.push(
        "Specialty structured fields (legalStateTaxonomy / dobAgeCalcLedger / proceduralPartyState) absent on Stage-150 packets",
        "Batch-A substantive evaluator pending review — not promoted; eligible denominator remains 0",
      );
      why =
        "Adapter dependency may be satisfied, but named control prerequisites (specialty taxonomy/calc/party bags) are still absent — schema-valid shared adapters ≠ control-complete.";
    } else if (own.controlId.startsWith("MAA2-AUD-") || own.controlId.startsWith("MAA2-XPP-")) {
      const exits = byId["view_copy_export_api_pdf_composed_prose_capture"];
      const exitSchema = adapterSatisfied(exits, "schema");
      adapterDependencySatisfied = exitSchema.satisfied;
      namedPrerequisiteComplete = false;
      partiallyAvailable = exitSchema.satisfied;
      unavailable = !exitSchema.satisfied;
      blockerRemoved = exitSchema.satisfied
        ? "Genuine six-exit production payloads present (schema-valid multi-exit)"
        : null;
      blockers.push(
        "Multi-audience / perspective surface packs required beyond shared exit capture",
        "Exit payload presence ≠ audience-specific comparison detector inputs",
      );
      why =
        "Multi-exit adapter may be schema-valid, but AUD/XPP require independent audience/perspective packs and named evaluators — not unlocked by exit capture alone.";
    } else if (own.controlId.startsWith("MAA2-VDR-") || own.controlId.startsWith("MAA2-ELD-")) {
      blockers.push("Non-synthetic version-pair / ELD-VDR adapters + evaluators required");
      why =
        "Evidence/provenance/chase/exit foundations do not provide version-pair hashes, frozen draft lineage, or ELD sentence receipts.";
    } else {
      blockers.push(own.stage300AcceptanceRequirement);
      why = "Outside Batch-B four-adapter remediation scope.";
    }

    // Focus adapters never map to essential ownership rows as owningAdapterId —
    // evidence/provenance/chase are deepen-partials outside the 43.
    if (
      own.owningAdapterId === "evidence_unit_identity_with_aliases" ||
      own.owningAdapterId === "source_vs_compiled_page_binding" ||
      own.owningAdapterId === "chase_item_to_evidence_unit_edges" ||
      own.owningAdapterId === "view_copy_export_api_pdf_composed_prose_capture"
    ) {
      const d = byId[own.owningAdapterId];
      const named = adapterSatisfied(d, "named");
      const schema = adapterSatisfied(d, "schema");
      adapterDependencySatisfied = schema.satisfied || named.partial;
      namedPrerequisiteComplete = named.satisfied;
      partiallyAvailable = named.partial || (schema.satisfied && !named.satisfied);
      unavailable = named.unavailable && schema.unavailable;
    }

    const afterStatus = six.has(own.controlId)
      ? "substantive_evaluator_implemented_pending_review"
      : own.beforeStatus;
    afterStatusTotals[afterStatus] = (afterStatusTotals[afterStatus] ?? 0) + 1;

    return {
      controlId: own.controlId,
      adapterDependencyId: own.owningAdapterId,
      adapterDependencySatisfied,
      namedPrerequisiteComplete,
      partiallyAvailable,
      unavailable,
      blockerRemoved,
      blockersRemaining: blockers.length ? blockers : [own.stage300AcceptanceRequirement],
      whyStillBlockedDespiteValidAdapters: why,
      afterStatus,
    };
  });

  return {
    schemaVersion: "stage300-batch-b-43-prerequisite-recompute@1.0.0",
    unlockedEssentialControlIds,
    remainingBlockedCount: 43 - unlockedEssentialControlIds.length,
    afterStatusTotals,
    rows,
    note:
      "Zero essential controls unlocked. Schema-valid shared adapters never auto-satisfy named-control prerequisites or promote evaluators.",
  };
}

export type { BatchACapabilityStatus };
