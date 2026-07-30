/**
 * MAA V2 Stage-150 Batch-6 contracts — selected runnable detectors.
 * Positive + multiple safe negatives + unavailable + mutation per selected control.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  statusForStage150Control,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import {
  buildEvalContext,
  evaluateControl,
  evaluateChargeIntegrity,
  evaluateCrossOutput,
  evaluateEvidenceIdentityState,
  evaluateProvenanceReliability,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { inventoryOutputLeaves } from "../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { missingPrerequisite } from "../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import { BATCH6_SELECTED_CONTROL_IDS } from "../lib/eval/master-assurance-auditor/v2/stage150/batch6-selection";
import {
  BATCH6_PROMOTED_CONTROL_IDS,
  BATCH6_RETURNED_TO_PARTIAL,
  BATCH6_RETURNED_IDS,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch6-overpromotion-disposition";
import { buildBatch6EvsHonestReceipt } from "../lib/eval/master-assurance-auditor/v2/stage150/batch6-evs-receipts";
import { buildBatch6ReadinessInventory } from "../lib/eval/master-assurance-auditor/v2/stage150/batch6-readiness-inventory";
import {
  BATCH5_IMMUTABLE_PROMOTION_REGISTRY,
  BATCH5_IMPLEMENTED_IDS,
  BATCH6_IMMUTABLE_PROMOTION_REGISTRY,
  BATCH6_IMPLEMENTED_IDS,
  STAGE150_IMPLEMENTED_IDS,
  STAGE150_IMMUTABLE_PROMOTION_REGISTRY,
  ZERO_CANDIDATE_RATE_NOTE,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildControlRateRow } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-triage";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";

function base(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    courtNote: {
      text: "Ordinary professional court note. CCTV is served. Continuity is incomplete.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
    },
    fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "needs_review", note: "served" }],
    evidenceStates: [
      { inferredSourceState: "served", label: "CCTV", existenceLabel: "served", evidenceAnchor: "page 12 source" },
    ],
    warningsAndGaps: { chaseItems: [], doNotOverstate: [] },
    exportVersion: { reviewFooter: "Solicitor review required.", sendability: "needs_solicitor_review" },
    ...over,
  };
}

function ctxFrom(output: Record<string, unknown>) {
  const ctx = buildEvalContext("b6", output);
  ctx.leaves = inventoryOutputLeaves("b6", output);
  return ctx;
}

describe("Batch-6 inventory / selection honesty", () => {
  it("selects only EVS-02 and EVS-03 for promotion; excludes FID-10", () => {
    const inv = buildBatch6ReadinessInventory();
    assert.equal(inv.remainingPartialCount, 101);
    assert.deepEqual([...BATCH6_SELECTED_CONTROL_IDS], [...BATCH6_PROMOTED_CONTROL_IDS]);
    assert.equal(BATCH6_SELECTED_CONTROL_IDS.length, 2);
    assert.ok(!BATCH6_SELECTED_CONTROL_IDS.includes("MAA2-FID-10-QUOTATION-FIDELITY"));
    for (const id of BATCH6_SELECTED_CONTROL_IDS) {
      const row = inv.rows.find((r) => r.controlId === id)!;
      assert.equal(row.phraseProbeOnly, false, id);
      assert.equal(row.excludedFid10, false, id);
      assert.ok(row.priorityFamily, id);
    }
  });

  it("preserves Batch-5/6; totals follow immutable Stage-150 registry; gates false", () => {
    assert.equal(BATCH5_IMMUTABLE_PROMOTION_REGISTRY.length, 5);
    assert.equal(BATCH5_IMPLEMENTED_IDS.size, 5);
    assert.equal(BATCH6_IMMUTABLE_PROMOTION_REGISTRY.length, 2);
    assert.ok(STAGE150_IMPLEMENTED_IDS.size >= 7);
    assert.equal(
      STAGE150_IMMUTABLE_PROMOTION_REGISTRY.length,
      STAGE150_IMPLEMENTED_IDS.size,
    );
    for (const id of BATCH5_IMPLEMENTED_IDS) {
      assert.ok(STAGE150_IMPLEMENTED_IDS.has(id), id);
    }
    for (const id of BATCH6_IMPLEMENTED_IDS) {
      assert.ok(STAGE150_IMPLEMENTED_IDS.has(id), id);
    }
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.stage150ControlCount, 161);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
    assert.equal(m.totals.implemented, STAGE150_IMPLEMENTED_IDS.size);
    assert.equal(m.totals.partially_implemented, 106 - STAGE150_IMPLEMENTED_IDS.size);
    assert.equal(m.totals.specified_not_implemented, 55);
  });

  it("has no mutable promotion setter; zero-candidate rates are null", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented.ts"),
      "utf8",
    );
    assert.equal(src.includes("setBatch5ImplementedIds"), false);
    for (const entry of BATCH6_IMMUTABLE_PROMOTION_REGISTRY) {
      assert.equal(entry.candidateDenominator, 0);
      assert.equal(entry.rateHonestyNote, ZERO_CANDIDATE_RATE_NOTE);
      assert.equal(entry.denominatorApprovalState, "PENDING_REVIEW");
      assert.equal(
        statusForStage150Control({
          controlId: entry.controlId,
          familyCode: "EVS",
          activationStage: "150",
          preservedFromV1: false,
          engineId: "evidence_attribution",
        }).status,
        "implemented",
      );
      const rates = buildControlRateRow(entry.controlId, []);
      assert.equal(rates.fpRate, null);
      assert.equal(rates.unresolvedRate, null);
      assert.equal(rates.confirmedRate, null);
      assert.equal(rates.humanFpFnRecall, "unavailable");
    }
  });
});

describe("Batch-6 over-promotion regression — six cannot be promoted on narrow probes", () => {
  it("returns six controls to partially_implemented with required blockers", () => {
    assert.equal(BATCH6_RETURNED_TO_PARTIAL.length, 6);
    for (const row of BATCH6_RETURNED_TO_PARTIAL) {
      assert.equal(row.implementationStatus, "partially_implemented", row.controlId);
      assert.ok(!STAGE150_IMPLEMENTED_IDS.has(row.controlId), row.controlId);
      assert.ok(!BATCH6_IMPLEMENTED_IDS.has(row.controlId), row.controlId);
      assert.equal(
        statusForStage150Control({
          controlId: row.controlId,
          familyCode: row.controlId.split("-")[1] ?? "UNK",
          activationStage: "150",
          preservedFromV1: false,
          engineId: "professional_wording",
        }).status,
        "partially_implemented",
        row.controlId,
      );
      assert.ok(row.requiredBeforePromotion.length > 20, row.controlId);
      assert.ok(row.promotionBlockedReason.length > 20, row.controlId);
    }
  });

  it("LSL-03 and FID-09 are phrase_probe_only until structured comparisons exist", () => {
    const lsl = STAGE150_PACKET_LOCAL_HANDLERS.find((h) => h.controlId === "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING")!;
    const fid = STAGE150_PACKET_LOCAL_HANDLERS.find((h) => h.controlId === "MAA2-FID-09-NO-SILENT-CORRECTION")!;
    assert.equal(lsl.detectorClassification, "phrase_probe_only");
    assert.equal(fid.detectorClassification, "phrase_probe_only");
    assert.match(lsl.ownershipNote, /submission state and judicial finding state/i);
    assert.match(fid.ownershipNote, /earlier and later wording\/version/i);
  });

  it("XEX-07 / PRI-01 / XEX-01 / SRC-10 blockers reject export-footer / empty-fiveAnswers / wording-only promotion", () => {
    const byId = new Map(BATCH6_RETURNED_TO_PARTIAL.map((r) => [r.controlId, r]));
    assert.match(byId.get("MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY")!.requiredBeforePromotion, /view and copy exit/i);
    assert.match(byId.get("MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY")!.promotionBlockedReason, /not the copy exit/i);
    assert.match(byId.get("MAA2-PRI-01-NO-IMPORTANT-OMISSION")!.requiredBeforePromotion, /required-information inventory/i);
    assert.match(byId.get("MAA2-PRI-01-NO-IMPORTANT-OMISSION")!.promotionBlockedReason, /empty fiveAnswers alone/i);
    assert.match(byId.get("MAA2-XEX-01-CHARGE-WARNING-ATTACHED")!.requiredBeforePromotion, /view\/copy\/export\/API/i);
    assert.match(
      byId.get("MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE")!.requiredBeforePromotion,
      /sourcePage[\s\S]*compiledPage[\s\S]*pageIdentityKnown/i,
    );
    assert.match(byId.get("MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE")!.promotionBlockedReason, /evidenceAnchor wording/i);
  });

  it("narrow probe positives do not imply registry promotion", () => {
    // Probe still fires — but must remain outside STAGE150_IMPLEMENTED_IDS
    assert.ok(
      evaluateChargeIntegrity(
        ctxFrom(
          base({
            courtNote: {
              text: "It is submitted the court has found identity established.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).some((h) => h.controlId === "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING"),
    );
    assert.ok(BATCH6_RETURNED_IDS.has("MAA2-LSL-03-NO-SUBMISSION-TO-FINDING"));
    assert.ok(!STAGE150_IMPLEMENTED_IDS.has("MAA2-LSL-03-NO-SUBMISSION-TO-FINDING"));
  });
});

describe("Batch-6 EVS honest named-control receipts", () => {
  it("records namedControlExerciseStatus, row counts, field refs/hashes; not_exercised when empty", () => {
    const h2 = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-EVS-02-STATE-ENUM")!;
    const withRows = base();
    const leaves = inventoryOutputLeaves("t", withRows);
    const r = buildBatch6EvsHonestReceipt({
      caseId: "t",
      handler: h2,
      output: withRows,
      leaves,
      hits: [],
    });
    assert.equal(r.namedControlExerciseStatus, "partially_exercised");
    assert.ok(r.applicableEvidenceRowCount > 0);
    assert.ok(r.inspectedFieldReferences.length > 0);
    assert.ok(r.inspectedFieldReferences.every((f) => /^[a-f0-9]{64}$/.test(f.valueSha256)));
    assert.ok(r.exactPrerequisiteEvidenceRefs.includes("/evidenceStates/*/inferredSourceState"));
    assert.equal(r.findingCount, 0);

    const empty = {
      courtNote: { text: "x", sendabilityLabel: "x" },
      fiveAnswersEvidenceRows: [],
      evidenceStates: [],
      warningsAndGaps: {},
      exportVersion: {},
    };
    const rEmpty = buildBatch6EvsHonestReceipt({
      caseId: "e",
      handler: h2,
      output: empty,
      leaves: inventoryOutputLeaves("e", empty),
      hits: [],
    });
    assert.equal(rEmpty.namedControlExerciseStatus, "not_exercised");
    assert.equal(rEmpty.applicableEvidenceRowCount, 0);
    assert.match(rEmpty.honestyNote, /not proof of named exercise/i);
  });

  it("rejects probeEligible+hitCount=0 as sole promotion proof shape", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/eval/master-assurance-auditor/v2/stage150/batch6-evs-receipts.ts"),
      "utf8",
    );
    assert.match(src, /namedControlExerciseStatus/);
    assert.match(src, /applicableEvidenceRowCount/);
    assert.match(src, /inspectedFieldReferences/);
    assert.match(src, /not proof of named exercise/);
  });
});

