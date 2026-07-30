/**
 * Batch-9 disposition — two-axis classification + empty promotion registry.
 */

import type { Batch8AdapterId } from "../batch8/schemas";
import {
  BATCH9_CONTROL_SPECS,
  summarizeExecutionAvailability,
  summarizeImplementationClasses,
} from "./control-specs";
import {
  countsAsNamedEvaluator,
  type Batch9ControlDisposition,
  type Batch9EvaluatorImplementationClass,
  type Batch9ExecutionAvailability,
} from "./schemas";

export const BATCH9_IMMUTABLE_PROMOTION_REGISTRY: readonly [] = [];

export const BATCH9_IMPLEMENTED_IDS: ReadonlySet<string> = new Set(
  BATCH9_IMMUTABLE_PROMOTION_REGISTRY as readonly string[],
);

export type Batch9ScanAggregate = {
  byControl: Record<
    string,
    {
      applicableCaseCount: number;
      notExercisedCaseCount: number;
      evaluatedCaseCount: number;
      unresolvedCaseCount: number;
      candidateOccurrenceCount: number;
      candidateCaseIds: string[];
      findingCodes: string[];
    }
  >;
};

export function buildBatch9Dispositions(scan: Batch9ScanAggregate): Batch9ControlDisposition[] {
  return BATCH9_CONTROL_SPECS.map((spec) => {
    const row = scan.byControl[spec.controlId] ?? {
      applicableCaseCount: 0,
      notExercisedCaseCount: 0,
      evaluatedCaseCount: 0,
      unresolvedCaseCount: 0,
      candidateOccurrenceCount: 0,
      candidateCaseIds: [],
      findingCodes: [],
    };
    const named = countsAsNamedEvaluator(spec.evaluatorImplementationClass);
    const promoted = BATCH9_IMPLEMENTED_IDS.has(spec.controlId);
    const blockParts = [
      "Immutable Batch-9 promotion registry empty",
      named
        ? row.candidateOccurrenceCount === 0
          ? "Zero candidates — FP/FN rates unavailable (not 0/0)"
          : "Candidates frozen but triage/promotion bar not cleared"
        : `evaluatorImplementationClass=${spec.evaluatorImplementationClass} does not count as named evaluator for promotion`,
      `executionAvailability=${spec.executionAvailability}`,
      row.applicableCaseCount === 0
        ? `No applicable cases — ${spec.missingInputReason}`
        : "Promotion still requires complete structured inputs + FN clearance",
    ];
    return {
      controlId: spec.controlId,
      adapterId: spec.adapterId as Batch8AdapterId,
      evaluatorImplementationClass: spec.evaluatorImplementationClass,
      executionAvailability: spec.executionAvailability,
      evaluatorClass: spec.evaluatorImplementationClass,
      countsAsNamedEvaluator: named,
      beforeStatus: "partially_implemented",
      afterStatus: promoted ? "implemented" : "partially_implemented",
      promoted: promoted ? true : false,
      promotionBlockedReason: promoted ? "" : blockParts.join("; "),
      missingAdapterOrInput: spec.missingInputReason,
      applicableCaseCount499: row.applicableCaseCount,
      notExercisedCaseCount499: row.notExercisedCaseCount,
      evaluatedCaseCount499: row.evaluatedCaseCount,
      unresolvedCaseCount499: row.unresolvedCaseCount,
      candidateOccurrenceCount: row.candidateOccurrenceCount,
      candidateStringCount: row.candidateOccurrenceCount,
      candidateTemplateCount: 0,
      candidateCaseCount: row.candidateCaseIds.length,
      fpDisposition:
        row.candidateOccurrenceCount === 0
          ? "No candidates — FP rate unavailable (not 0/0)"
          : "Candidates frozen; FP not auto-cleared",
      fnDisposition:
        row.applicableCaseCount === 0
          ? "No applicable cases — FN rate unavailable (not 0/0)"
          : "FN triage deferred",
      unresolvedDisposition:
        row.unresolvedCaseCount > 0
          ? `${row.unresolvedCaseCount} unresolved exercise cases — blocks promotion`
          : "No unresolved exercise status on applicable cases (or none applicable)",
    };
  });
}

