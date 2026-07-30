/**
 * MAA V2 Stage-150 Batch-8 contracts — structured adapter foundation.
 * No detector promotions. No truth opening.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  adaptAllBatch8,
  adaptChargeInstruments,
  adaptChaseRelationships,
  adaptChronologyEvents,
  adaptEvidenceUnits,
  adaptExitSnapshots,
  adaptProvenance,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters";
import {
  assertReceiptsHonest,
  validateChargeInstrument,
  validateChase,
  validateEvidenceUnit,
  validateExitSnapshot,
  validateNoFabricatedId,
  validateProvenance,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch8/validators";
import { BATCH8_UNLOCK_MAP } from "../lib/eval/master-assurance-auditor/v2/stage150/batch8/unlock-map";
import {
  BATCH8_ADAPTER_IDS,
  BATCH8_BASELINE,
  BATCH8_SCHEMA_VERSION,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch8/schemas";
import {
  STAGE150_IMPLEMENTED_IDS,
  BATCH7_IMPLEMENTED_IDS,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { statusForStage150Control } from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";

function esaLike(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    caseId: "fixture-b8",
    courtNote: {
      text: "Court line.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
      blockedReason: null,
    },
    fiveAnswersEvidenceRows: [
      { label: "CCTV master", existence: "served", reliability: "needs_review", note: "Continuity incomplete." },
    ],
    evidenceStates: [
      {
        label: "CCTV master",
        inferredSourceState: "missing",
        existenceLabel: "Missing",
        source: "CPS / disclosure officer",
        evidenceAnchor: "4. **MG6** — partial on export",
        sendability: null,
        baseStatus: "Outstanding",
      },
    ],
    warningsAndGaps: {
      chaseItems: [
        {
          label: "CCTV master",
          sendabilityLabel: "Solicitor review required",
          copySuggestion: "Please provide CCTV master.",
        },
      ],
      doNotOverstate: ["Do not overstate CCTV."],
    },
    exportVersion: {
      exportId: "exp-fixture",
      sendability: "needs_solicitor_review",
      reviewFooter: "Solicitor review required.",
    },
    ...over,
  };
}

describe("Batch-8 foundation honesty", () => {
  it("preserves prior promotions; no Batch-8 detector promotions; gates false", () => {
    assert.equal(STAGE150_IMPLEMENTED_IDS.size, 8);
    assert.equal(BATCH7_IMPLEMENTED_IDS.size, 1);
    assert.ok(STAGE150_IMPLEMENTED_IDS.has("MAA2-EVS-01-DIMENSION-SEPARATION"));
    assert.equal(
      statusForStage150Control({
        controlId: "MAA2-ATR-01-DEFENDANT-SEPARATION",
        familyCode: "ATR",
        activationStage: "150",
        preservedFromV1: false,
        engineId: "evidence_attribution",
      }).status,
      "partially_implemented",
    );
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.implemented, 8);
    assert.equal(m.totals.partially_implemented, 98);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
    assert.equal(BATCH8_BASELINE, "e60790458f6c1030300c52c029e2318a28139252");
    assert.equal(BATCH8_ADAPTER_IDS.length, 6);
    assert.equal(BATCH8_UNLOCK_MAP.length, 6);
  });
});

describe("Batch-8 charge_instruments", () => {
  it("b8_charge_unavailable — ESA-like absence", () => {
    const r = adaptChargeInstruments("t", esaLike());
    assert.equal(r.capabilityStatus, "unavailable");
    assert.equal(r.records.length, 0);
    assert.equal(r.invented, false);
  });

  it("b8_charge_positive — complete structured bag", () => {
    const r = adaptChargeInstruments(
      "t",
      esaLike({
        chargeInstruments: [
          {
            instrumentId: "inst-mg5-1",
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
          },
        ],
      }),
    );
    assert.equal(r.capabilityStatus, "eligible");
    assert.equal(validateChargeInstrument(r.records[0]!).length, 0);
    assert.equal(assertReceiptsHonest(r.fieldReceipts).length, 0);
  });

  it("b8_charge_negative — refuse fabricated id", () => {
    assert.ok(validateNoFabricatedId("auto-charge-1", "instrumentId").length > 0);
  });

  it("b8_charge_adversarial — court prose must not become instruments", () => {
    const r = adaptChargeInstruments(
      "t",
      esaLike({
        courtNote: {
          text: "The defendant faces one count of theft on the indictment.",
          sendabilityLabel: "x",
          canCopy: true,
        },
      }),
    );
    assert.equal(r.capabilityStatus, "unavailable");
  });
});

describe("Batch-8 evidence_units", () => {
  it("b8_evidence_partial — ESA rows without IDs", () => {
    const r = adaptEvidenceUnits("t", esaLike());
    assert.equal(r.capabilityStatus, "partial");
    assert.ok(r.records.length >= 2);
    assert.ok(r.records.every((u) => u.evidenceUnitId == null));
    assert.ok(r.records.every((u) => validateEvidenceUnit(u).length === 0));
    const five = r.records.find((x) => x.occurrenceRef === "/fiveAnswersEvidenceRows/0")!;
    assert.ok(five.exactLabelPeerOccurrenceRefs.includes("/evidenceStates/0"));
  });

  it("b8_evidence_positive — complete IDs", () => {
    const r = adaptEvidenceUnits(
      "t",
      esaLike({
        fiveAnswersEvidenceRows: [
          {
            label: "CCTV",
            existence: "served",
            reliability: "needs_review",
            evidenceUnitId: "eu-cctv-1",
            subjectDefendantId: "person-d1",
            sourcePage: "12",
            pageIdentityKnown: true,
            note: "x",
          },
        ],
        evidenceStates: [],
      }),
    );
    assert.equal(r.capabilityStatus, "eligible");
  });

  it("b8_evidence_unavailable — empty", () => {
    const r = adaptEvidenceUnits("t", esaLike({ fiveAnswersEvidenceRows: [], evidenceStates: [] }));
    assert.equal(r.capabilityStatus, "unavailable");
  });

  it("b8_evidence_adversarial — invented page rejected by validator", () => {
    const bad = {
      evidenceUnitId: null,
      occurrenceRef: "/fiveAnswersEvidenceRows/0",
      evidenceTypeOrModality: null,
      modalityDerivation: "absent" as const,
      subjectDefendantId: null,
      personId: null,
      existence: "served",
      reliability: "needs_review",
      aliases: [],
      exactLabelPeerOccurrenceRefs: [],
      draftFinalRelationship: null,
      extractFullRelationship: null,
      sourceDocument: null,
      sourcePage: "12",
      pageIdentityKnown: false,
      label: "CCTV",
    };
    assert.ok(validateEvidenceUnit(bad).some((i) => i.code === "page_without_identity_known"));
  });
});

describe("Batch-8 chronology_events", () => {
  it("b8_chrono_unavailable", () => {
    assert.equal(adaptChronologyEvents("t", esaLike()).capabilityStatus, "unavailable");
  });

  it("b8_chrono_positive", () => {
    const r = adaptChronologyEvents(
      "t",
      esaLike({
        chronologyEvents: [
          {
            eventId: "ev-1",
            eventType: "arrest",
            timestamp: "2026-01-01T12:00:00Z",
            timezone: "Europe/London",
            source: "custody_record",
            confidence: "high",
            competingEventGroupId: null,
          },
        ],
      }),
    );
    assert.equal(r.capabilityStatus, "eligible");
    assert.equal(r.applicableRecordCount, 1);
    assert.equal(r.completeRecordCount, 1);
    assert.equal(r.incompleteRecordCount, 0);
  });

  it("b8_chrono_negative — one complete + one incomplete stays partial", () => {
    const r = adaptChronologyEvents(
      "t",
      esaLike({
        chronologyEvents: [
          {
            eventId: "ev-1",
            eventType: "arrest",
            timestamp: "2026-01-01T12:00:00Z",
            timezone: "Europe/London",
            source: "custody_record",
            confidence: "high",
          },
          {
            eventId: null,
            eventType: "interview",
            timestamp: null,
            timezone: null,
            source: null,
            confidence: null,
          },
        ],
      }),
    );
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.applicableRecordCount, 2);
    assert.equal(r.completeRecordCount, 1);
    assert.equal(r.incompleteRecordCount, 1);
    assert.match(r.eligibilityReason, /One complete/i);
  });

  it("b8_chrono_negative — export clock is not an event", () => {
    const r = adaptChronologyEvents(
      "t",
      esaLike({ generatedAt: "2026-01-01T00:00:00Z", chronologyEvents: [] }),
    );
    assert.equal(r.capabilityStatus, "unavailable");
  });
});

describe("Batch-8 provenance", () => {
  it("b8_prov_partial — anchors without page identity", () => {
    const r = adaptProvenance("t", esaLike());
    assert.equal(r.capabilityStatus, "partial");
    assert.ok(r.records.every((p) => p.pageIdentityKnown === false));
    assert.ok(r.records.every((p) => p.sourcePage == null));
    assert.equal(validateProvenance(r.records[0]!).length, 0);
  });

  it("b8_prov_positive — pageIdentityKnown with pages", () => {
    const r = adaptProvenance(
      "t",
      esaLike({
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
        fiveAnswersEvidenceRows: [],
      }),
    );
    assert.equal(r.capabilityStatus, "eligible");
  });

  it("b8_prov_negative — one complete + one incomplete stays partial", () => {
    const r = adaptProvenance(
      "t",
      esaLike({
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
          {
            label: "Bodycam",
            inferredSourceState: "served",
            source: "bundle.pdf",
            evidenceAnchor: "p.13",
          },
        ],
        fiveAnswersEvidenceRows: [],
      }),
    );
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.completeRecordCount, 1);
    assert.ok(r.incompleteRecordCount >= 1);
    assert.match(r.eligibilityReason, /One complete/i);
  });

  it("b8_prov_adversarial — page fields without pageIdentityKnown fail validator", () => {
    assert.ok(
      validateProvenance({
        occurrenceRef: "/evidenceStates/0",
        sourceDocumentIdentity: "x",
        sourcePage: "12",
        compiledPage: "12",
        pageIdentityKnown: false,
        limitationReason: null,
        evidenceAnchorRaw: "p.12",
      }).length > 0,
    );
  });
});

describe("Batch-8 chase_relationships", () => {
  it("b8_chase_partial — unique exact label without completeness fields", () => {
    const r = adaptChaseRelationships("t", esaLike());
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.records[0]!.linkMethod, "exact_label_match");
    assert.equal(r.records[0]!.linkedEvidenceOccurrenceRef, "/evidenceStates/0");
    assert.equal(r.records[0]!.candidateEvidenceOccurrenceRefs.length, 1);
    assert.equal(r.records[0]!.recordComplete, false);
    assert.equal(validateChase(r.records[0]!).length, 0);
  });

  it("b8_chase_negative — similar but non-exact label does not link", () => {
    const r = adaptChaseRelationships(
      "t",
      esaLike({
        warningsAndGaps: {
          chaseItems: [{ label: "CCTV masters", sendabilityLabel: "x", copySuggestion: "y" }],
        },
      }),
    );
    assert.equal(r.records[0]!.linkMethod, "none");
    assert.equal(r.records[0]!.linkAmbiguity, "unresolved_zero_matches");
    assert.equal(r.records[0]!.linkedEvidenceOccurrenceRef, null);
  });

  it("b8_chase_negative — duplicate exact labels are ambiguous (no last-row wins)", () => {
    const r = adaptChaseRelationships(
      "t",
      esaLike({
        evidenceStates: [
          { label: "CCTV", inferredSourceState: "served", source: "a.pdf", evidenceAnchor: "p.1" },
          { label: "CCTV", inferredSourceState: "requested", source: "b.pdf", evidenceAnchor: "p.2" },
        ],
        fiveAnswersEvidenceRows: [],
        warningsAndGaps: {
          chaseItems: [{ label: "CCTV", sendabilityLabel: "x", copySuggestion: "y" }],
        },
      }),
    );
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.ambiguousRelationshipCount, 1);
    assert.equal(r.records[0]!.linkAmbiguity, "ambiguous_multiple_matches");
    assert.equal(r.records[0]!.linkMethod, "none");
    assert.equal(r.records[0]!.linkedEvidenceOccurrenceRef, null);
    assert.deepEqual(r.records[0]!.candidateEvidenceOccurrenceRefs, [
      "/evidenceStates/0",
      "/evidenceStates/1",
    ]);
    assert.equal(r.records[0]!.requestedState, null);
  });

  it("b8_chase_negative — explicit link missing resolutionState stays incomplete", () => {
    const r = adaptChaseRelationships(
      "t",
      esaLike({
        warningsAndGaps: {
          chaseItems: [
            {
              label: "CCTV",
              requestId: "req-1",
              evidenceUnitId: "eu-1",
              sendabilityLabel: "x",
              copySuggestion: "y",
            },
          ],
        },
      }),
    );
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.records[0]!.linkMethod, "explicit_id");
    assert.equal(r.records[0]!.resolutionState, null);
    assert.equal(r.records[0]!.recordComplete, false);
    assert.equal(r.completeRecordCount, 0);
    assert.equal(r.incompleteRecordCount, 1);
  });

  it("b8_chase_negative — multiple rows where only one is complete stays partial", () => {
    const r = adaptChaseRelationships(
      "t",
      esaLike({
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
            {
              label: "Bodycam",
              requestId: "req-2",
              evidenceUnitId: "eu-2",
              sendabilityLabel: "x",
              copySuggestion: "y",
            },
          ],
        },
      }),
    );
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.applicableRecordCount, 2);
    assert.equal(r.completeRecordCount, 1);
    assert.equal(r.incompleteRecordCount, 1);
    assert.match(r.eligibilityReason, /One complete chase row does not upgrade/i);
  });

  it("b8_chase_unavailable", () => {
    const r = adaptChaseRelationships("t", esaLike({ warningsAndGaps: { chaseItems: [] } }));
    assert.equal(r.capabilityStatus, "unavailable");
  });

  it("b8_chase_positive — explicit requestId + evidenceUnitId + resolutionState", () => {
    const r = adaptChaseRelationships(
      "t",
      esaLike({
        warningsAndGaps: {
          chaseItems: [
            {
              label: "CCTV master",
              requestId: "req-1",
              evidenceUnitId: "eu-1",
              resolutionState: "outstanding",
              sendabilityLabel: "x",
              copySuggestion: "y",
            },
          ],
        },
      }),
    );
    assert.equal(r.capabilityStatus, "eligible");
    assert.equal(r.records[0]!.linkMethod, "explicit_id");
    assert.equal(r.records[0]!.recordComplete, true);
  });
});

describe("Batch-8 exit_snapshots", () => {
  it("b8_exit_unavailable — metadata alone is not genuine exercise", () => {
    const r = adaptExitSnapshots("t", esaLike());
    assert.equal(r.capabilityStatus, "unavailable");
    assert.equal(r.completeRecordCount, 0);
    assert.equal(r.incompleteRecordCount, 7);
    assert.ok(r.records.some((e) => e.exitId === "view" && e.metadataOnly && !e.realExitPayloadPresent));
    assert.ok(r.records.some((e) => e.exitId === "api" && e.capabilityStatus === "unavailable"));
    for (const e of r.records) assert.equal(validateExitSnapshot(e).length, 0);
  });

  it("b8_exit_negative — one real exit with six missing stays partial", () => {
    const r = adaptExitSnapshots(
      "t",
      esaLike({
        exitPayloadReceipts: {
          view: { payloadIdentity: "sha256:abc", sendability: "blocked", unavailableReason: null },
        },
      }),
    );
    assert.equal(r.capabilityStatus, "partial");
    assert.equal(r.completeRecordCount, 1);
    assert.equal(r.incompleteRecordCount, 6);
    assert.ok(r.records.some((e) => e.exitId === "view" && e.realExitPayloadPresent));
    assert.match(r.eligibilityReason, /one real exit does not make the adapter eligible/i);
  });

  it("b8_exit_positive — all seven required exits with genuine payloads", () => {
    const receipts = Object.fromEntries(
      ["view", "copy", "export", "api", "pdf", "composed_prose", "authenticated_browser"].map((id) => [
        id,
        { payloadIdentity: `sha256:${id}`, sendability: "ok", unavailableReason: null },
      ]),
    );
    const r = adaptExitSnapshots("t", esaLike({ exitPayloadReceipts: receipts }));
    assert.equal(r.capabilityStatus, "eligible");
    assert.equal(r.completeRecordCount, 7);
    assert.equal(r.incompleteRecordCount, 0);
  });

  it("b8_exit_adversarial — metadata cannot be eligible", () => {
    assert.ok(
      validateExitSnapshot({
        exitId: "export",
        payloadIdentity: null,
        sendability: "needs_solicitor_review",
        unavailableReason: null,
        realExitPayloadPresent: false,
        metadataOnly: true,
        capabilityStatus: "eligible",
        evidencePointersPresent: ["/exportVersion/exportId"],
      }).some((i) => i.code === "metadata_marked_eligible"),
    );
  });
});

describe("Batch-8 adaptAll + receipts", () => {
  it("b8_all_esa_like — no invention; schema version pinned", () => {
    const all = adaptAllBatch8("t", esaLike());
    assert.equal(all.charge_instruments.capabilityStatus, "unavailable");
    assert.equal(all.evidence_units.capabilityStatus, "partial");
    assert.equal(all.chronology_events.capabilityStatus, "unavailable");
    assert.equal(all.provenance.capabilityStatus, "partial");
    assert.equal(all.chase_relationships.capabilityStatus, "partial");
    assert.equal(all.exit_snapshots.capabilityStatus, "unavailable");
    for (const r of Object.values(all)) {
      assert.equal(r.schemaVersion, BATCH8_SCHEMA_VERSION);
      assert.equal(r.opensTruth, false);
      assert.equal(r.invented, false);
      assert.ok(typeof r.eligibilityReason === "string" && r.eligibilityReason.length > 0);
      assert.equal(typeof r.applicableRecordCount, "number");
      assert.equal(typeof r.completeRecordCount, "number");
      assert.equal(typeof r.incompleteRecordCount, "number");
      assert.equal(typeof r.ambiguousRelationshipCount, "number");
      assert.equal(assertReceiptsHonest(r.fieldReceipts).length, 0);
    }
  });

  it("b8_unlock_map_covers_six_adapters", () => {
    assert.deepEqual(
      BATCH8_UNLOCK_MAP.map((r) => r.adapterId).sort(),
      [...BATCH8_ADAPTER_IDS].sort(),
    );
  });
});

describe("Batch-8 does not open truth keys", () => {
  it("adapters accept output-only; no truth-key import in module", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters.ts"),
      "utf8",
    );
    assert.equal(src.includes("truth-key"), false);
    assert.equal(src.includes("truthKey"), false);
  });
});