describe("Batch-6 LSL-03 submission→finding", () => {
  it("lsl03_positive", () => {
    assert.ok(
      evaluateChargeIntegrity(
        ctxFrom(
          base({
            courtNote: {
              text: "It is submitted the court has found identity established.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).some((h) => h.controlId === "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING"),
    );
  });

  it("lsl03_negatives — invite court / historical finding", () => {
    assert.equal(
      evaluateChargeIntegrity(
        ctxFrom(
          base({
            courtNote: {
              text: "Counsel invite the court to find identity not proven.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING").length,
      0,
    );
    assert.equal(
      evaluateChargeIntegrity(
        ctxFrom(
          base({
            courtNote: {
              text: "Previously the court found no case to answer on count 2.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING").length,
      0,
    );
  });

  it("lsl03_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING")!;
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)), "missing:included_solicitor_visible_wording");
  });

  it("lsl03_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            courtNote: {
              text: "Continuity incomplete; CCTV referred only.",
              sendabilityLabel: "x",
            },
          }),
        ),
        "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
      ).length,
      0,
    );
  });
});

describe("Batch-6 FID-09 silent correction", () => {
  it("fid09_positive", () => {
    assert.ok(
      evaluateChargeIntegrity(
        ctxFrom(base({ courtNote: { text: "The charge was quietly corrected overnight.", sendabilityLabel: "x" } })),
      ).some((h) => h.findingCode === "FID_SILENT_CORRECTION"),
    );
  });

  it("fid09_negatives — open amendment / ordinary wording", () => {
    assert.equal(
      evaluateChargeIntegrity(
        ctxFrom(
          base({
            courtNote: {
              text: "An open amendment notice was served; solicitor review required.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).filter((h) => h.findingCode === "FID_SILENT_CORRECTION").length,
      0,
    );
    assert.equal(
      evaluateChargeIntegrity(
        ctxFrom(base({ courtNote: { text: "CCTV continuity incomplete.", sendabilityLabel: "x" } })),
      ).filter((h) => h.findingCode === "FID_SILENT_CORRECTION").length,
      0,
    );
  });

  it("fid09_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-FID-09-NO-SILENT-CORRECTION")!;
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)), "missing:included_solicitor_visible_wording");
  });

  it("fid09_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(base({ courtNote: { text: "Amendment history is disclosed openly.", sendabilityLabel: "x" } })),
        "MAA2-FID-09-NO-SILENT-CORRECTION",
      ).length,
      0,
    );
  });
});

