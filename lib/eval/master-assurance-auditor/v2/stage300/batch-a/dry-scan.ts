/**
 * Truth-blind capability dry scan — 120 Cohort-B genuine-output packets only.
 * No candidates, verdicts, or truth opening.
 */

import fs from "node:fs";
import path from "node:path";

import type { PopulationFreezeReceipt } from "../../stage150/calibration/population-freeze";
import { BATCH_A_ADAPTER_IDS, type BatchAAdapterId } from "./constants";
import { runBatchAAdapters, type BatchAPacketAdapterBundle } from "./adapters";

export type PacketCapabilityReceipt = {
  caseId: string;
  cohort: "B";
  projectionOnly: false;
  casebrainOutputRelativePath: string | null;
  packetRelativePath: string;
  truthOpened: false;
  adapters: BatchAPacketAdapterBundle;
};

export type DryScanSummary = {
  schemaVersion: "stage300-batch-a-120-capability-summary@1.0.0";
  scanned: number;
  expected: 120;
  projectionOnlyExcluded: 30;
  truthOpened: false;
  candidatesGenerated: false;
  byAdapter: Record<
    BatchAAdapterId,
    {
      eligible: number;
      partial: number;
      unavailable: number;
      /** Prefer structured_packet channel for rollup when present. */
      rollupBasis: "best_across_channels";
    }
  >;
};

export function runTruthBlind120CapabilityScan(args: {
  repoRoot: string;
  freeze: PopulationFreezeReceipt;
}): { receipts: PacketCapabilityReceipt[]; summary: DryScanSummary } {
  const cohortB = args.freeze.membership.filter((m) => m.cohort === "B");
  if (cohortB.length !== 120) {
    throw new Error(`Expected 120 Cohort-B membership rows, got ${cohortB.length}`);
  }

  const receipts: PacketCapabilityReceipt[] = [];
  const totals = Object.fromEntries(
    BATCH_A_ADAPTER_IDS.map((id) => [id, { eligible: 0, partial: 0, unavailable: 0 }]),
  ) as DryScanSummary["byAdapter"];

  for (const row of cohortB) {
    const outAbs = row.casebrainOutputRelativePath
      ? path.join(args.repoRoot, row.casebrainOutputRelativePath)
      : null;
    const packetAbs = path.join(args.repoRoot, row.packetRelativePath);

    const casebrainOutput =
      outAbs && fs.existsSync(outAbs)
        ? (JSON.parse(fs.readFileSync(outAbs, "utf8")) as Record<string, unknown>)
        : null;
    const structuredPacket = fs.existsSync(packetAbs)
      ? (JSON.parse(fs.readFileSync(packetAbs, "utf8")) as Record<string, unknown>)
      : null;

    // Truth keys are never read on this path (casebrain-output + structured packet only).

    const adapters = runBatchAAdapters({
      caseId: row.caseId,
      casebrainOutput,
      structuredPacket,
    });

    for (const id of BATCH_A_ADAPTER_IDS) {
      const best = adapters.rollupByAdapter[id].bestStatus;
      totals[id][best] += 1;
    }

    receipts.push({
      caseId: row.caseId,
      cohort: "B",
      projectionOnly: false,
      casebrainOutputRelativePath: row.casebrainOutputRelativePath,
      packetRelativePath: row.packetRelativePath,
      truthOpened: false,
      adapters,
    });
  }

  const byAdapter = {} as DryScanSummary["byAdapter"];
  for (const id of BATCH_A_ADAPTER_IDS) {
    byAdapter[id] = { ...totals[id], rollupBasis: "best_across_channels" };
  }

  return {
    receipts,
    summary: {
      schemaVersion: "stage300-batch-a-120-capability-summary@1.0.0",
      scanned: receipts.length,
      expected: 120,
      projectionOnlyExcluded: 30,
      truthOpened: false,
      candidatesGenerated: false,
      byAdapter,
    },
  };
}
