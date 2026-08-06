/**
 * MAA V2 Stage-150 Batch-9 contracts — behavioural proof remediation.
 * Markers #b9_<slug>_{positive|negative|unavailable|mutation} are literal registry anchors;
 * behavioural proof is the 37×4 fixture matrix executed via the harness.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBatch9UnlockCoverage,
  BATCH9_CONTROL_IDS,
  BATCH9_CONTROL_SPECS,
  namedEvaluatorCount,
  summarizeExecutionAvailability,
  summarizeImplementationClasses,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/control-specs";
import {
  BATCH9_IMMUTABLE_PROMOTION_REGISTRY,
  BATCH9_IMPLEMENTED_IDS,
  buildEvaluatorClassSummary,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/disposition";
import {
  assertHarnessRejectsNoOpFixture,
  runAllBehaviouralFixtures,
  validateBehaviouralHarnessReport,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/behavioural-harness";
import { assertBehaviouralFixtureCoverage } from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/behavioural-fixtures";
import { assertBatch9RegistryContracts } from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/registry-validation";
import { BATCH9_BASELINE } from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/schemas";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { STAGE150_IMPLEMENTED_IDS } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildEvalContext } from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { buildAllBatch9Receipts } from "../lib/eval/master-assurance-auditor/v2/stage150/batch9/receipts";

/**
 * Literal contract markers — must appear as static substrings for registry validation.
 */
const BATCH9_LITERAL_CONTRACT_MARKERS = [
  "#b9_chg01_positive", "#b9_chg01_negative", "#b9_chg01_unavailable", "#b9_chg01_mutation",
  "#b9_chg02_positive", "#b9_chg02_negative", "#b9_chg02_unavailable", "#b9_chg02_mutation",
  "#b9_chg04_positive", "#b9_chg04_negative", "#b9_chg04_unavailable", "#b9_chg04_mutation",
  "#b9_chg05_positive", "#b9_chg05_negative", "#b9_chg05_unavailable", "#b9_chg05_mutation",
  "#b9_chg06_positive", "#b9_chg06_negative", "#b9_chg06_unavailable", "#b9_chg06_mutation",
  "#b9_chg10_positive", "#b9_chg10_negative", "#b9_chg10_unavailable", "#b9_chg10_mutation",
  "#b9_lsl01_positive", "#b9_lsl01_negative", "#b9_lsl01_unavailable", "#b9_lsl01_mutation",
  "#b9_lsl03_positive", "#b9_lsl03_negative", "#b9_lsl03_unavailable", "#b9_lsl03_mutation",
  "#b9_bnd02_positive", "#b9_bnd02_negative", "#b9_bnd02_unavailable", "#b9_bnd02_mutation",
  "#b9_bnd03_positive", "#b9_bnd03_negative", "#b9_bnd03_unavailable", "#b9_bnd03_mutation",
  "#b9_bnd04_positive", "#b9_bnd04_negative", "#b9_bnd04_unavailable", "#b9_bnd04_mutation",
  "#b9_atr01_positive", "#b9_atr01_negative", "#b9_atr01_unavailable", "#b9_atr01_mutation",
  "#b9_atr08_positive", "#b9_atr08_negative", "#b9_atr08_unavailable", "#b9_atr08_mutation",
  "#b9_bnd07_positive", "#b9_bnd07_negative", "#b9_bnd07_unavailable", "#b9_bnd07_mutation",
  "#b9_bnd08_positive", "#b9_bnd08_negative", "#b9_bnd08_unavailable", "#b9_bnd08_mutation",
  "#b9_bnd09_positive", "#b9_bnd09_negative", "#b9_bnd09_unavailable", "#b9_bnd09_mutation",
  "#b9_bnd10_positive", "#b9_bnd10_negative", "#b9_bnd10_unavailable", "#b9_bnd10_mutation",
  "#b9_bnd11_positive", "#b9_bnd11_negative", "#b9_bnd11_unavailable", "#b9_bnd11_mutation",
  "#b9_evs04_positive", "#b9_evs04_negative", "#b9_evs04_unavailable", "#b9_evs04_mutation",
  "#b9_chr01_positive", "#b9_chr01_negative", "#b9_chr01_unavailable", "#b9_chr01_mutation",
  "#b9_chr02_positive", "#b9_chr02_negative", "#b9_chr02_unavailable", "#b9_chr02_mutation",
  "#b9_chr03_positive", "#b9_chr03_negative", "#b9_chr03_unavailable", "#b9_chr03_mutation",
  "#b9_chr04_positive", "#b9_chr04_negative", "#b9_chr04_unavailable", "#b9_chr04_mutation",
  "#b9_chr05_positive", "#b9_chr05_negative", "#b9_chr05_unavailable", "#b9_chr05_mutation",
  "#b9_src10_positive", "#b9_src10_negative", "#b9_src10_unavailable", "#b9_src10_mutation",
  "#b9_atr09_positive", "#b9_atr09_negative", "#b9_atr09_unavailable", "#b9_atr09_mutation",
  "#b9_fid10_positive", "#b9_fid10_negative", "#b9_fid10_unavailable", "#b9_fid10_mutation",
  "#b9_chr09_positive", "#b9_chr09_negative", "#b9_chr09_unavailable", "#b9_chr09_mutation",
  "#b9_chs02_positive", "#b9_chs02_negative", "#b9_chs02_unavailable", "#b9_chs02_mutation",
  "#b9_chs06_positive", "#b9_chs06_negative", "#b9_chs06_unavailable", "#b9_chs06_mutation",
  "#b9_bnd05_positive", "#b9_bnd05_negative", "#b9_bnd05_unavailable", "#b9_bnd05_mutation",
  "#b9_bnd12_positive", "#b9_bnd12_negative", "#b9_bnd12_unavailable", "#b9_bnd12_mutation",
  "#b9_xex01_positive", "#b9_xex01_negative", "#b9_xex01_unavailable", "#b9_xex01_mutation",
  "#b9_xex07_positive", "#b9_xex07_negative", "#b9_xex07_unavailable", "#b9_xex07_mutation",
  "#b9_xex08_positive", "#b9_xex08_negative", "#b9_xex08_unavailable", "#b9_xex08_mutation",
  "#b9_xex02_positive", "#b9_xex02_negative", "#b9_xex02_unavailable", "#b9_xex02_mutation",
  "#b9_xex06_positive", "#b9_xex06_negative", "#b9_xex06_unavailable", "#b9_xex06_mutation",
] as const;