describe("Batch-6 XEX-07 sendability conflict", () => {
  it("xex07_positive", () => {
    assert.ok(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "Court note.", sendabilityLabel: "Ready to send" },
            exportVersion: { reviewFooter: "Solicitor review required." },
          }),
        ),
      ).some((h) => h.findingCode === "XEX_SENDABILITY_CONFLICT"),
    );
  });

  it("xex07_negatives — aligned labels", () => {
    assert.equal(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "Court note.", sendabilityLabel: "Solicitor review required" },
            exportVersion: { reviewFooter: "Solicitor review required." },
          }),
        ),
      ).filter((h) => h.findingCode === "XEX_SENDABILITY_CONFLICT").length,
      0,
    );
    assert.equal(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "Court note.", sendabilityLabel: "Needs review" },
            exportVersion: { reviewFooter: "Do not send without solicitor review." },
          }),
        ),
      ).filter((h) => h.findingCode === "XEX_SENDABILITY_CONFLICT").length,
      0,
    );
  });

  it("xex07_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY")!;
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("xex07_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            courtNote: { text: "Court note.", sendabilityLabel: "Solicitor review required" },
            exportVersion: { reviewFooter: "Solicitor review required." },
          }),
        ),
        "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
      ).length,
      0,
    );
  });
});

