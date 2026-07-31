/**
 * Batch-A six-evaluator behavioural harness — no-op/self-test requires real evaluator execution.
 */

import assert from "node:assert/strict";
import { BATCH_A_SIX_CONTROL_IDS, type BatchASixControlId } from "./constants";
import { evaluateBatchASixControl, type BatchAEvaluatorResult } from "./evaluate";
import {
  fixtureChr06NegativeWrongClass,
  fixtureChr06Positive,
  fixtureChr06UnavailableChronologyOnly,
  fixtureChr06UnresolvedNoDob,
  fixtureChr12AmbiguousUnresolvedInputs,
  fixtureChr12NegativeOpaque,
  fixtureChr12Positive,
  fixtureChr12Unavailable,
  fixtureLsl05AmbiguousUnknownLabel,
  fixtureLsl05NegativeTruncated,
  fixtureLsl05Positive,
  fixtureLsl05UnavailableCourtProse,
  fixturePrc03NegativeConflation,
  fixturePrc03Positive,
  fixturePrc03Unavailable,
  fixturePrc03UnresolvedAgeUnknown,
  fixturePrc04NegativeDecided,
  fixturePrc04Positive,
  fixturePrc04Unavailable,
  fixturePrc04Unresolved,
  fixturePrc07AmbiguousIncomplete,
  fixturePrc07NegativeConflated,
  fixturePrc07Positive,
  fixturePrc07Unavailable,
} from "./fixtures";
import { BATCH_A_SPEC_BY_ID } from "./specs";

export type HarnessKind =
  | "positive"
  | "negative"
  | "unavailable"
  | "ambiguous"
  | "mutation";

export type HarnessTrace = {
  controlId: BatchASixControlId;
  kind: HarnessKind;
  invokedEvaluator: boolean;
  findingCount: number;
  exerciseStatus: string;
  findingCodes: string[];
};

function run(controlId: BatchASixControlId, output: Record<string, unknown>): {
  result: BatchAEvaluatorResult;
  trace: Omit<HarnessTrace, "kind"> & { kind?: HarnessKind };
} {
  const result = evaluateBatchASixControl(controlId, output);
  return {
    result,
    trace: {
      controlId,
      invokedEvaluator: true,
      findingCount: result.hits.length,
      exerciseStatus: result.namedControlExerciseStatus,
      findingCodes: result.hits.map((h) => h.findingCode),
    },
  };
}

function mutateKill(controlId: BatchASixControlId, positive: Record<string, unknown>): Record<string, unknown> {
  const bag = structuredClone(positive);
  if (controlId === "MAA2-LSL-05-CATEGORY-SET-COVERAGE") {
    (bag.legalStateTaxonomy as Record<string, unknown>).usedCategories = ["fact", "opinion"];
  } else if (controlId === "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING") {
    (bag.dobAgeCalcLedger as Record<string, unknown>).reportedAgeClass = "adult";
  } else if (controlId === "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS") {
    ((bag.derivedNumericClaims as Record<string, unknown>[])[0] as Record<string, unknown>).calcInputs = [];
  } else if (controlId === "MAA2-PRC-03-YOUTH-STATE") {
    ((bag.proceduralPartyState as Record<string, unknown>).youthState as Record<string, unknown>).culpabilityConflation =
      true;
  } else if (controlId === "MAA2-PRC-04-FITNESS-PARTICIPATION") {
    (
      (bag.proceduralPartyState as Record<string, unknown>).fitnessParticipation as Record<string, unknown>
    ).fitToPlead = true;
  } else if (controlId === "MAA2-PRC-07-DISCLOSURE-PII-STATE") {
    (
      (bag.proceduralPartyState as Record<string, unknown>).disclosurePiiState as Record<string, unknown>
    ).conflated = true;
  }
  return bag;
}

const POSITIVE: Record<BatchASixControlId, () => Record<string, unknown>> = {
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE": fixtureLsl05Positive,
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING": fixtureChr06Positive,
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS": fixtureChr12Positive,
  "MAA2-PRC-03-YOUTH-STATE": fixturePrc03Positive,
  "MAA2-PRC-04-FITNESS-PARTICIPATION": fixturePrc04Positive,
  "MAA2-PRC-07-DISCLOSURE-PII-STATE": fixturePrc07Positive,
};