describe("Batch-9 two-axis honesty", () => {
  it("covers exact 37; empty promotion registry; totals 8/98/55", () => {
    assertBatch9UnlockCoverage();
    assert.equal(BATCH9_CONTROL_IDS.length, 37);
    assert.equal(BATCH9_IMMUTABLE_PROMOTION_REGISTRY.length, 0);
    assert.equal(BATCH9_IMPLEMENTED_IDS.size, 0);
    assert.equal(BATCH9_BASELINE, "1493fe5409006dcea163f65a3ac64463f6060f03");
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.implemented, 8);
    assert.equal(m.totals.partially_implemented, 98);
    assert.equal(m.totals.specified_not_implemented, 55);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
    assert.equal(STAGE150_IMPLEMENTED_IDS.size, 8);
  });

  it("splits implementation class from execution availability", () => {
    const summary = buildEvaluatorClassSummary();
    assert.equal(summary.substantiveEvaluatorCount, 36);
    assert.equal(summary.adapterIntegrityCount, 1);
    assert.equal(summary.stubOrProxyCount, 0);
    assert.equal(summary.namedEvaluatorCount, 37);
    assert.equal(summary.esaRunnableCount, 1);
    assert.equal(summary.esaUnavailableCount, 36);
    assert.deepEqual(summary.byImplementationClass, summarizeImplementationClasses());
    assert.deepEqual(summary.byExecutionAvailability, summarizeExecutionAvailability());
    assert.equal(namedEvaluatorCount(), 37);
    for (const s of BATCH9_CONTROL_SPECS) {
      assert.equal(s.evaluatorClass, s.evaluatorImplementationClass);
      assert.ok(s.executionAvailability);
    }
  });

  it("registry + fixture coverage", () => {
    assert.equal(BATCH9_LITERAL_CONTRACT_MARKERS.length, 37 * 4);
    assertBatch9RegistryContracts();
    assertBehaviouralFixtureCoverage();
  });
});

describe("Batch-9 behavioural contract matrix", () => {
  it("executes all 37×4 real evaluator/receipt fixtures", () => {
    const report = runAllBehaviouralFixtures();
    validateBehaviouralHarnessReport(report);
    assert.equal(report.totalExecutions, 148);
  });

  it("negative self-test: harness rejects no-op fixture", () => {
    assertHarnessRejectsNoOpFixture();
  });
});

describe("Batch-9 ESA receipts", () => {
  it("ESA-like: only XEX-08 evaluated; truth unopened posture", () => {
    const ctx = buildEvalContext("esa", {
      caseId: "esa",
      courtNote: { text: "x", sendabilityLabel: "Solicitor review required", canCopy: true },
      exportVersion: {
        exportId: "e",
        generatedAt: "2026-01-01T00:00:00Z",
        sendability: "needs_solicitor_review",
        reviewFooter: "r",
      },
      fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "x" }],
      evidenceStates: [
        { label: "CCTV", inferredSourceState: "served", source: "b.pdf", evidenceAnchor: "p.1" },
      ],
      warningsAndGaps: {
        chaseItems: [{ label: "CCTV", sendabilityLabel: "x", copySuggestion: "y" }],
        doNotOverstate: [],
      },
    });
    const receipts = buildAllBatch9Receipts(ctx);
    assert.equal(receipts.length, 37);
    const evaluated = receipts.filter((r) => r.namedControlExerciseStatus === "evaluated");
    assert.equal(evaluated.length, 1);
    assert.equal(evaluated[0]!.controlId, "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED");
    assert.equal(evaluated[0]!.evaluatorImplementationClass, "adapter_integrity_evaluator");
    assert.equal(evaluated[0]!.executionAvailability, "runnable_on_ESA");
  });
});