describe("Batch-6 PRI-01 important omission", () => {
  it("pri01_positive", () => {
    assert.ok(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "Primary court wording present.", sendabilityLabel: "x" },
            fiveAnswersEvidenceRows: [],
          }),
        ),
      ).some((h) => h.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION"),
    );
  });

  it("pri01_negatives — fiveAnswers present", () => {
    assert.equal(
      evaluateCrossOutput(ctxFrom(base())).filter((h) => h.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION")
        .length,
      0,
    );
    assert.equal(
      evaluateCrossOutput(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [{ label: "BWV", existence: "referred_only", reliability: "needs_review", note: "referred" }],
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION").length,
      0,
    );
  });

  it("pri01_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION")!;
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("pri01_mutation — restore fiveAnswers clears finding", () => {
    assert.equal(
      evaluateControl(ctxFrom(base()), "MAA2-PRI-01-NO-IMPORTANT-OMISSION").length,
      0,
    );
  });
});

describe("Batch-6 EVS-02 state enum", () => {
  it("evs02_positive", () => {
    assert.ok(
      evaluateEvidenceIdentityState(
        ctxFrom(
          base({
            evidenceStates: [{ inferredSourceState: "weird_token", label: "CCTV", evidenceAnchor: "a" }],
          }),
        ),
      ).some((h) => h.findingCode === "EVS_UNKNOWN_STATE_TOKEN"),
    );
  });

  it("evs02_negatives — known enum tokens", () => {
    for (const state of ["served", "referred_only", "incomplete", "quarantined"]) {
      assert.equal(
        evaluateEvidenceIdentityState(
          ctxFrom(base({ evidenceStates: [{ inferredSourceState: state, label: "CCTV", evidenceAnchor: "a" }] })),
        ).filter((h) => h.findingCode === "EVS_UNKNOWN_STATE_TOKEN").length,
        0,
        state,
      );
    }
  });

  it("evs02_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-EVS-02-STATE-ENUM")!;
    const empty = {
      courtNote: { text: "x", sendabilityLabel: "x" },
      fiveAnswersEvidenceRows: [],
      evidenceStates: [],
      warningsAndGaps: {},
      exportVersion: {},
    };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("evs02_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(base({ evidenceStates: [{ inferredSourceState: "served", label: "CCTV", evidenceAnchor: "a" }] })),
        "MAA2-EVS-02-STATE-ENUM",
      ).length,
      0,
    );
  });
});

