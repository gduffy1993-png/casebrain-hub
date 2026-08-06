/**
 * Batch-9 behavioural contract harness — executes real evaluator/receipt paths.
 * Placeholder/marker-only checks are rejected.
 */

import assert from "node:assert/strict";
import { buildEvalContext } from "../detectors";
import {
  assertBehaviouralFixtureCoverage,
  BATCH9_BEHAVIOURAL_FIXTURE_MATRIX,
  type Batch9BehaviouralFixtureEntry,
  type Batch9FixtureKind,
} from "./behavioural-fixtures";
import { BATCH9_CONTROL_IDS, BATCH9_SPEC_BY_ID } from "./control-specs";
import { evaluateBatch9Control } from "./evaluators";
import { buildBatch9ExerciseReceipt } from "./receipts";

export type Batch9FixtureExecutionTrace = {
  controlId: string;
  kind: Batch9FixtureKind;
  invokedEvaluateBatch9Control: boolean;
  invokedBuildBatch9ExerciseReceipt: boolean;
  exerciseStatus: string;
  findingCount: number;
  findingCodes: string[];
  evidenceRefs: string[];
  missingInputReason: string | null;
};

export type Batch9BehaviouralHarnessReport = {
  controlCount: number;
  fixtureKindsExecuted: Record<Batch9FixtureKind, number>;
  totalExecutions: number;
  traces: Batch9FixtureExecutionTrace[];
};

function outcomeKey(status: string, findingCount: number): string {
  return `${status}|${findingCount}`;
}

/** Execute one fixture kind against the real evaluator + receipt builders. */
export function executeBehaviouralFixture(
  entry: Batch9BehaviouralFixtureEntry,
  kind: Batch9FixtureKind,
): Batch9FixtureExecutionTrace {
  const spec = BATCH9_SPEC_BY_ID.get(entry.controlId);
  if (!spec) throw new Error(`Unknown control ${entry.controlId}`);

  let output: Record<string, unknown>;
  if (kind === "mutation") {
    output = entry.mutation.mutate(structuredClone(entry.positive.output));
  } else {
    output = structuredClone(entry[kind].output);
  }

  const ctx = buildEvalContext(`b9-fix-${entry.controlId}-${kind}`, output);

  let invokedEvaluate = false;
  let invokedReceipt = false;

  const hits = evaluateBatch9Control(ctx, entry.controlId);
  invokedEvaluate = true;

  const receipt = buildBatch9ExerciseReceipt({ ctx, controlId: entry.controlId, hits });
  invokedReceipt = true;

  const trace: Batch9FixtureExecutionTrace = {
    controlId: entry.controlId,
    kind,
    invokedEvaluateBatch9Control: invokedEvaluate,
    invokedBuildBatch9ExerciseReceipt: invokedReceipt,
    exerciseStatus: receipt.namedControlExerciseStatus,
    findingCount: receipt.findingCount,
    findingCodes: receipt.findingCodes,
    evidenceRefs: receipt.evidenceRefs,
    missingInputReason: receipt.missingInputReason,
  };

  if (kind === "positive") {
    const exp = entry.positive.expect;
    assert.equal(trace.exerciseStatus, exp.exerciseStatus, `${entry.controlId} positive status`);
    assert.equal(trace.findingCount, exp.findingCount, `${entry.controlId} positive findings`);
  } else if (kind === "negative") {
    const exp = entry.negative.expect;
    assert.equal(trace.exerciseStatus, exp.exerciseStatus, `${entry.controlId} negative status`);
    assert.ok(
      trace.findingCount >= exp.minFindingCount,
      `${entry.controlId} negative min findings: got ${trace.findingCount}`,
    );
    assert.ok(
      trace.findingCodes.includes(exp.findingCode),
      `${entry.controlId} negative findingCode ${exp.findingCode} missing in ${trace.findingCodes.join(",")}`,
    );
    assert.equal(
      exp.findingCode,
      spec.findingCode,
      `${entry.controlId} findingCode must match owning control`,
    );
    for (const h of hits) {
      assert.equal(h.controlId, entry.controlId);
      assert.equal(h.findingCode, spec.findingCode);
    }
    for (const needle of exp.evidenceRefIncludes) {
      assert.ok(
        trace.evidenceRefs.some((r) => r.includes(needle)) ||
          hits.some((h) => h.occurrenceRef.includes(needle) || h.evidenceRefs.some((e) => e.includes(needle))),
        `${entry.controlId} negative evidence refs must include ${needle}; got ${trace.evidenceRefs.join(",")}`,
      );
    }
  } else if (kind === "unavailable") {
    const exp = entry.unavailable.expect;
    assert.equal(trace.exerciseStatus, exp.exerciseStatus, `${entry.controlId} unavailable status`);
    assert.ok(
      (trace.missingInputReason ?? "").includes(exp.missingInputReasonIncludes),
      `${entry.controlId} unavailable reason must include "${exp.missingInputReasonIncludes}"; got "${trace.missingInputReason}"`,
    );
  } else {
    const posHits = evaluateBatch9Control(
      buildEvalContext(`b9-fix-${entry.controlId}-pos-cmp`, entry.positive.output),
      entry.controlId,
    );
    const posReceipt = buildBatch9ExerciseReceipt({
      ctx: buildEvalContext(`b9-fix-${entry.controlId}-pos-cmp`, entry.positive.output),
      controlId: entry.controlId,
      hits: posHits,
    });
    const posKey = outcomeKey(posReceipt.namedControlExerciseStatus, posReceipt.findingCount);
    const mutKey = outcomeKey(trace.exerciseStatus, trace.findingCount);
    assert.notEqual(
      mutKey,
      posKey,
      `${entry.controlId} mutation must differ from positive (field=${entry.mutation.expect.mutatedField})`,
    );
  }

  assert.equal(trace.invokedEvaluateBatch9Control, true);
  assert.equal(trace.invokedBuildBatch9ExerciseReceipt, true);
  return trace;
}

