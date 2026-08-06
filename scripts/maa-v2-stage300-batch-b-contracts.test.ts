/**
 * MAA V2 Stage-300 Batch-B contracts — dual-status honesty remediation.
 * Fail-closed. No detector promotions. No truth opening.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adaptChaseRelationships,
  adaptEvidenceUnits,
  adaptExitSnapshots,
  adaptProvenance,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters";
import { runBatchAAdapters } from "../lib/eval/master-assurance-auditor/v2/stage300/batch-a";
import {
  BATCH_B_BASELINE,
  BATCH_B_FOCUS_ADAPTER_IDS,
  buildBatchBEvaluatorRegistry,
} from "../lib/eval/master-assurance-auditor/v2/stage300/batch-b";

function statusOf(
  bundle: ReturnType<typeof runBatchAAdapters>,
  id: (typeof BATCH_B_FOCUS_ADAPTER_IDS)[number],
) {
  return bundle.rollupByAdapter[id].bestStatus;
}

function dualOf(
  bundle: ReturnType<typeof runBatchAAdapters>,
  id: (typeof BATCH_B_FOCUS_ADAPTER_IDS)[number],
) {
  const channel = bundle.rollupByAdapter[id].bestChannel;
  assert.ok(channel);
  const run = bundle.channels[channel].find((r) => r.adapterId === id);
  assert.ok(run);
  return run.dualStatus;
}

describe("Batch-B foundation — schemaValid ≠ namedPrerequisite", () => {
  it("bb_baseline_zero_evaluators", () => {
    assert.equal(BATCH_B_BASELINE, "43125b6fa06fa8e5e682d8811b1478b37daf9dfa");
    assert.equal(buildBatchBEvaluatorRegistry().evaluatorsImplemented, 0);
  });

  it("bb_schema_valid_does_not_imply_named_control_complete", () => {
    const r = adaptChaseRelationships("t", {
      warningsAndGaps: {
        chaseItems: [
          {
            requestId: "r1",
            label: "Full signed MG11",
            evidenceUnitId: null,
            resolutionState: "outstanding",
            supportedReason: "explicit_mg6c_resolution:outstanding",
            sourceBasis: "canonical.md",
          },
        ],
      },
    });
    assert.equal(r.dualStatus.schemaValidRepresentation, "eligible");
    assert.equal(r.dualStatus.namedControlPrerequisiteComplete, "partial");
    assert.equal(r.records[0]!.linkageStatus, "unresolved");
    assert.equal(r.records[0]!.recordComplete, false);
    assert.notEqual(
      r.dualStatus.schemaValidRepresentation,
      r.dualStatus.namedControlPrerequisiteComplete,
    );
  });
});

describe("Batch-B chase honesty negatives", () => {
  it("bb_unresolved_without_id_cannot_satisfy_linked_edge", () => {
    const r = adaptChaseRelationships("t", {
      warningsAndGaps: {
        chaseItems: [
          {
            requestId: "r1",
            label: "Full signed MG11",
            evidenceUnitId: null,
            resolutionState: "outstanding",
            sourceBasis: "src",
          },
        ],
      },
    });
    assert.equal(r.chaseRelationshipCounts?.linked, 0);
    assert.equal(r.chaseRelationshipCounts?.unresolved, 1);
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.completeRecordCount, 0);
  });

  it("bb_linked_plus_unresolved_named_partial_schema_eligible", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: null,
      structuredPacket: {
        chaseRelationships: [
          {
            requestId: "r1",
            chaseLabel: "Exhibit",
            evidenceUnitId: "eu-1",
            linkMethod: "explicit_id",
            resolutionState: "served",
            requestIdDerivation: { algorithm: "sha256", of: "x", note: "sourceRequestId=MG6C/001" },
            sourcePointer: "canonical.md/SECTION:MG6/MG6C/001",
          },
          {
            requestId: "r2",
            chaseLabel: "Full signed MG11",
            evidenceUnitId: null,
            linkMethod: "none",
            resolutionState: "outstanding",
            ambiguity: "unresolved_zero_matches",
            requestIdDerivation: { algorithm: "sha256", of: "y", note: "sourceRequestId=MG6C/003" },
            sourcePointer: "canonical.md/SECTION:MG6/MG6C/003",
          },
        ],
      },
    });
    assert.equal(statusOf(b, "chase_item_to_evidence_unit_edges"), "partial");
    const d = dualOf(b, "chase_item_to_evidence_unit_edges");
    assert.equal(d.schemaValidRepresentation, "eligible");
    assert.equal(d.namedControlPrerequisiteComplete, "partial");
  });
});

describe("Batch-B provenance honesty negatives", () => {
  it("bb_honest_unknown_page_cannot_satisfy_exact_page", () => {
    const r = adaptProvenance("t", {
      evidenceStates: [
        {
          label: "x",
          source: "doc",
          pageIdentityKnown: false,
          limitationReason: "compiledPage unknown — source page from pdf-extraction-meta only",
        },
      ],
    });
    assert.equal(r.records[0]!.pageClass, "honest_unknown_page");
    assert.equal(r.dualStatus.schemaValidRepresentation, "eligible");
    assert.equal(r.dualStatus.namedControlPrerequisiteComplete, "partial");
    assert.equal(r.completeRecordCount, 0);
  });
});

describe("Batch-B evidence exclusion ledger", () => {
  it("bb_excluded_meta_rows_retained_in_inventory", () => {
    const r = adaptEvidenceUnits("t", {
      fiveAnswersEvidenceRows: [
        {
          evidenceUnitId: "eu-1",
          label: "CCTV",
          existence: "served",
          subjectDefendantId: "D1",
          sourcePage: "3",
          pageIdentityKnown: true,
        },
      ],
      evidenceStates: [
        {
          label: "provenance-0",
          source: "doc",
          sourcePage: "1",
          compiledPage: "1",
          pageIdentityKnown: true,
        },
      ],
    });
    assert.ok(r.exclusionLedger && r.exclusionLedger.length === 1);
    assert.equal(r.exclusionLedger![0]!.originalPath, "/evidenceStates/0");
    assert.ok(r.exclusionLedger![0]!.rowSha256.length === 64);
    assert.match(r.exclusionLedger![0]!.reasonExcluded, /page_only_or_provenance_meta/);
    assert.match(r.exclusionLedger![0]!.retainedProvenanceDestination, /provenance_via_evidenceStates/);
    assert.equal(r.records.length, 1);
    assert.equal(r.records[0]!.evidenceUnitId, "eu-1");
  });
});

describe("Batch-B exit honesty", () => {
  it("bb_metadata_is_not_a_real_exit", () => {
    const r = adaptExitSnapshots("t", {
      courtNote: { text: "x", sendabilityLabel: "y", canCopy: true },
      exportVersion: { exportId: "e", sendability: "ok", reviewFooter: "z" },
    });
    assert.equal(r.capabilityStatus, "unavailable");
    assert.ok(r.records.some((e) => e.metadataOnly && !e.realExitPayloadPresent));
  });

  it("bb_six_production_exits_with_fields", () => {
    const receipts = Object.fromEntries(
      ["view", "copy", "export", "api", "pdf", "composed_prose"].map((id) => [
        id,
        {
          payloadIdentity: `sha256:${id}`,
          payloadSchemaVersion: "batch10-exit-payload@1.0.0",
          captureRunId: "run-1",
          realPayloadPresent: true,
          metadataOnly: false,
          sendability: "ok",
        },
      ]),
    );
    const r = adaptExitSnapshots("t", { exitPayloadReceipts: receipts });
    assert.equal(r.capabilityStatus, "eligible");
    assert.ok(
      r.records
        .filter((e) => e.exitId !== "authenticated_browser")
        .every((e) => e.productionPayloadFieldsComplete),
    );
  });
});
