/**
 * Batch-A adapter registry — 6 shared engineering jobs (not 43 control completions).
 */

import {
  BATCH_A_ADAPTER_IDS,
  BATCH_A_BASELINE,
  BATCH_A_SCHEMA_VERSION,
  type BatchAAdapterId,
  type BatchATheme,
} from "./constants";
import { BATCH_A_ESSENTIAL_OWNERSHIP, engineeringJobsNotControls } from "./ownership";

export type AdapterRegistryEntry = {
  adapterId: BatchAAdapterId;
  theme: BatchATheme;
  implementationPriority: number;
  status: "adapter_foundation_only";
  substantiveEvaluatorImplemented: false;
  calibrationPending: true;
  failClosed: true;
  neverInvent: true;
  batch8UnderlyingAdapterId: string;
  unlockedEssentialControlIds: string[];
  relatedEssentialControlIds: string[];
  duplicateRiskCluster: string;
  stage300AcceptanceRequirement: string;
  engineeringJobCount: 1;
};

const ADAPTER_META: Record<
  BatchAAdapterId,
  {
    theme: BatchATheme;
    priority: number;
    batch8Id: string;
    cluster: string;
    acceptance: string;
  }
> = {
  structured_charge_instrument_graph: {
    theme: "structured_charge_instruments",
    priority: 1,
    batch8Id: "charge_instruments",
    cluster: "charge_instrument_graph",
    acceptance:
      "Eligible chargeInstruments[] + category-set evaluator + contracts + calibration (LSL-05).",
  },
  timezone_aware_chronology_events: {
    theme: "chronology_competing_timestamps",
    priority: 2,
    batch8Id: "chronology_events",
    cluster: "chronology_procedural_state",
    acceptance:
      "Eligible chronologyEvents[] + control-specific evaluators (CHR/PRC) + contracts + calibration.",
  },
  evidence_unit_identity_with_aliases: {
    theme: "evidence_unit_identity_attribution",
    priority: 3,
    batch8Id: "evidence_units",
    cluster: "evidence_unit_identity",
    acceptance:
      "Eligible evidence-unit identity/attribution bags on new Stage-300 packets; deepen-partial ATR/EVS evaluators later. Not an essential-43 unlock in Batch A.",
  },
  source_vs_compiled_page_binding: {
    theme: "provenance_page_identity",
    priority: 4,
    batch8Id: "provenance",
    cluster: "provenance_page_identity",
    acceptance:
      "Eligible pageIdentityKnown provenance; SRC/FID deepen-partials later. Heavy OCR remains separate (priority 9).",
  },
  chase_item_to_evidence_unit_edges: {
    theme: "chase_relationships",
    priority: 5,
    batch8Id: "chase_relationships",
    cluster: "chase_evidence_edges",
    acceptance:
      "Eligible explicit chase→evidence edges; CHS deepen-partials later. Not an essential-43 unlock in Batch A.",
  },
  view_copy_export_api_pdf_composed_prose_capture: {
    theme: "genuine_non_browser_exits",
    priority: 7,
    batch8Id: "exit_snapshots",
    cluster: "genuine_multi_exit",
    acceptance:
      "All required genuine exit payloads bound; supports ELD/AUD/XPP later. Metadata ≠ exit.",
  },
};