export function buildEvaluatorClassSummary(): {
  byImplementationClass: Record<Batch9EvaluatorImplementationClass, number>;
  byExecutionAvailability: Record<Batch9ExecutionAvailability, number>;
  substantiveEvaluatorCount: number;
  adapterIntegrityCount: number;
  stubOrProxyCount: number;
  namedEvaluatorCount: number;
  esaRunnableCount: number;
  esaUnavailableCount: number;
} {
  const byImplementationClass = summarizeImplementationClasses();
  const byExecutionAvailability = summarizeExecutionAvailability();
  return {
    byImplementationClass,
    byExecutionAvailability,
    substantiveEvaluatorCount: byImplementationClass.substantive_control_evaluator,
    adapterIntegrityCount: byImplementationClass.adapter_integrity_evaluator,
    stubOrProxyCount:
      byImplementationClass.foundation_stub + byImplementationClass.family_proxy_only,
    namedEvaluatorCount:
      byImplementationClass.substantive_control_evaluator +
      byImplementationClass.adapter_integrity_evaluator,
    esaRunnableCount: byExecutionAvailability.runnable_on_ESA,
    esaUnavailableCount:
      byExecutionAvailability.unavailable_missing_adapter +
      byExecutionAvailability.unavailable_missing_structured_field +
      byExecutionAvailability.unavailable_missing_real_exit +
      byExecutionAvailability.not_applicable,
  };
}

export function buildStructuredRematerialisationGapRegister(): Array<{
  adapterId: Batch8AdapterId;
  gap: string;
  blocksControls: string[];
  esaObservation: string;
}> {
  return [
    {
      adapterId: "charge_instruments",
      gap: "No chargeInstruments[] / statementClassification / legalStateRole / chargeWarningAttached coupling",
      blocksControls: BATCH9_CONTROL_SPECS.filter((s) => s.adapterId === "charge_instruments").map(
        (s) => s.controlId,
      ),
      esaObservation: "unavailable×499",
    },
    {
      adapterId: "evidence_units",
      gap: "evidenceUnitId / person IDs / extract-full / draft-final incomplete",
      blocksControls: BATCH9_CONTROL_SPECS.filter((s) => s.adapterId === "evidence_units").map(
        (s) => s.controlId,
      ),
      esaObservation: "partial×499",
    },
    {
      adapterId: "chronology_events",
      gap: "No chronologyEvents[] typed clocks",
      blocksControls: BATCH9_CONTROL_SPECS.filter((s) => s.adapterId === "chronology_events").map(
        (s) => s.controlId,
      ),
      esaObservation: "unavailable×499",
    },
    {
      adapterId: "provenance",
      gap: "Genuine page identity / quotation / totals ledgers absent",
      blocksControls: BATCH9_CONTROL_SPECS.filter((s) => s.adapterId === "provenance").map(
        (s) => s.controlId,
      ),
      esaObservation: "partial×499",
    },
    {
      adapterId: "chase_relationships",
      gap: "Complete chase requestId+explicit id+resolutionState incomplete",
      blocksControls: BATCH9_CONTROL_SPECS.filter((s) => s.adapterId === "chase_relationships").map(
        (s) => s.controlId,
      ),
      esaObservation: "partial×499",
    },
  ];
}

export function buildRealExitCaptureGapRegister(): Array<{
  exitId: string;
  gap: string;
  blocksControls: string[];
  note: string;
}> {
  const blocked = BATCH9_CONTROL_SPECS.filter(
    (s) =>
      s.adapterId === "exit_snapshots" && s.controlId !== "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
  ).map((s) => s.controlId);
  return [
    "view",
    "copy",
    "export",
    "api",
    "pdf",
    "composed_prose",
    "authenticated_browser",
  ].map((exitId) => ({
    exitId,
    gap: `No /exitPayloadReceipts/${exitId}/payloadIdentity (+ coupled warning/quarantine fields)`,
    blocksControls: blocked,
    note: "XEX-08 adapter-integrity may evaluate without implying real exit testing.",
  }));
}