describe("Batch-6 EVS-03 reliability reason", () => {
  it("evs03_positive", () => {
    assert.ok(
      evaluateEvidenceIdentityState(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "unreliable", reliability: "unreliable", note: "" }],
          }),
        ),
      ).some((h) => h.findingCode === "EVS_UNRELIABLE_WITHOUT_REASON"),
    );
  });

  it("evs03_negatives — reason present / not unreliable", () => {
    assert.equal(
      evaluateEvidenceIdentityState(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              { label: "CCTV", existence: "unreliable", reliability: "unreliable", note: "blurred still only" },
            ],
          }),
        ),
      ).filter((h) => h.findingCode === "EVS_UNRELIABLE_WITHOUT_REASON").length,
      0,
    );
    assert.equal(
      evaluateEvidenceIdentityState(ctxFrom(base())).filter((h) => h.findingCode === "EVS_UNRELIABLE_WITHOUT_REASON")
        .length,
      0,
    );
  });

  it("evs03_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find(
      (x) => x.controlId === "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
    )!;
    const empty = {
      courtNote: { text: "x", sendabilityLabel: "x" },
      fiveAnswersEvidenceRows: [],
      evidenceStates: [{ inferredSourceState: "served", label: "x" }],
      warningsAndGaps: {},
      exportVersion: {},
    };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("evs03_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              { label: "CCTV", existence: "unreliable", reliability: "unreliable", note: "blurred still only" },
            ],
          }),
        ),
        "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
      ).length,
      0,
    );
  });
});

