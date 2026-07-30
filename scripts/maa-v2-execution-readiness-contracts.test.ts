/**
 * MAA V2 execution-readiness contracts (no Stage 150 execution).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MASTER_CONTROL_REGISTRY } from "../lib/eval/master-assurance-auditor/control-registry";
import {
  buildStageActivationMatrix,
  buildV2RegistryDocument,
  validateV2Registry,
} from "../lib/eval/master-assurance-auditor/v2/assemble";
import { collectExecutionReadinessBundle } from "../lib/eval/master-assurance-auditor/v2/execution-readiness";

describe("MAA V2 execution-readiness — preservation & honesty", () => {
  it("accounts for all controls and preserves 24 V1 IDs/lanes/versions", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.controls.length, bundle.status.totalControls);
    assert.ok(bundle.controls.length >= 347);
    assert.equal(bundle.registry.historicalStage20ControlCount, 24);
    for (const c of MASTER_CONTROL_REGISTRY) {
      const row = bundle.controls.find((x) => x.controlId === c.id && x.preservedFromV1);
      assert.ok(row, c.id);
      assert.equal(row!.version, "1.0.0");
      assert.equal(row!.laneId, c.laneId);
      assert.deepEqual(row!.historicalActivationStages, ["20", "50"]);
      assert.equal(row!.currentActivationStage, "50");
      assert.equal(row!.implementationStatus, "implemented");
      assert.ok(row!.detectorEntrypoint);
      assert.ok(row!.receiptValidator);
      assert.ok(row!.positiveNegativeContract);
      assert.equal(row!.currentlyRunnable, true);
    }
  });

  it("never marks registry-only MAA2 controls implemented", () => {
    const bundle = collectExecutionReadinessBundle();
    for (const c of bundle.controls.filter((x) => !x.preservedFromV1)) {
      assert.notEqual(c.implementationStatus, "implemented", c.controlId);
      assert.equal(c.currentlyRunnable, false, c.controlId);
      assert.equal(c.detectorEntrypoint, null, c.controlId);
      assert.ok(c.unavailableReason, c.controlId);
    }
  });

  it("Stage 20 historical correction records 24 exercised controls", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.stage20.correction.historicalStage20ControlCount, 24);
    assert.equal(bundle.stage20.correction.historicalStage20ControlIds.length, 24);
    assert.equal(bundle.stage20.correction.previousRunEvidenceRewritten, false);
    const matrix = buildStageActivationMatrix(bundle.controls);
    assert.equal(matrix.historicalExecution.stage20.controlCount, 24);
    assert.equal(matrix.historicalExecution.stage20.historicalStage20ControlCount, 24);
  });
});

describe("MAA V2 execution-readiness — Stage 150 maps & gate", () => {
  it("maps every Stage-150 control with explicit execution status", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.detectorMap.stage150ControlCount, bundle.detectorMap.rows.length);
    assert.ok(bundle.detectorMap.stage150ControlCount > 100);
    for (const row of bundle.detectorMap.rows) {
      assert.ok(row.controlId);
      assert.ok(row.implementationStatus);
      assert.equal(row.expectedVerdictWhenPrerequisitesAbsent, "not_exercised");
      assert.equal(row.runnableOnCurrentEsaCorpus, false);
      assert.equal(row.schemaRegistryValidatorIsNotSubstantiveDetector, true);
    }
    assert.equal(bundle.detectorMap.implementedSubstantiveDetectorCount, 0);
  });

  it("classifies Stage-150 exerciseability with exact counts summing to stage150", () => {
    const bundle = collectExecutionReadinessBundle();
    const sum = Object.values(bundle.exerciseability.counts).reduce((a, b) => a + b, 0);
    assert.equal(sum, bundle.exerciseability.stage150ControlCount);
    assert.equal(bundle.exerciseability.counts.fully_exercisable, 0);
  });

  it("denominators are pending approval and never pass on insufficient", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.denominators.pendingApprovalCount, bundle.denominators.rows.length);
    for (const row of bundle.denominators.rows) {
      assert.equal(row.minimumEligibleCases, "PENDING_APPROVAL");
      assert.equal(row.insufficientDenominatorOutcome, "not_exercised");
      assert.equal(row.neverPassOnInsufficientDenominator, true);
      assert.equal(row.blockedUntilApproval, true);
    }
  });

  it("relationship audit has zero unresolved classifications", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.relationships.unresolvedRelationshipClassification, 0);
    assert.equal(bundle.relationships.zeroUnresolvedSatisfied, true);
    for (const c of bundle.controls) {
      assert.ok(c.relationships.length > 0, c.controlId);
    }
  });

  it("readiness gate blocks Stage-150 sample selection and execution", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.gate.stage150SampleSelectionAllowed, false);
    assert.equal(bundle.gate.stage150ExecutionAllowed, false);
    assert.equal(bundle.gate.overallAllowed, false);
    assert.equal(bundle.gate.stage150SampleFrozen, false);
    assert.equal(bundle.gate.stage150ControlsRun, false);
    assert.ok(bundle.gate.blockingReasons.length > 0);
  });
});

describe("MAA V2 execution-readiness — ESA audit & registry validate", () => {
  it("audits ESA population without running assurance controls", () => {
    const bundle = collectExecutionReadinessBundle();
    assert.equal(bundle.esa.assuranceControlsExecuted, false);
    assert.equal(bundle.esa.stage150Run, false);
    assert.equal(bundle.esa.denominators.populationUniqueValid, 499);
    assert.equal(bundle.esa.denominators.uniqueValidMatchesExpected, true);
    const exportField = bundle.esa.fields.find((f) => f.field === "exit_export");
    assert.ok(exportField);
    assert.equal(exportField!.occurrenceCount, 0);
    assert.equal(exportField!.invented, false);
  });

  it("updated registry validates", () => {
    const doc = buildV2RegistryDocument();
    assert.deepEqual(validateV2Registry(doc), []);
    assert.equal(doc.registryVersion, "2.2.0");
  });
});
