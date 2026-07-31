/**
 * Stage-300 Batch-A shared adapters — wrap Batch-8 fail-closed adapters.
 * Dual channel: casebrain_output + structured_packet. Never invent.
 */

import {
  adaptChargeInstruments,
  adaptChaseRelationships,
  adaptChronologyEvents,
  adaptEvidenceUnits,
  adaptExitSnapshots,
  adaptProvenance,
} from "../../stage150/batch8/adapters";
import type { Batch8AdapterResult } from "../../stage150/batch8/schemas";
import {
  BATCH_A_ADAPTER_IDS,
  BATCH_A_SCHEMA_VERSION,
  type BatchAAdapterId,
  type BatchACapabilityStatus,
  type BatchASourceChannel,
} from "./constants";
import { projectStructuredPacketToAdapterBag } from "./project-structured-packet";

export type BatchAAdapterRun = {
  schemaVersion: typeof BATCH_A_SCHEMA_VERSION;
  adapterId: BatchAAdapterId;
  caseId: string;
  channel: BatchASourceChannel;
  capabilityStatus: BatchACapabilityStatus;
  opensTruth: false;
  invented: false;
  batch8AdapterId: string;
  applicableRecordCount: number;
  completeRecordCount: number;
  incompleteRecordCount: number;
  ambiguousRelationshipCount: number;
  missingRequiredFields: string[];
  blockers: string[];
  eligibilityReason: string;
  fieldEvidenceRefs: string[];
  namedControlExerciseStatus: "not_exercised";
  note: string;
  dualStatus: {
    schemaValidRepresentation: BatchACapabilityStatus;
    schemaValidReason: string;
    namedControlPrerequisiteComplete: BatchACapabilityStatus;
    namedPrerequisiteReason: string;
    note: "schemaValidRepresentation ≠ namedControlPrerequisiteComplete";
  };
  exclusionLedger?: Batch8AdapterResult<unknown>["exclusionLedger"];
  chaseRelationshipCounts?: Batch8AdapterResult<unknown>["chaseRelationshipCounts"];
  provenancePageClassCounts?: Batch8AdapterResult<unknown>["provenancePageClassCounts"];
};

function wrap(
  adapterId: BatchAAdapterId,
  channel: BatchASourceChannel,
  batch8: Batch8AdapterResult<unknown>,
  note: string,
): BatchAAdapterRun {
  return {
    schemaVersion: BATCH_A_SCHEMA_VERSION,
    adapterId,
    caseId: batch8.caseId,
    channel,
    capabilityStatus: batch8.capabilityStatus,
    opensTruth: false,
    invented: false,
    batch8AdapterId: batch8.adapterId,
    applicableRecordCount: batch8.applicableRecordCount,
    completeRecordCount: batch8.completeRecordCount,
    incompleteRecordCount: batch8.incompleteRecordCount,
    ambiguousRelationshipCount: batch8.ambiguousRelationshipCount,
    missingRequiredFields: batch8.missingRequiredFields,
    blockers: batch8.blockers,
    eligibilityReason: batch8.eligibilityReason,
    fieldEvidenceRefs: batch8.fieldReceipts.map((r) => r.sourcePointer).slice(0, 40),
    namedControlExerciseStatus: "not_exercised",
    note,
    dualStatus: batch8.dualStatus,
    exclusionLedger: batch8.exclusionLedger,
    chaseRelationshipCounts: batch8.chaseRelationshipCounts,
    provenancePageClassCounts: batch8.provenancePageClassCounts,
  };
}

export type BatchAPacketInputs = {
  caseId: string;
  casebrainOutput: Record<string, unknown> | null;
  structuredPacket: Record<string, unknown> | null;
};

export type BatchAPacketAdapterBundle = {
  caseId: string;
  channels: {
    casebrain_output: BatchAAdapterRun[];
    structured_packet: BatchAAdapterRun[];
  };
  /** Best capability per adapter across channels (eligible > partial > unavailable). */
  rollupByAdapter: Record<
    BatchAAdapterId,
    {
      bestStatus: BatchACapabilityStatus;
      bestChannel: BatchASourceChannel | null;
      casebrainStatus: BatchACapabilityStatus | "absent";
      structuredPacketStatus: BatchACapabilityStatus | "absent";
    }
  >;
};

