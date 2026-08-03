/**
 * V2.1.2 focused behavioural contract proofs for CORE_CONTROLS.
 * Prefer node:test (same pattern as scripts/maa-v2-every-word-foundation-contracts.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  proveControlContracts,
  CORE_CONTROLS,
} from "./v2.1.2-named-control-runner";
import { BATCH9_BEHAVIOURAL_FIXTURE_MATRIX } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch9";

const STRUCTURED_NAMED = [
  "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
  "MAA2-CHS-03-PROVENANCE-LINK",
] as const;

describe("v2.1.2 focused control contracts", () => {
  for (const controlId of CORE_CONTROLS) {
    if (STRUCTURED_NAMED.includes(controlId as (typeof STRUCTURED_NAMED)[number])) {
      continue;
    }

    it(`Batch-9 / fixture control ${controlId}: positiveAlters || negativeAlters (or skip)`, () => {
      const hasFixture = BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.has(controlId);
      const proof = proveControlContracts(controlId);

      if (!hasFixture) {
        // Honest skip: no Batch-9 behavioural fixture for this CORE control
        // (e.g. MAA2-WRD-15 / MAA-COMPLETENESS — not Batch-9 fixture-backed).
        assert.equal(proof.positiveAlters, false);
        assert.equal(proof.negativeAlters, false);
        assert.match(proof.detail, /No Batch-9 behavioural fixture|cannot prove/i);
        return;
      }

      assert.ok(
        proof.positiveAlters || proof.negativeAlters,
        `${controlId} fixture present but neither positiveAlters nor negativeAlters: ${proof.detail}`,
      );
    });
  }

  for (const controlId of STRUCTURED_NAMED) {
    it(`${controlId}: structured evaluator proves positive/negative/unavailable/mutation alteration`, () => {
      const proof = proveControlContracts(controlId);
      assert.equal(proof.positiveAlters, true, proof.detail);
      assert.equal(proof.negativeAlters, true, proof.detail);
      assert.equal(proof.unavailableAlters, true, proof.detail);
      assert.equal(proof.mutationAlters, true, proof.detail);
      assert.match(proof.detail, /structured proof/i);
    });
  }
});