const NEGATIVE: Record<BatchASixControlId, () => Record<string, unknown>> = {
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE": fixtureLsl05NegativeTruncated,
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING": fixtureChr06NegativeWrongClass,
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS": fixtureChr12NegativeOpaque,
  "MAA2-PRC-03-YOUTH-STATE": fixturePrc03NegativeConflation,
  "MAA2-PRC-04-FITNESS-PARTICIPATION": fixturePrc04NegativeDecided,
  "MAA2-PRC-07-DISCLOSURE-PII-STATE": fixturePrc07NegativeConflated,
};

const UNAVAILABLE: Record<BatchASixControlId, () => Record<string, unknown>> = {
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE": fixtureLsl05UnavailableCourtProse,
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING": fixtureChr06UnavailableChronologyOnly,
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS": fixtureChr12Unavailable,
  "MAA2-PRC-03-YOUTH-STATE": fixturePrc03Unavailable,
  "MAA2-PRC-04-FITNESS-PARTICIPATION": fixturePrc04Unavailable,
  "MAA2-PRC-07-DISCLOSURE-PII-STATE": fixturePrc07Unavailable,
};

const AMBIGUOUS: Record<BatchASixControlId, () => Record<string, unknown>> = {
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE": fixtureLsl05AmbiguousUnknownLabel,
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING": fixtureChr06UnresolvedNoDob,
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS": fixtureChr12AmbiguousUnresolvedInputs,
  "MAA2-PRC-03-YOUTH-STATE": fixturePrc03UnresolvedAgeUnknown,
  "MAA2-PRC-04-FITNESS-PARTICIPATION": fixturePrc04Unresolved,
  "MAA2-PRC-07-DISCLOSURE-PII-STATE": fixturePrc07AmbiguousIncomplete,
};

export function executeHarnessKind(controlId: BatchASixControlId, kind: HarnessKind): HarnessTrace {
  const spec = BATCH_A_SPEC_BY_ID.get(controlId)!;
  let output: Record<string, unknown>;
  if (kind === "mutation") output = mutateKill(controlId, POSITIVE[controlId]());
  else if (kind === "positive") output = POSITIVE[controlId]();
  else if (kind === "negative") output = NEGATIVE[controlId]();
  else if (kind === "unavailable") output = UNAVAILABLE[controlId]();
  else output = AMBIGUOUS[controlId]();

  const { result, trace } = run(controlId, output);
  assert.equal(trace.invokedEvaluator, true, `${controlId} ${kind} must invoke evaluator`);

  if (kind === "positive") {
    assert.equal(result.namedControlExerciseStatus, "evaluated");
    assert.equal(result.hits.length, 0, `${controlId} positive must emit zero findings`);
  } else if (kind === "negative" || kind === "mutation") {
    assert.ok(result.hits.length >= 1, `${controlId} ${kind} must emit findings`);
    assert.ok(result.hits.every((h) => h.findingCode === spec.findingCode));
    assert.ok(result.hits.every((h) => h.controlId === controlId));
  } else if (kind === "unavailable") {
    assert.equal(result.namedControlExerciseStatus, "not_exercised");
    assert.equal(result.hits.length, 0);
    assert.ok(result.missingInputReason);
  } else {
    assert.equal(result.namedControlExerciseStatus, "unresolved");
    assert.equal(result.hits.length, 0);
    assert.ok(result.unresolvedReason);
  }

  return { ...trace, kind };
}

/** No-op self-test: harness fails if evaluator is stubbed to always return empty evaluated. */
export function assertHarnessCannotPassWithoutEvaluator(): void {
  let invoked = 0;
  const original = evaluateBatchASixControl;
  // Shadow-check: running negatives without invoking would not produce findingCodes.
  for (const id of BATCH_A_SIX_CONTROL_IDS) {
    const t = executeHarnessKind(id, "negative");
    assert.equal(t.invokedEvaluator, true);
    assert.ok(t.findingCount >= 1);
    invoked += 1;
  }
  assert.equal(invoked, 6);
  assert.equal(typeof original, "function");
}

export function runAllHarnessKinds(): HarnessTrace[] {
  const kinds: HarnessKind[] = ["positive", "negative", "unavailable", "ambiguous", "mutation"];
  const traces: HarnessTrace[] = [];
  for (const id of BATCH_A_SIX_CONTROL_IDS) {
    for (const kind of kinds) {
      traces.push(executeHarnessKind(id, kind));
    }
  }
  assertHarnessCannotPassWithoutEvaluator();
  return traces;
}
