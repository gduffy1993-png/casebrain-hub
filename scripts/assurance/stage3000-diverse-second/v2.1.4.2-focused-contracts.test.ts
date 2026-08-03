/**
 * V2.1.4.2 focused contracts — wording boundary, derived-conclusion mutations, CORE axes.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { proveControlContracts, CORE_CONTROLS } from "./v2.1.2-named-control-runner";
import {
  proveProvenanceClassifierContracts,
  proveExactProvenanceAdversarialContracts,
} from "./v2.1.4-provenance-leaf-classifier";
import {
  scanVisibleLanguageBoundary,
  proveDerivedConclusionMutationContracts,
  polishSolicitorVisibleText,
} from "./v2.1.4.2-solicitor-visible-wording";
import { BATCH9_BEHAVIOURAL_FIXTURE_MATRIX } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch9";

describe("v2.1.4.2 visible language boundary scanner", () => {
  it("rejects snake_case, duplicate Regarding, audit metadata, matter family", () => {
    assert.equal(scanVisibleLanguageBoundary("Please provide the complete master media.").ok, true);
    assert.equal(scanVisibleLanguageBoundary("referred_missing_master").ok, false);
    assert.equal(
      scanVisibleLanguageBoundary("Regarding theft: Regarding theft: Please provide X.").ok,
      false,
    );
    assert.equal(scanVisibleLanguageBoundary("keep request identifiers in audit metadata").ok, false);
    assert.equal(scanVisibleLanguageBoundary("Matter family common assault battery: x").ok, false);
  });

  it("polishes duplicate Regarding prefixes", () => {
    const out = polishSolicitorVisibleText(
      "Regarding common assault battery: Regarding common assault battery: Please provide the complete master media referred to in the disclosure material.",
    );
    assert.equal((out.match(/Regarding/gi) || []).length <= 1, true);
    assert.equal(/referred_missing_master|matter family|audit metadata/i.test(out), false);
  });
});

describe("v2.1.4.2 derived-conclusion mutation contracts", () => {
  it("removing each supporting fact alters the conclusion", () => {
    const p = proveDerivedConclusionMutationContracts();
    assert.equal(p.positiveAlters, true, p.detail);
    assert.equal(p.negativeAlters, true, p.detail);
    assert.equal(p.unavailableAlters, true, p.detail);
    assert.equal(p.mutationAlters, true, p.detail);
    assert.equal(p.perFactRemovalAlters, true, p.detail);
  });
});

describe("v2.1.4.2 provenance + CORE contracts still hold", () => {
  it("exact provenance adversarial", () => {
    const a = proveExactProvenanceAdversarialContracts();
    assert.equal(a.mg5NotWrittenCharge, true, a.detail);
    assert.equal(a.labelLengthNotWildcard, true, a.detail);
    assert.equal(a.mixedClaimsRequireAllRefs, true, a.detail);
  });
  it("provenance classifier four axes", () => {
    const p = proveProvenanceClassifierContracts();
    assert.equal(p.positiveAlters && p.negativeAlters && p.unavailableAlters && p.mutationAlters, true, p.detail);
  });
  for (const controlId of CORE_CONTROLS) {
    it(`${controlId}`, () => {
      const proof = proveControlContracts(controlId);
      if (
        controlId === "MAA2-ATR-02-DOCUMENT-OWNERSHIP" ||
        controlId === "MAA2-CHS-03-PROVENANCE-LINK" ||
        controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF" ||
        controlId === "MAA-COMPLETENESS"
      ) {
        assert.equal(proof.positiveAlters && proof.negativeAlters && proof.unavailableAlters && proof.mutationAlters, true, proof.detail);
        return;
      }
      if (!BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.has(controlId)) {
        assert.equal(proof.positiveAlters, false);
        return;
      }
      assert.ok(proof.positiveAlters || proof.negativeAlters, proof.detail);
    });
  }
});
