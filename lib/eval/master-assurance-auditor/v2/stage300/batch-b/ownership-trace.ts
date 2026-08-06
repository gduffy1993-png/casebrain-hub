/**
 * Ownership trace — missing fields that kept the four adapters partial before Batch B.
 */

import type { BatchBFocusAdapterId, OwnershipLane } from "./constants";

export type OwnershipTraceRow = {
  adapterId: BatchBFocusAdapterId;
  fieldOrDefect: string;
  ownershipLane: OwnershipLane;
  beforeEffect: string;
  batchBDisposition: string;
  liveAppModified: false;
};

export const BATCH_B_OWNERSHIP_TRACE: readonly OwnershipTraceRow[] = [
  {
    adapterId: "evidence_unit_identity_with_aliases",
    fieldOrDefect: "provenance-only evidenceStates rows counted as incomplete evidence units",
    ownershipLane: "maa_adapter_projection",
    beforeEffect: "120/120 partial — complete fiveAnswers poisoned by page-only states",
    batchBDisposition:
      "adaptEvidenceUnits skips page-only states; projection keeps evidenceUnits on fiveAnswers only",
    liveAppModified: false,
  },
  {
    adapterId: "evidence_unit_identity_with_aliases",
    fieldOrDefect: "subjectDefendantId explicit unknown",
    ownershipLane: "maa_adapter_projection",
    beforeEffect: "Attribution required person/subject; unknown not modelled",
    batchBDisposition: "Explicit non-empty subjectDefendantId (incl. 'unknown') accepted; never invent",
    liveAppModified: false,
  },
  {
    adapterId: "source_vs_compiled_page_binding",
    fieldOrDefect: "fiveAnswers sourcePointer projected as note → false provenance limitations",
    ownershipLane: "maa_adapter_projection",
    beforeEffect: "120/120 partial — incomplete limitation-only rows from path notes",
    batchBDisposition:
      "Only explicit limitationReason/provenanceLimitation create limitation rows; complete provenance → evidenceStates",
    liveAppModified: false,
  },
  {
    adapterId: "source_vs_compiled_page_binding",
    fieldOrDefect: "compiledPage / pageIdentityKnown / sourceDocumentIdentity",
    ownershipLane: "batch10_materialisation_serialisation",
    beforeEffect: "Present on packet provenance[]; lost in Batch-A projection pollution",
    batchBDisposition: "Projection preserves complete provenance rows only; never default page 1",
    liveAppModified: false,
  },
  {
    adapterId: "chase_item_to_evidence_unit_edges",
    fieldOrDefect: "outstanding MG6C items without on-bundle evidence (Full signed MG11, Subscriber/account data)",
    ownershipLane: "genuinely_unavailable_source",
    beforeEffect: "257 unresolved chase rows; must not count as linked edges",
    batchBDisposition:
      "linkageStatus=unresolved + evidenceUnitId=null is schema-valid representation only; namedControlPrerequisiteComplete requires explicit linked evidenceUnitId",
    liveAppModified: false,
  },
  {
    adapterId: "chase_item_to_evidence_unit_edges",
    fieldOrDefect: "requestType / supportedReason / sourceBasis / outputSurfaces",
    ownershipLane: "maa_adapter_projection",
    beforeEffect: "Absent on projected chaseItems despite recoverable MG6C sourceRequestId",
    batchBDisposition:
      "Projected from requestIdDerivation note + resolutionState + sourcePointer; no offence-family inference",
    liveAppModified: false,
  },
  {
    adapterId: "chase_item_to_evidence_unit_edges",
    fieldOrDefect: "casebrain_output warningsAndGaps.chaseItems lack evidenceUnitId",
    ownershipLane: "existing_production_builder",
    beforeEffect: "casebrain channel partial; structured_packet channel is authority for Batch B",
    batchBDisposition: "Dual-channel rollup prefers structured_packet when stronger; production builder unchanged",
    liveAppModified: false,
  },
  {
    adapterId: "view_copy_export_api_pdf_composed_prose_capture",
    fieldOrDefect: "authenticated_browser required in eligibility denominator",
    ownershipLane: "maa_adapter_projection",
    beforeEffect: "120/120 partial at 6/7 despite six genuine production payloads",
    batchBDisposition:
      "Production eligibility = view/copy/export/api/pdf/composed_prose; authenticated_browser tracked separately/not_exercised",
    liveAppModified: false,
  },
  {
    adapterId: "view_copy_export_api_pdf_composed_prose_capture",
    fieldOrDefect: "payloadSchemaVersion / captureRunId / surfaceList",
    ownershipLane: "maa_adapter_projection",
    beforeEffect: "Payload hash present; enrichment fields not projected",
    batchBDisposition: "Projected as metadata alongside genuine payloadIdentity; metadata alone ≠ exit",
    liveAppModified: false,
  },
  {
    adapterId: "view_copy_export_api_pdf_composed_prose_capture",
    fieldOrDefect: "authenticated_browser real payload bytes",
    ownershipLane: "genuinely_unavailable_source",
    beforeEffect: "Offline corpus has no authenticated capture session",
    batchBDisposition: "Remains unavailable/not_exercised; does not block production-exit eligibility",
    liveAppModified: false,
  },
];

export function buildOwnershipTraceArtifact(): {
  schemaVersion: "stage300-batch-b-ownership-trace@1.0.0";
  liveAppModified: false;
  rematerialisationRequired: false;
  rematerialisationReason: string;
  rows: OwnershipTraceRow[];
} {
  return {
    schemaVersion: "stage300-batch-b-ownership-trace@1.0.0",
    liveAppModified: false,
    rematerialisationRequired: false,
    rematerialisationReason:
      "Frozen Cohort-B structured packets already carry required evidence/provenance/chase/exit fields; defects were MAA projection/adapter eligibility rules. No versioned rematerialisation required; prior outputs/freezes preserved.",
    rows: [...BATCH_B_OWNERSHIP_TRACE],
  };
}