function rank(s: BatchACapabilityStatus | "absent"): number {
  if (s === "eligible") return 3;
  if (s === "partial") return 2;
  if (s === "unavailable") return 1;
  return 0;
}

function runChannel(
  caseId: string,
  channel: BatchASourceChannel,
  bag: Record<string, unknown>,
): BatchAAdapterRun[] {
  return [
    wrap(
      "structured_charge_instrument_graph",
      channel,
      adaptChargeInstruments(caseId, bag),
      "Shared charge-instrument graph; never derived from court prose.",
    ),
    wrap(
      "timezone_aware_chronology_events",
      channel,
      adaptChronologyEvents(caseId, bag),
      "Timezone-aware chronology; competingEventGroupId only when explicit.",
    ),
    wrap(
      "evidence_unit_identity_with_aliases",
      channel,
      adaptEvidenceUnits(caseId, bag),
      "Evidence-unit identity/attribution; extract/full draft/signed axes only when explicit.",
    ),
    wrap(
      "source_vs_compiled_page_binding",
      channel,
      adaptProvenance(caseId, bag),
      "Provenance/page identity; unknown page stays null — never default page 1.",
    ),
    wrap(
      "chase_item_to_evidence_unit_edges",
      channel,
      adaptChaseRelationships(caseId, bag),
      "Chase→evidence edges only via explicit id or exact-label; ambiguous = not complete.",
    ),
    wrap(
      "view_copy_export_api_pdf_composed_prose_capture",
      channel,
      adaptExitSnapshots(caseId, bag),
      "Genuine multi-exit binding from exitPayloadReceipts; metadata alone ≠ real exit.",
    ),
  ];
}

export function runBatchAAdapters(inputs: BatchAPacketInputs): BatchAPacketAdapterBundle {
  const casebrainRuns = inputs.casebrainOutput
    ? runChannel(inputs.caseId, "casebrain_output", inputs.casebrainOutput)
    : [];
  const structuredRuns = inputs.structuredPacket
    ? runChannel(
        inputs.caseId,
        "structured_packet",
        projectStructuredPacketToAdapterBag(inputs.structuredPacket),
      )
    : [];

  const rollupByAdapter = {} as BatchAPacketAdapterBundle["rollupByAdapter"];
  for (const id of BATCH_A_ADAPTER_IDS) {
    const cb = casebrainRuns.find((r) => r.adapterId === id);
    const sp = structuredRuns.find((r) => r.adapterId === id);
    const casebrainStatus = cb?.capabilityStatus ?? "absent";
    const structuredPacketStatus = sp?.capabilityStatus ?? "absent";
    let bestStatus: BatchACapabilityStatus = "unavailable";
    let bestChannel: BatchASourceChannel | null = null;
    if (rank(structuredPacketStatus) >= rank(casebrainStatus) && structuredPacketStatus !== "absent") {
      bestStatus = structuredPacketStatus as BatchACapabilityStatus;
      bestChannel = "structured_packet";
    } else if (casebrainStatus !== "absent") {
      bestStatus = casebrainStatus as BatchACapabilityStatus;
      bestChannel = "casebrain_output";
    }
    if (rank(casebrainStatus) > rank(structuredPacketStatus) && casebrainStatus !== "absent") {
      bestStatus = casebrainStatus as BatchACapabilityStatus;
      bestChannel = "casebrain_output";
    }
    rollupByAdapter[id] = {
      bestStatus,
      bestChannel,
      casebrainStatus,
      structuredPacketStatus,
    };
  }

  return {
    caseId: inputs.caseId,
    channels: {
      casebrain_output: casebrainRuns,
      structured_packet: structuredRuns,
    },
    rollupByAdapter,
  };
}

export { BATCH_A_ADAPTER_IDS };
