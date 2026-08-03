/**
 * V2.1.4.1 focused contracts — exact provenance, COMPLETENESS 4-axis, copy/PDF exit honesty.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { proveControlContracts, CORE_CONTROLS } from "./v2.1.2-named-control-runner";
import {
  proveProvenanceClassifierContracts,
  proveExactProvenanceAdversarialContracts,
} from "./v2.1.4-provenance-leaf-classifier";
import { BATCH9_BEHAVIOURAL_FIXTURE_MATRIX } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch9";

describe("v2.1.4.1 provenance-bound leaf classifier contracts", () => {
  it("positive/negative/unavailable/mutation alter classification", () => {
    const proof = proveProvenanceClassifierContracts();
    assert.equal(proof.positiveAlters, true, proof.detail);
    assert.equal(proof.negativeAlters, true, proof.detail);
    assert.equal(proof.unavailableAlters, true, proof.detail);
    assert.equal(proof.mutationAlters, true, proof.detail);
  });

  it("adversarial exact provenance binding", () => {
    const a = proveExactProvenanceAdversarialContracts();
    assert.equal(a.mg5NotWrittenCharge, true, a.detail);
    assert.equal(a.mg6NotIndictment, true, a.detail);
    assert.equal(a.labelLengthNotWildcard, true, a.detail);
    assert.equal(a.removingExactDocChangesResult, true, a.detail);
    assert.equal(a.mixedClaimsRequireAllRefs, true, a.detail);
  });
});

describe("v2.1.4.1 COMPLETENESS four behavioural axes", () => {
  it("all four axes true", () => {
    const proof = proveControlContracts("MAA-COMPLETENESS");
    assert.equal(proof.positiveAlters, true, proof.detail);
    assert.equal(proof.negativeAlters, true, proof.detail);
    assert.equal(proof.unavailableAlters, true, proof.detail);
    assert.equal(proof.mutationAlters, true, proof.detail);
  });
});

describe("v2.1.4.1 CORE control behavioural contracts still hold", () => {
  for (const controlId of CORE_CONTROLS) {
    it(`${controlId}`, () => {
      const proof = proveControlContracts(controlId);
      if (
        controlId === "MAA2-ATR-02-DOCUMENT-OWNERSHIP" ||
        controlId === "MAA2-CHS-03-PROVENANCE-LINK" ||
        controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF" ||
        controlId === "MAA-COMPLETENESS"
      ) {
        assert.equal(proof.positiveAlters, true, proof.detail);
        assert.equal(proof.negativeAlters, true, proof.detail);
        assert.equal(proof.unavailableAlters, true, proof.detail);
        assert.equal(proof.mutationAlters, true, proof.detail);
        return;
      }
      if (!BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.has(controlId)) {
        // Honest: no fixture → cannot claim behavioural pass axes
        assert.equal(proof.positiveAlters, false);
        return;
      }
      assert.ok(proof.positiveAlters || proof.negativeAlters, proof.detail);
    });
  }
});