describe("Batch-6 XEX-01 charge warning attached", () => {
  it("xex01_positive", () => {
    assert.ok(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "The charge is disputed; identity contested.", sendabilityLabel: "x" },
            warningsAndGaps: { chaseItems: [], doNotOverstate: ["Do not overstate CCTV continuity."] },
          }),
        ),
      ).some((h) => h.controlId === "MAA2-XEX-01-CHARGE-WARNING-ATTACHED"),
    );
  });

  it("xex01_negatives — attached charge warning / no dispute", () => {
    assert.equal(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "The charge is disputed on count 1.", sendabilityLabel: "x" },
            warningsAndGaps: {
              chaseItems: [],
              doNotOverstate: ["Do not overstate charge wording pending amendment."],
            },
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-XEX-01-CHARGE-WARNING-ATTACHED" && h.candidateClass === "candidate_defect")
        .length,
      0,
    );
    assert.equal(
      evaluateCrossOutput(
        ctxFrom(
          base({
            courtNote: { text: "CCTV continuity incomplete.", sendabilityLabel: "x" },
            warningsAndGaps: { chaseItems: [], doNotOverstate: ["Do not overstate CCTV."] },
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-XEX-01-CHARGE-WARNING-ATTACHED" && h.candidateClass === "candidate_defect")
        .length,
      0,
    );
  });

  it("xex01_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-XEX-01-CHARGE-WARNING-ATTACHED")!;
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("xex01_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            courtNote: { text: "The charge is disputed on count 1.", sendabilityLabel: "x" },
            warningsAndGaps: {
              chaseItems: [],
              doNotOverstate: ["Do not overstate charge wording pending amendment."],
            },
          }),
        ),
        "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
      ).filter((h) => h.candidateClass === "candidate_defect").length,
      0,
    );
  });
});

describe("Batch-6 SRC-10 source vs compiled page", () => {
  it("src10_positive", () => {
    assert.ok(
      evaluateProvenanceReliability(
        ctxFrom(
          base({
            evidenceStates: [
              {
                inferredSourceState: "served",
                label: "CCTV",
                evidenceAnchor: "defaulted to page 1 as source page",
              },
            ],
          }),
        ),
      ).some((h) => h.findingCode === "SRC_SYNTHETIC_OR_COLLAPSED_PAGE"),
    );
  });

  it("src10_negatives — honest unknown / ordinary page", () => {
    assert.equal(
      evaluateProvenanceReliability(
        ctxFrom(
          base({
            evidenceStates: [
              {
                inferredSourceState: "served",
                label: "CCTV",
                evidenceAnchor: "source page unknown",
              },
            ],
          }),
        ),
      ).filter((h) => h.findingCode === "SRC_SYNTHETIC_OR_COLLAPSED_PAGE").length,
      0,
    );
    assert.equal(
      evaluateProvenanceReliability(
        ctxFrom(
          base({
            evidenceStates: [
              { inferredSourceState: "served", label: "CCTV", evidenceAnchor: "source page 14" },
            ],
          }),
        ),
      ).filter((h) => h.findingCode === "SRC_SYNTHETIC_OR_COLLAPSED_PAGE").length,
      0,
    );
  });

  it("src10_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE")!;
    const empty = {
      courtNote: { text: "x", sendabilityLabel: "x" },
      fiveAnswersEvidenceRows: [],
      evidenceStates: [],
      warningsAndGaps: {},
      exportVersion: {},
    };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("src10_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            evidenceStates: [
              { inferredSourceState: "served", label: "CCTV", evidenceAnchor: "source page unknown" },
            ],
          }),
        ),
        "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
      ).length,
      0,
    );
  });
});

describe("Batch-6 contract anchors", () => {
  it("every selected (promoted) control has resolving contract refs in this file", () => {
    for (const id of BATCH6_SELECTED_CONTROL_IDS) {
      const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === id)!;
      assert.ok(h.positiveContract.includes(".test.ts#"), id);
      assert.ok(h.negativeContract.includes(".test.ts#"), id);
      assert.ok(h.receiptValidator === "maa-v2-candidate-finding@1.0.0", id);
      assert.equal(h.detectorClassification, "genuine_structured_detector", id);
    }
  });
});
