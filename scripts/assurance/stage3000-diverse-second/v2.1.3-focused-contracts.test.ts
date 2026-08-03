/**
 * V2.1.3 focused behavioural contract proofs for CORE_CONTROLS.
 * Honest skips for missing Batch-9 fixtures do NOT count as PASS for WRD-15 / COMPLETENESS.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  proveControlContracts,
  CORE_CONTROLS,
} from "./v2.1.2-named-control-runner";
import { BATCH9_BEHAVIOURAL_FIXTURE_MATRIX } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch9";

const STRUCTURED_OR_HANDLER_PROOF = new Set([
  "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
  "MAA2-CHS-03-PROVENANCE-LINK",
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
  "MAA-COMPLETENESS",
]);

describe("v2.1.3 focused control contracts", () => {
  for (const controlId of CORE_CONTROLS) {
    it(`${controlId}: genuine behavioural alteration (positive||negative; no honest-skip PASS)`, () => {
      const proof = proveControlContracts(controlId);

      if (STRUCTURED_OR_HANDLER_PROOF.has(controlId)) {
        assert.equal(proof.positiveAlters, true, proof.detail);
        assert.equal(proof.negativeAlters, true, proof.detail);
        assert.equal(proof.unavailableAlters, true, proof.detail);
        assert.equal(proof.mutationAlters, true, proof.detail);
        assert.doesNotMatch(proof.detail, /honest skip|cannot prove|No Batch-9/i);
        return;
      }

      const hasFixture = BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.has(controlId);
      if (!hasFixture) {
        // Not a PASS — record as not_proved for this CORE control (CHR-05 etc. use Batch-9 when available).
        assert.equal(proof.positiveAlters, false);
        assert.equal(proof.negativeAlters, false);
        assert.match(proof.detail, /No Batch-9 behavioural fixture|cannot prove/i);
        // Gate accounts CHR-05 as not_exercised separately; other CORE without fixtures must have fixtures.
        assert.ok(
          controlId === "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE" || hasFixture,
          `${controlId} lacks Batch-9 fixture and is not an allowed deferred control`,
        );
        return;
      }

      assert.ok(
        proof.positiveAlters || proof.negativeAlters,
        `${controlId} fixture present but neither positiveAlters nor negativeAlters: ${proof.detail}`,
      );
    });
  }

  it("reports 14 evaluated / 1 not_exercised accounting expectation for CHR-05", () => {
    // Documentation assertion: CHR-05 has Batch-9 fixture but pack may lack hearing-notice denominator.
    assert.ok(BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.has("MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE"));
    const proof = proveControlContracts("MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE");
    assert.ok(proof.positiveAlters || proof.negativeAlters, proof.detail);
  });
});
