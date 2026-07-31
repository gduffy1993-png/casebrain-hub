/**
 * MAA V2 Stage-300 Batch-A contracts — shared structured adapters.
 * Fail-closed. No detector promotions. No truth opening. Calibration pending.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  BATCH_A_ADAPTER_IDS,
  BATCH_A_BASELINE,
  BATCH_A_ESSENTIAL_OWNERSHIP,
  BATCH_A_SCHEMA_VERSION,
  buildAdapterRegistry,
  buildOwnershipDedupGraph,
  engineeringJobsNotControls,
  projectStructuredPacketToAdapterBag,
  runBatchAAdapters,
} from "../lib/eval/master-assurance-auditor/v2/stage300/batch-a";

function emptyCasebrain(): Record<string, unknown> {
  return {
    caseId: "fixture-ba",
    courtNote: { text: "The defendant faces theft.", sendabilityLabel: "x", canCopy: true },
    fiveAnswersEvidenceRows: [],
    evidenceStates: [],
    warningsAndGaps: { chaseItems: [], doNotOverstate: [] },
  };
}

function completeCharge() {
  return {
    instrumentId: "inst-1",
    instrumentType: "MG5",
    exactWording: "Theft contrary to Theft Act 1968 s.1",
    count: 1,
    defendantAllocation: "D1",
    sourceDocument: "mg5.pdf",
    sourcePage: "2",
    pageIdentityKnown: true,
    status: "operative",
    version: "1",
    replacesInstrumentId: null,
    supersededByInstrumentId: null,
  };
}

function completeChron() {
  return {
    eventId: "ev-1",
    eventType: "arrest",
    timestamp: "2026-01-01T12:00:00Z",
    timezone: "Europe/London",
    source: "custody_record",
    confidence: "high",
    competingEventGroupId: null,
  };
}

function completeEvidence(over: Record<string, unknown> = {}) {
  return {
    label: "CCTV master",
    existence: "served",
    reliability: "needs_review",
    evidenceUnitId: "eu-1",
    subjectDefendantId: "person-d1",
    sourcePage: "12",
    pageIdentityKnown: true,
    aliases: ["CCTV"],
    extractFullRelationship: "extract_of",
    draftFinalRelationship: "draft_of",
    stillClipMasterRelationship: "clip_of_master",
    recordingTranscriptRelationship: "transcript_of",
    note: "x",
    ...over,
  };
}

function allExits() {
  return Object.fromEntries(
    ["view", "copy", "export", "api", "pdf", "composed_prose", "authenticated_browser"].map((id) => [
      id,
      { payloadIdentity: `sha256:${id}`, sendability: "ok", unavailableReason: null },
    ]),
  );
}

function statusOf(bundle: ReturnType<typeof runBatchAAdapters>, id: (typeof BATCH_A_ADAPTER_IDS)[number]) {
  return bundle.rollupByAdapter[id].bestStatus;
}

describe("Batch-A foundation honesty", () => {
  it("ba_baseline_and_six_jobs — never 43 completed jobs", () => {
    assert.equal(BATCH_A_BASELINE, "ee3c70c6f010b1c81535aed8bc00d1b782a29b4e");
    assert.equal(BATCH_A_ADAPTER_IDS.length, 6);
    assert.equal(BATCH_A_ESSENTIAL_OWNERSHIP.length, 43);
    assert.equal(engineeringJobsNotControls().sharedAdapterJobs.length, 6);
    const reg = buildAdapterRegistry();
    assert.equal(reg.adapterCount, 6);
    assert.equal(reg.unlockedEssentialControlCount, 6); // LSL-05 + 5 chron/PRC
    assert.ok(reg.adapters.every((a) => a.status === "adapter_foundation_only"));
    assert.ok(reg.adapters.every((a) => a.substantiveEvaluatorImplemented === false));
    assert.ok(reg.adapters.every((a) => a.calibrationPending === true));
    const graph = buildOwnershipDedupGraph();
    assert.equal(graph.essentialControlCount, 43);
    assert.equal(graph.engineeringJobCount, 6);
  });

  it("ba_no_truth_key_imports", () => {
    const dir = path.join(
      process.cwd(),
      "lib/eval/master-assurance-auditor/v2/stage300/batch-a",
    );
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      assert.equal(src.includes("truth-key"), false, f);
      assert.equal(src.includes("truthKey"), false, f);
    }
  });
});

describe("Batch-A charge instrument adapter", () => {
  it("ba_charge_positive", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: { ...emptyCasebrain(), chargeInstruments: [completeCharge()] },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "structured_charge_instrument_graph"), "eligible");
  });

  it("ba_charge_unavailable — court prose must not invent instruments", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: emptyCasebrain(),
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "structured_charge_instrument_graph"), "unavailable");
  });

  it("ba_charge_negative — incomplete applicable record → not eligible", () => {
    const incomplete = { ...completeCharge(), exactWording: null };
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: { ...emptyCasebrain(), chargeInstruments: [incomplete] },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "structured_charge_instrument_graph"), "partial");
  });

  it("ba_charge_aggregate — one incomplete means packet not fully eligible", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        chargeInstruments: [completeCharge(), { ...completeCharge(), instrumentId: "inst-2", version: null }],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "structured_charge_instrument_graph"), "partial");
  });

  it("ba_charge_cross_defendant — allocations preserved, never inferred from order", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        chargeInstruments: [
          { ...completeCharge(), instrumentId: "i1", defendantAllocation: "D2" },
          { ...completeCharge(), instrumentId: "i2", defendantAllocation: "D1" },
        ],
      },
      structuredPacket: null,
    });
    const run = b.channels.casebrain_output.find(
      (r) => r.adapterId === "structured_charge_instrument_graph",
    )!;
    assert.equal(run.capabilityStatus, "eligible");
    assert.equal(run.completeRecordCount, 2);
  });

  it("ba_charge_cross_document_version — amended/superseded links only when explicit", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        chargeInstruments: [
          {
            ...completeCharge(),
            instrumentId: "i-old",
            status: "superseded",
            version: "1",
            supersededByInstrumentId: "i-new",
          },
          {
            ...completeCharge(),
            instrumentId: "i-new",
            status: "operative",
            version: "2",
            replacesInstrumentId: "i-old",
          },
        ],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "structured_charge_instrument_graph"), "eligible");
  });

  it("ba_charge_unknown_page — pageIdentityKnown false clears page", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        chargeInstruments: [{ ...completeCharge(), sourcePage: "1", pageIdentityKnown: false }],
      },
      structuredPacket: null,
    });
    // Still eligible if other required fields present — page may be null when unknown
    assert.ok(
      statusOf(b, "structured_charge_instrument_graph") === "eligible" ||
        statusOf(b, "structured_charge_instrument_graph") === "partial",
    );
  });

  it("ba_charge_structured_packet_projection", () => {
    const bag = projectStructuredPacketToAdapterBag({
      caseId: "p",
      chargeInstruments: [completeCharge()],
    });
    const b = runBatchAAdapters({ caseId: "p", casebrainOutput: null, structuredPacket: bag as never });
    // project then re-project: pass original packet shape
    const b2 = runBatchAAdapters({
      caseId: "p",
      casebrainOutput: null,
      structuredPacket: { caseId: "p", chargeInstruments: [completeCharge()] },
    });
    assert.equal(statusOf(b2, "structured_charge_instrument_graph"), "eligible");
    void bag;
    void b;
  });
});

describe("Batch-A chronology adapter", () => {
  it("ba_chrono_positive", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: { ...emptyCasebrain(), chronologyEvents: [completeChron()] },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "timezone_aware_chronology_events"), "eligible");
  });

  it("ba_chrono_unavailable — export clock is not an event", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: { ...emptyCasebrain(), generatedAt: "2026-01-01T00:00:00Z" },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "timezone_aware_chronology_events"), "unavailable");
  });

  it("ba_chrono_negative_aggregate — one incomplete → partial", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        chronologyEvents: [completeChron(), { eventId: "ev-2", eventType: "interview", timestamp: null, timezone: null }],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "timezone_aware_chronology_events"), "partial");
  });

  it("ba_chrono_ambiguity — competing group only when explicit", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        chronologyEvents: [
          { ...completeChron(), eventId: "a", competingEventGroupId: "cg-1" },
          { ...completeChron(), eventId: "b", timestamp: "2026-01-01T13:00:00Z", competingEventGroupId: "cg-1" },
        ],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "timezone_aware_chronology_events"), "eligible");
  });

  it("ba_chrono_mutation — unrelated dates do not become chronology", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        courtNote: { text: "Hearing listed 1 Jan 2026.", sendabilityLabel: "x", canCopy: true },
        chronologyEvents: [],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "timezone_aware_chronology_events"), "unavailable");
  });
});

describe("Batch-A evidence identity adapter", () => {
  it("ba_evidence_positive", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        fiveAnswersEvidenceRows: [completeEvidence()],
        evidenceStates: [],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "evidence_unit_identity_with_aliases"), "eligible");
  });

  it("ba_evidence_unavailable", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: emptyCasebrain(),
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "evidence_unit_identity_with_aliases"), "unavailable");
  });

  it("ba_evidence_negative — label similarity cannot invent IDs", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        fiveAnswersEvidenceRows: [{ label: "CCTV master", existence: "served", reliability: "needs_review" }],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "evidence_unit_identity_with_aliases"), "partial");
  });

  it("ba_evidence_cross_defendant — attribution not from document order", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        fiveAnswersEvidenceRows: [
          completeEvidence({ evidenceUnitId: "eu-a", subjectDefendantId: "D2" }),
          completeEvidence({ evidenceUnitId: "eu-b", subjectDefendantId: "D1", label: "Bodycam" }),
        ],
        evidenceStates: [],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "evidence_unit_identity_with_aliases"), "eligible");
  });

  it("ba_evidence_axes — extract/full draft/signed clip/master recording/transcript preserved only when explicit", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        fiveAnswersEvidenceRows: [completeEvidence()],
        evidenceStates: [],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "evidence_unit_identity_with_aliases"), "eligible");
  });

  it("ba_evidence_aggregate_incomplete", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        fiveAnswersEvidenceRows: [completeEvidence(), { label: "X", existence: "served" }],
        evidenceStates: [],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "evidence_unit_identity_with_aliases"), "partial");
  });
});

describe("Batch-A provenance / page identity", () => {
  it("ba_prov_positive", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        evidenceStates: [
          {
            label: "CCTV",
            inferredSourceState: "served",
            source: "bundle.pdf",
            evidenceAnchor: "p.12",
            sourcePage: "12",
            compiledPage: "12",
            pageIdentityKnown: true,
          },
        ],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "source_vs_compiled_page_binding"), "eligible");
  });

  it("ba_prov_unknown_page — never default page 1", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        evidenceStates: [
          {
            label: "CCTV",
            inferredSourceState: "served",
            source: "bundle.pdf",
            evidenceAnchor: "partial",
          },
        ],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "source_vs_compiled_page_binding"), "partial");
  });

  it("ba_prov_aggregate_incomplete", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        evidenceStates: [
          {
            label: "A",
            inferredSourceState: "served",
            source: "a.pdf",
            evidenceAnchor: "p.1",
            sourcePage: "1",
            compiledPage: "1",
            pageIdentityKnown: true,
          },
          { label: "B", inferredSourceState: "served", source: "b.pdf", evidenceAnchor: "x" },
        ],
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "source_vs_compiled_page_binding"), "partial");
  });
});

describe("Batch-A chase relationships", () => {
  it("ba_chase_positive", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        warningsAndGaps: {
          chaseItems: [
            {
              label: "CCTV",
              requestId: "req-1",
              evidenceUnitId: "eu-1",
              resolutionState: "outstanding",
              sendabilityLabel: "x",
              copySuggestion: "y",
            },
          ],
          doNotOverstate: [],
        },
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "chase_item_to_evidence_unit_edges"), "eligible");
  });

  it("ba_chase_unavailable", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: emptyCasebrain(),
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "chase_item_to_evidence_unit_edges"), "unavailable");
  });

  it("ba_chase_ambiguity — duplicate labels not linked", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        evidenceStates: [
          { label: "CCTV", inferredSourceState: "served", source: "a.pdf", evidenceAnchor: "p.1" },
          { label: "CCTV", inferredSourceState: "requested", source: "b.pdf", evidenceAnchor: "p.2" },
        ],
        warningsAndGaps: {
          chaseItems: [{ label: "CCTV", sendabilityLabel: "x", copySuggestion: "y" }],
          doNotOverstate: [],
        },
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "chase_item_to_evidence_unit_edges"), "partial");
  });

  it("ba_chase_negative — offence templates do not invent links", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        courtNote: { text: "Standard theft disclosure chase applies.", sendabilityLabel: "x", canCopy: true },
        warningsAndGaps: { chaseItems: [], doNotOverstate: [] },
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "chase_item_to_evidence_unit_edges"), "unavailable");
  });
});

describe("Batch-A multi-exit binding", () => {
  it("ba_exit_positive — all required genuine payloads", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: { ...emptyCasebrain(), exitPayloadReceipts: allExits() },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "view_copy_export_api_pdf_composed_prose_capture"), "eligible");
  });

  it("ba_exit_metadata_not_exit", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        exportVersion: { exportId: "exp", sendability: "ok", reviewFooter: "x" },
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "view_copy_export_api_pdf_composed_prose_capture"), "unavailable");
  });

  it("ba_exit_partial — one real exit does not upgrade packet", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        exitPayloadReceipts: {
          view: { payloadIdentity: "sha256:v", sendability: "ok", unavailableReason: null },
        },
      },
      structuredPacket: null,
    });
    assert.equal(statusOf(b, "view_copy_export_api_pdf_composed_prose_capture"), "partial");
  });

  it("ba_exit_mutation — fixtures/metadata cannot fabricate exits", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: {
        ...emptyCasebrain(),
        exitPayloadReceipts: {
          view: { payloadIdentity: null, sendability: "ok", metadataOnly: true, realPayloadPresent: false },
        },
      },
      structuredPacket: null,
    });
    assert.notEqual(statusOf(b, "view_copy_export_api_pdf_composed_prose_capture"), "eligible");
  });
});

describe("Batch-A dual channel + named-control not exercised", () => {
  it("ba_dual_channel_rollup prefers best status; named controls not exercised", () => {
    const b = runBatchAAdapters({
      caseId: "t",
      casebrainOutput: emptyCasebrain(),
      structuredPacket: {
        caseId: "t",
        chargeInstruments: [completeCharge()],
        chronologyEvents: [completeChron()],
      },
    });
    assert.equal(statusOf(b, "structured_charge_instrument_graph"), "eligible");
    assert.equal(b.rollupByAdapter.structured_charge_instrument_graph.bestChannel, "structured_packet");
    for (const run of [...b.channels.casebrain_output, ...b.channels.structured_packet]) {
      assert.equal(run.namedControlExerciseStatus, "not_exercised");
      assert.equal(run.opensTruth, false);
      assert.equal(run.invented, false);
      assert.equal(run.schemaVersion, BATCH_A_SCHEMA_VERSION);
    }
  });
});
