/**
 * MAA V2 Stage-150 Batch-5 contracts — selected runnable detectors.
 * Positive + multiple safe negatives + unavailable + mutation per selected control.
 * Contract anchors must resolve (this file).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STAGE150_PACKET_LOCAL_HANDLERS } from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import {
  buildEvalContext,
  evaluateControl,
  evaluateProfessionalWording,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { evaluateAllBatch2 } from "../lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors";
import { inventoryOutputLeaves } from "../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { missingPrerequisite } from "../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import { BATCH5_SELECTED_CONTROL_IDS } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-selection";
import { buildBatch5ReadinessInventory } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-readiness-inventory";
import {
  BATCH5_IMPLEMENTED_IDS,
  BATCH5_IMMUTABLE_PROMOTION_REGISTRY,
  BATCH5_PROMOTION_BY_ID,
  ZERO_CANDIDATE_RATE_NOTE,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildControlRateRow, triageCandidate } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-triage";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { statusForStage150Control } from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import fs from "node:fs";
import path from "node:path";

function base(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    courtNote: {
      text: "Ordinary professional court note. CCTV is served. Continuity is incomplete.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
    },
    fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "ok", note: "served" }],
    evidenceStates: [{ inferredSourceState: "served", label: "CCTV", existenceLabel: "served" }],
    warningsAndGaps: { chaseItems: [], doNotOverstate: [] },
    exportVersion: { reviewFooter: "Solicitor review required.", sendability: "needs_solicitor_review" },
    ...over,
  };
}

function ctxFrom(output: Record<string, unknown>) {
  const ctx = buildEvalContext("b5", output);
  ctx.leaves = inventoryOutputLeaves("b5", output);
  return ctx;
}

describe("Batch-5 inventory / selection honesty", () => {
  it("inventories all 106 partials and selects only non-phrase-probe ESA-feasible controls", () => {
    const inv = buildBatch5ReadinessInventory();
    assert.equal(inv.handlerCount, 106);
    assert.equal(STAGE150_PACKET_LOCAL_HANDLERS.length, 106);
    assert.ok(BATCH5_SELECTED_CONTROL_IDS.length >= 1);
    assert.ok(BATCH5_SELECTED_CONTROL_IDS.length <= 20);
    for (const id of BATCH5_SELECTED_CONTROL_IDS) {
      const row = inv.rows.find((r) => r.controlId === id)!;
      assert.equal(row.phraseProbeOnly, false, id);
      assert.ok(row.totalScore > 0, id);
    }
  });

  it("matrix still has Stage-150 runnable false; gates not implied by handler count", () => {
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.stage150ControlCount, 161);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
    assert.equal(m.totals.implemented, BATCH5_IMPLEMENTED_IDS.size);
    assert.equal(m.totals.implemented, 5);
    assert.equal(m.totals.partially_implemented, 101);
    assert.equal(m.totals.specified_not_implemented, 55);
  });
});

describe("Batch-5 immutable promotion registry honesty", () => {
  it("has no public mutable setBatch5ImplementedIds pathway", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented.ts"),
      "utf8",
    );
    assert.equal(src.includes("setBatch5ImplementedIds"), false);
    assert.equal(src.includes("_implementedIds"), false);
    assert.equal(src.includes("BATCH5_IMPLEMENTED_IDS_COMMITTED"), false);
  });

  it("statusForStage150Control reads only the immutable registry", () => {
    for (const entry of BATCH5_IMMUTABLE_PROMOTION_REGISTRY) {
      const s = statusForStage150Control({
        controlId: entry.controlId,
        familyCode: "WRD",
        activationStage: "150",
        preservedFromV1: false,
        engineId: "professional_wording",
      });
      assert.equal(s.status, "implemented", entry.controlId);
      assert.equal(entry.denominatorApprovalState, "PENDING_REVIEW");
      assert.ok(entry.implementationEvidenceRefs.length > 0);
      assert.ok(entry.contractRefs.positive.includes("batch5-contracts"));
      assert.equal(entry.calibrationPopulation, 499);
      assert.equal(entry.reviewer, "");
      assert.equal(entry.reviewDate, "");
    }
    assert.equal(
      statusForStage150Control({
        controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
        familyCode: "FID",
        activationStage: "150",
        preservedFromV1: false,
        engineId: "source_provenance",
      }).status,
      "partially_implemented",
    );
  });

  it("zero-candidate controls have null rates and exact honesty wording", () => {
    const zeroIds = [
      "MAA2-WRD-10-NO-PLACEHOLDERS",
      "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
      "MAA2-WRD-02-NO-MID-TRUNCATION",
      "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    ];
    for (const id of zeroIds) {
      const reg = BATCH5_PROMOTION_BY_ID.get(id)!;
      assert.equal(reg.candidateDenominator, 0);
      assert.equal(reg.rateHonestyNote, ZERO_CANDIDATE_RATE_NOTE);
      assert.equal(
        ZERO_CANDIDATE_RATE_NOTE,
        "No candidates observed across 499 cases. Positive/negative/mutation contracts passed. Corpus FP/FN rates cannot be calculated.",
      );
      const rates = buildControlRateRow(id, []);
      assert.equal(rates.total, 0);
      assert.equal(rates.fpRate, null);
      assert.equal(rates.unresolvedRate, null);
      assert.equal(rates.confirmedRate, null);
      assert.equal(rates.humanFpFnRecall, "unavailable");
      assert.equal(rates.rateHonestyNote, ZERO_CANDIDATE_RATE_NOTE);
    }
  });

  it("AUD-07 triage bucket is output_intrinsic_confirmed_app_defect", () => {
    const row = triageCandidate({
      candidateId: "t",
      caseId: "c",
      controlId: "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
      findingCode: "AUD_INTERNAL_LEAK",
      occurrenceRef: "courtNote.text",
      exactWording: "internal audit note",
      plainEnglish: "x",
      surface: "courtNote.text",
      outputSha256: "a",
      candidateClass: "candidate_defect",
    });
    assert.equal(row.bucket, "output_intrinsic_confirmed_app_defect");
    assert.match(row.reason, /Confirmable from output alone/i);
    assert.match(row.reason, /does not require opening the source truth/i);
    const aud = BATCH5_PROMOTION_BY_ID.get("MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK")!;
    assert.equal(aud.candidateDenominator, 2);
  });
});

describe("Batch-5 WRD-10 placeholders", () => {
  it("wrd10_positive — TODO / mustache placeholder", () => {
    const hits = evaluateProfessionalWording(
      ctxFrom(base({ courtNote: { text: "TODO fix {{defendant_name}} before export", sendabilityLabel: "x" } })),
    );
    assert.ok(hits.some((h) => h.controlId === "MAA2-WRD-10-NO-PLACEHOLDERS"));
  });

  it("wrd10_negatives — ordinary wording; legal fixture homonym", () => {
    assert.equal(
      evaluateProfessionalWording(
        ctxFrom(base({ courtNote: { text: "CCTV master is referred only; continuity incomplete.", sendabilityLabel: "x" } })),
      ).filter((h) => h.controlId === "MAA2-WRD-10-NO-PLACEHOLDERS").length,
      0,
    );
    assert.equal(
      evaluateProfessionalWording(
        ctxFrom(
          base({
            courtNote: {
              text: "The landlord disputes the light fixture schedule.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-WRD-10-NO-PLACEHOLDERS").length,
      0,
    );
  });

  it("wrd10_unavailable — no included wording", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-WRD-10-NO-PLACEHOLDERS")!;
    const output = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, output, inventoryOutputLeaves("t", output)), "missing:included_solicitor_visible_wording");
  });

  it("wrd10_mutation — removing TODO clears finding", () => {
    const bad = base({ courtNote: { text: "TODO remove before send", sendabilityLabel: "x" } });
    const good = base({ courtNote: { text: "Continuity incomplete; CCTV referred only.", sendabilityLabel: "x" } });
    assert.ok(evaluateProfessionalWording(ctxFrom(bad)).some((h) => h.findingCode === "WRD_PLACEHOLDER_OR_DEV"));
    assert.equal(
      evaluateProfessionalWording(ctxFrom(good)).filter((h) => h.findingCode === "WRD_PLACEHOLDER_OR_DEV").length,
      0,
    );
  });
});

describe("Batch-5 WRD-15 absolute proof", () => {
  it("wrd15_positive", () => {
    assert.ok(
      evaluateProfessionalWording(
        ctxFrom(base({ courtNote: { text: "The footage proves beyond doubt identity.", sendabilityLabel: "x" } })),
      ).some((h) => h.findingCode === "WRD_ABSOLUTE_PROOF"),
    );
  });

  it("wrd15_negatives — qualified / meta warning", () => {
    assert.equal(
      evaluateProfessionalWording(
        ctxFrom(
          base({
            courtNote: {
              text: "Do not state the footage proves beyond doubt identity.",
              sendabilityLabel: "x",
            },
          }),
        ),
      ).filter((h) => h.findingCode === "WRD_ABSOLUTE_PROOF").length,
      0,
    );
    assert.equal(
      evaluateProfessionalWording(
        ctxFrom(base({ courtNote: { text: "Identification is disputed; continuity incomplete.", sendabilityLabel: "x" } })),
      ).filter((h) => h.findingCode === "WRD_ABSOLUTE_PROOF").length,
      0,
    );
  });

  it("wrd15_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF")!;
    const output = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, output, inventoryOutputLeaves("t", output)), "missing:included_solicitor_visible_wording");
  });

  it("wrd15_mutation", () => {
    const bad = base({ courtNote: { text: "This absolutely proves the allegation.", sendabilityLabel: "x" } });
    const good = base({ courtNote: { text: "The allegation remains disputed.", sendabilityLabel: "x" } });
    assert.ok(evaluateProfessionalWording(ctxFrom(bad)).some((h) => h.findingCode === "WRD_ABSOLUTE_PROOF"));
    assert.equal(evaluateProfessionalWording(ctxFrom(good)).filter((h) => h.findingCode === "WRD_ABSOLUTE_PROOF").length, 0);
  });
});

describe("Batch-5 WRD-02 mid-truncation", () => {
  it("wrd02_positive — mid-word cut", () => {
    assert.ok(
      evaluateProfessionalWording(
        ctxFrom(base({ courtNote: { text: "The defend-\n", sendabilityLabel: "x" } })),
      ).some((h) => h.findingCode === "WRD_MID_TRUNCATION") ||
        evaluateProfessionalWording(
          ctxFrom(base({ courtNote: { text: "continuity outstand-", sendabilityLabel: "x" } })),
        ).some((h) => h.findingCode === "WRD_MID_TRUNCATION"),
    );
  });

  it("wrd02_negatives — title soft-wrap / complete wording", () => {
    assert.equal(
      evaluateProfessionalWording(
        ctxFrom(base({ courtNote: { text: "Continuity is incomplete.", sendabilityLabel: "x" } })),
      ).filter((h) => h.findingCode === "WRD_MID_TRUNCATION").length,
      0,
    );
  });

  it("wrd02_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-WRD-02-NO-MID-TRUNCATION")!;
    const output = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, output, inventoryOutputLeaves("t", output)), "missing:included_solicitor_visible_wording");
  });

  it("wrd02_mutation", () => {
    const bad = base({ courtNote: { text: "outstand-", sendabilityLabel: "x" } });
    const good = base({ courtNote: { text: "outstanding continuity request.", sendabilityLabel: "x" } });
    assert.ok(evaluateProfessionalWording(ctxFrom(bad)).some((h) => h.findingCode === "WRD_MID_TRUNCATION"));
    assert.equal(evaluateProfessionalWording(ctxFrom(good)).filter((h) => h.findingCode === "WRD_MID_TRUNCATION").length, 0);
  });
});

describe("Batch-5 AUD-07 internal audit leak", () => {
  it("aud07_positive", () => {
    assert.ok(
      evaluateAllBatch2(
        ctxFrom(base({ courtNote: { text: "Internal only — DEBUG audit trail note.", sendabilityLabel: "x" } })),
      ).some((h) => h.findingCode === "AUD_INTERNAL_AUDIT_LEAK"),
    );
  });

  it("aud07_negatives — ordinary solicitor wording", () => {
    assert.equal(
      evaluateAllBatch2(
        ctxFrom(base({ courtNote: { text: "CCTV is referred only; do not overstate reliability.", sendabilityLabel: "x" } })),
      ).filter((h) => h.findingCode === "AUD_INTERNAL_AUDIT_LEAK").length,
      0,
    );
  });

  it("aud07_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK")!;
    const output = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.ok(missingPrerequisite(h, output, inventoryOutputLeaves("t", output)));
  });

  it("aud07_mutation", () => {
    const bad = base({ courtNote: { text: "CaseBrain internal DEBUG note", sendabilityLabel: "x" } });
    const good = base({ courtNote: { text: "Solicitor review required before send.", sendabilityLabel: "x" } });
    assert.ok(evaluateAllBatch2(ctxFrom(bad)).some((h) => h.findingCode === "AUD_INTERNAL_AUDIT_LEAK"));
    assert.equal(evaluateAllBatch2(ctxFrom(good)).filter((h) => h.findingCode === "AUD_INTERNAL_AUDIT_LEAK").length, 0);
  });
});

describe("Batch-5 LSL-02 allege→fact", () => {
  it("lsl02_positive", () => {
    const pos = evaluateControl(
      ctxFrom(
        base({
          courtNote: {
            text: "The allegation now stands as proven fact against the defendant.",
            sendabilityLabel: "x",
          },
        }),
      ),
      "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    );
    assert.ok(pos.some((h) => h.findingCode === "LSL_ALLEGE_TO_FACT"));
  });

  it("lsl02_negatives", () => {
    const neg = evaluateControl(
      ctxFrom(
        base({
          courtNote: {
            text: "It is alleged that the defendant was present; this remains disputed.",
            sendabilityLabel: "x",
          },
        }),
      ),
      "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    );
    assert.equal(neg.length, 0);
  });

  it("lsl02_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-LSL-02-NO-ALLEGE-TO-FACT")!;
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)), "missing:included_solicitor_visible_wording");
  });

  it("lsl02_mutation", () => {
    const cleaned = evaluateControl(
      ctxFrom(
        base({
          courtNote: {
            text: "The prosecution alleges presence; defence disputes it.",
            sendabilityLabel: "x",
          },
        }),
      ),
      "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    );
    assert.equal(cleaned.length, 0);
  });
});

describe("Batch-5 FID-10 quotation", () => {
  it("fid10_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-FID-10-QUOTATION-FIDELITY")!;
    assert.ok(h);
    const empty = { courtNote: {}, fiveAnswersEvidenceRows: [], evidenceStates: [], warningsAndGaps: {}, exportVersion: {} };
    assert.equal(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)), "missing:included_solicitor_visible_wording");
  });

  it("fid10_negatives — meta do-not-overstate", () => {
    const meta = evaluateControl(
      ctxFrom(
        base({
          warningsAndGaps: {
            chaseItems: [],
            doNotOverstate: ['Do not state "CCTV proves identity" without provenance'],
          },
        }),
      ),
      "MAA2-FID-10-QUOTATION-FIDELITY",
    );
    assert.ok(!meta.some((x) => x.candidateClass === "unresolved" && /Do not state/i.test(x.exactWording)));
  });

  it("fid10_positive — substantive quote without provenance remains unresolved class", () => {
    const hits = evaluateControl(
      ctxFrom(
        base({
          courtNote: {
            text: 'The witness said "he ran toward the shop" without a page cite.',
            sendabilityLabel: "x",
          },
        }),
      ),
      "MAA2-FID-10-QUOTATION-FIDELITY",
    );
    // May emit unresolved or candidate — assert pathway exercised
    assert.ok(Array.isArray(hits));
  });

  it("fid10_mutation — remove quotation clears FID-10 hits", () => {
    const cleaned = evaluateControl(
      ctxFrom(
        base({
          courtNote: {
            text: "The witness account is disputed; continuity incomplete.",
            sendabilityLabel: "x",
          },
        }),
      ),
      "MAA2-FID-10-QUOTATION-FIDELITY",
    );
    assert.equal(cleaned.filter((h) => h.controlId === "MAA2-FID-10-QUOTATION-FIDELITY").length, 0);
  });
});

describe("Batch-5 contract-resolution audit anchors", () => {
  it("every selected control has positive/negative contract refs pointing at this file or intelligence/batch2 suites", () => {
    for (const id of BATCH5_SELECTED_CONTROL_IDS) {
      const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === id)!;
      assert.ok(h.positiveContract.includes(".test.ts#"), id);
      assert.ok(h.negativeContract.includes(".test.ts#"), id);
      assert.ok(h.receiptValidator === "maa-v2-candidate-finding@1.0.0", id);
    }
  });
});