/** Run all 37×4 behavioural fixtures. */
export function runAllBehaviouralFixtures(): Batch9BehaviouralHarnessReport {
  assertBehaviouralFixtureCoverage();
  const kinds: Batch9FixtureKind[] = ["positive", "negative", "unavailable", "mutation"];
  const fixtureKindsExecuted: Record<Batch9FixtureKind, number> = {
    positive: 0,
    negative: 0,
    unavailable: 0,
    mutation: 0,
  };
  const traces: Batch9FixtureExecutionTrace[] = [];
  for (const id of BATCH9_CONTROL_IDS) {
    const entry = BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.get(id)!;
    for (const kind of kinds) {
      traces.push(executeBehaviouralFixture(entry, kind));
      fixtureKindsExecuted[kind] += 1;
    }
  }
  return {
    controlCount: 37,
    fixtureKindsExecuted,
    totalExecutions: traces.length,
    traces,
  };
}

export function validateBehaviouralHarnessReport(report: Batch9BehaviouralHarnessReport): void {
  assert.equal(report.controlCount, 37);
  assert.equal(report.totalExecutions, 37 * 4);
  assert.equal(report.fixtureKindsExecuted.positive, 37);
  assert.equal(report.fixtureKindsExecuted.negative, 37);
  assert.equal(report.fixtureKindsExecuted.unavailable, 37);
  assert.equal(report.fixtureKindsExecuted.mutation, 37);
  for (const t of report.traces) {
    assert.equal(t.invokedEvaluateBatch9Control, true, `${t.controlId}/${t.kind} must invoke evaluate`);
    assert.equal(
      t.invokedBuildBatch9ExerciseReceipt,
      true,
      `${t.controlId}/${t.kind} must invoke receipt`,
    );
  }
}

/**
 * Negative self-test: a no-op fixture that never calls the evaluator must fail the harness.
 */
export function assertHarnessRejectsNoOpFixture(): void {
  const noopTrace: Batch9FixtureExecutionTrace = {
    controlId: "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
    kind: "positive",
    invokedEvaluateBatch9Control: false,
    invokedBuildBatch9ExerciseReceipt: false,
    exerciseStatus: "evaluated",
    findingCount: 0,
    findingCodes: [],
    evidenceRefs: [],
    missingInputReason: null,
  };
  let failed = false;
  try {
    validateBehaviouralHarnessReport({
      controlCount: 37,
      fixtureKindsExecuted: { positive: 37, negative: 37, unavailable: 37, mutation: 37 },
      totalExecutions: 148,
      traces: Array.from({ length: 148 }, (_, i) =>
        i === 0
          ? noopTrace
          : {
              ...noopTrace,
              invokedEvaluateBatch9Control: true,
              invokedBuildBatch9ExerciseReceipt: true,
              controlId: BATCH9_CONTROL_IDS[i % 37]!,
              kind: (["positive", "negative", "unavailable", "mutation"] as const)[i % 4]!,
            },
      ),
    });
  } catch {
    failed = true;
  }
  assert.equal(failed, true, "Harness must reject no-op fixture that skips evaluator/receipt");
}