export function buildAdapterRegistry(): {
  schemaVersion: "stage300-batch-a-adapter-registry@1.0.0";
  baselineCommit: typeof BATCH_A_BASELINE;
  batchASchemaVersion: typeof BATCH_A_SCHEMA_VERSION;
  engineeringJobs: ReturnType<typeof engineeringJobsNotControls>;
  adapterCount: 6;
  unlockedEssentialControlCount: number;
  adapters: AdapterRegistryEntry[];
  note: string;
} {
  const adapters: AdapterRegistryEntry[] = BATCH_A_ADAPTER_IDS.map((adapterId) => {
    const meta = ADAPTER_META[adapterId];
    const unlocked = BATCH_A_ESSENTIAL_OWNERSHIP.filter(
      (r) => r.batchAInScope && r.owningAdapterId === adapterId,
    ).map((r) => r.controlId);
    const related = [...new Set(unlocked.flatMap((id) => {
      const row = BATCH_A_ESSENTIAL_OWNERSHIP.find((r) => r.controlId === id);
      return row?.relatedControlIds ?? [];
    }))];
    return {
      adapterId,
      theme: meta.theme,
      implementationPriority: meta.priority,
      status: "adapter_foundation_only" as const,
      substantiveEvaluatorImplemented: false as const,
      calibrationPending: true as const,
      failClosed: true as const,
      neverInvent: true as const,
      batch8UnderlyingAdapterId: meta.batch8Id,
      unlockedEssentialControlIds: unlocked,
      relatedEssentialControlIds: related,
      duplicateRiskCluster: meta.cluster,
      stage300AcceptanceRequirement: meta.acceptance,
      engineeringJobCount: 1 as const,
    };
  });

  return {
    schemaVersion: "stage300-batch-a-adapter-registry@1.0.0",
    baselineCommit: BATCH_A_BASELINE,
    batchASchemaVersion: BATCH_A_SCHEMA_VERSION,
    engineeringJobs: engineeringJobsNotControls(),
    adapterCount: 6,
    unlockedEssentialControlCount: adapters.reduce(
      (n, a) => n + a.unlockedEssentialControlIds.length,
      0,
    ),
    adapters,
    note:
      "Six shared adapter jobs only. Do not double-count one adapter as multiple completed engineering jobs when multiple controls share it.",
  };
}

export function buildOwnershipDedupGraph(): {
  schemaVersion: "stage300-batch-a-ownership-dedup-graph@1.0.0";
  essentialControlCount: 43;
  engineeringJobCount: 6;
  clusters: Array<{
    duplicateRiskCluster: string;
    adapterIds: BatchAAdapterId[];
    controlIds: string[];
    batchAInScope: boolean;
    note: string;
  }>;
  rows: typeof BATCH_A_ESSENTIAL_OWNERSHIP;
} {
  const clusterMap = new Map<
    string,
    {
      duplicateRiskCluster: string;
      adapterIds: Set<BatchAAdapterId>;
      controlIds: string[];
      batchAInScope: boolean;
    }
  >();

  for (const row of BATCH_A_ESSENTIAL_OWNERSHIP) {
    const existing = clusterMap.get(row.duplicateRiskCluster) ?? {
      duplicateRiskCluster: row.duplicateRiskCluster,
      adapterIds: new Set<BatchAAdapterId>(),
      controlIds: [],
      batchAInScope: row.batchAInScope,
    };
    existing.controlIds.push(row.controlId);
    if (row.owningAdapterId) existing.adapterIds.add(row.owningAdapterId);
    existing.batchAInScope = existing.batchAInScope || row.batchAInScope;
    clusterMap.set(row.duplicateRiskCluster, existing);
  }

  // Also register adapter-only clusters (evidence/provenance/chase/exits) with zero essential unlocks.
  for (const a of BATCH_A_ADAPTER_IDS) {
    const meta = ADAPTER_META[a];
    if (!clusterMap.has(meta.cluster)) {
      clusterMap.set(meta.cluster, {
        duplicateRiskCluster: meta.cluster,
        adapterIds: new Set([a]),
        controlIds: [],
        batchAInScope: true,
      });
    } else {
      clusterMap.get(meta.cluster)!.adapterIds.add(a);
    }
  }

  return {
    schemaVersion: "stage300-batch-a-ownership-dedup-graph@1.0.0",
    essentialControlCount: 43,
    engineeringJobCount: 6,
    clusters: [...clusterMap.values()].map((c) => ({
      duplicateRiskCluster: c.duplicateRiskCluster,
      adapterIds: [...c.adapterIds],
      controlIds: c.controlIds,
      batchAInScope: c.batchAInScope,
      note: c.batchAInScope
        ? c.controlIds.length
          ? "One shared adapter serves this control cluster — count 1 engineering job."
          : "Adapter foundation registered; no essential-43 control unlocked yet."
        : "Out of Batch-A scope — later batch.",
    })),
    rows: BATCH_A_ESSENTIAL_OWNERSHIP,
  };
}
