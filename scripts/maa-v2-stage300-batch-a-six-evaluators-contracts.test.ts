/**
 * MAA V2 Stage-300 Batch-A — six substantive evaluator contracts.
 * Fixtures prove behaviour only; not corpus calibration.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  BATCH_A_SIX_CONTROL_IDS,
  BATCH_A_SIX_SPECS,
  PINNED_LEGAL_STATE_CATEGORY_SET,
  assertHarnessCannotPassWithoutEvaluator,
  evaluateBatchASixControl,
  executeHarnessKind,
  fixtureChr06NegativeAdultAsYouth,
  fixtureChr12NegativeMissingInputs,
  fixtureLsl05NegativeSourceFactInferenceOnly,
  fixturePrc03CrossDefendant,
  fixturePrc04NegativeFitToPleadBoolean,
  fixturePrc07NegativePiiCountedAsServed,
  runAllHarnessKinds,
} from "../lib/eval/master-assurance-auditor/v2/stage300/batch-a/evaluators";

describe("Batch-A six evaluator registry honesty", () => {
  it("ba6_specs_match_six_controls_and_pinned_taxonomy", () => {
    assert.equal(BATCH_A_SIX_SPECS.length, 6);
    assert.deepEqual(
      BATCH_A_SIX_SPECS.map((s) => s.controlId),
      [...BATCH_A_SIX_CONTROL_IDS],
    );
    assert.equal(PINNED_LEGAL_STATE_CATEGORY_SET.length, 10);
    assert.ok(BATCH_A_SIX_SPECS.every((s) => s.phraseProbeForbidden === true));
  });

  it("ba6_no_truth_key_imports_in_evaluators", () => {
    const dir = path.join(
      process.cwd(),
      "lib/eval/master-assurance-auditor/v2/stage300/batch-a/evaluators",
    );
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      assert.equal(src.includes("truth-key"), false, f);
      assert.equal(src.includes("truthKey"), false, f);
    }
  });
});

describe("Batch-A six evaluator harness (positive/negative/unavailable/ambiguous/mutation)", () => {
  it("ba6_full_harness_30_executions", () => {
    const traces = runAllHarnessKinds();
    assert.equal(traces.length, 30);
    assert.ok(traces.every((t) => t.invokedEvaluator));
  });

  it("ba6_noop_self_test_requires_evaluator_execution", () => {
    assertHarnessCannotPassWithoutEvaluator();
  });
});

describe("Batch-A LSL-05 extra negatives", () => {
  it("ba6_lsl05_negative_source_fact_inference_only", () => {
    const r = evaluateBatchASixControl(
      "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
      fixtureLsl05NegativeSourceFactInferenceOnly(),
    );
    assert.equal(r.namedControlExerciseStatus, "evaluated");
    assert.ok(r.hits.length >= 1);
  });

  it("ba6_lsl05_cross_document_surface_refs_preserved", () => {
    const t = executeHarnessKind("MAA2-LSL-05-CATEGORY-SET-COVERAGE", "positive");
    assert.equal(t.findingCount, 0);
  });
});

describe("Batch-A CHR-06/12 extra negatives", () => {
  it("ba6_chr06_negative_adult_reported_as_youth", () => {
    const r = evaluateBatchASixControl(
      "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
      fixtureChr06NegativeAdultAsYouth(),
    );
    assert.ok(r.hits.length >= 1);
    assert.equal(r.hits[0]!.findingCode, "BA6_CHR06_WRONG_AGE_CLASS");
  });

  it("ba6_chr12_negative_derived_values_without_inputs", () => {
    const r = evaluateBatchASixControl(
      "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
      fixtureChr12NegativeMissingInputs(),
    );
    assert.ok(r.hits.length >= 1);
  });
});

describe("Batch-A PRC extra negatives", () => {
  it("ba6_prc03_cross_defendant_conflation_owned", () => {
    const r = evaluateBatchASixControl("MAA2-PRC-03-YOUTH-STATE", fixturePrc03CrossDefendant());
    assert.ok(r.hits.length >= 1);
    assert.ok(r.evidenceRefs.some((e) => e.includes("youthState")));
  });

  it("ba6_prc04_fitToPlead_boolean_is_decision", () => {
    const r = evaluateBatchASixControl(
      "MAA2-PRC-04-FITNESS-PARTICIPATION",
      fixturePrc04NegativeFitToPleadBoolean(),
    );
    assert.ok(r.hits.length >= 1);
  });

  it("ba6_prc07_pii_counted_as_served", () => {
    const r = evaluateBatchASixControl(
      "MAA2-PRC-07-DISCLOSURE-PII-STATE",
      fixturePrc07NegativePiiCountedAsServed(),
    );
    assert.ok(r.hits.length >= 1);
  });
});

describe("Batch-A six — not promoted", () => {
  it("ba6_must_not_touch_stage150_implemented_set", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented.ts"),
      "utf8",
    );
    for (const id of BATCH_A_SIX_CONTROL_IDS) {
      assert.equal(src.includes(id), false, `must not promote ${id}`);
    }
  });
});
