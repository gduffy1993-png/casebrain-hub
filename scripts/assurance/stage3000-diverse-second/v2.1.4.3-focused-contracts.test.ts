/**
 * V2.1.4.3 focused contracts — professional semantic quality + CORE axes.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { proveControlContracts, CORE_CONTROLS } from "./v2.1.2-named-control-runner";
import {
  proveProvenanceClassifierContracts,
  proveExactProvenanceAdversarialContracts,
} from "./v2.1.4-provenance-leaf-classifier";
import {
  proveProfessionalSemanticContracts,
  proveDerivedConclusionMutationContracts,
  scanProfessionalSemanticQuality,
} from "./v2.1.4.3-professional-semantic-wording";
import { BATCH9_BEHAVIOURAL_FIXTURE_MATRIX } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch9";

describe("v2.1.4.3 professional semantic contracts", () => {
  it("rejects all listed defective examples", () => {
    const p = proveProfessionalSemanticContracts();
    assert.equal(p.markdownHeadingFails, true, p.detail);
    assert.equal(p.lowercaseAcronymFails, true, p.detail);
    assert.equal(p.rawPetFails, true, p.detail);
    assert.equal(p.rawAbsenceFails, true, p.detail);
    assert.equal(p.ambiguousSectionFails, true, p.detail);
    assert.equal(p.brokenJoinFails, true, p.detail);
    assert.equal(p.clunkyDefenceFails, true, p.detail);
    assert.equal(p.incompleteChargeFails, true, p.detail);
    assert.equal(p.vagueDisclosureFails, true, p.detail);
    assert.equal(p.chargeExtractRejectsHeading, true, p.detail);
    assert.equal(p.petMapsProfessionally, true, p.detail);
    assert.equal(p.section45DoesNotOverstate, true, p.detail);
  });

  it("clean professional wording passes", () => {
    assert.equal(
      scanProfessionalSemanticQuality(
        "Please provide the complete master recording or media referred to in the disclosure material but not supplied.",
      ).ok,
      true,
    );
  });

  it("derived conclusion per-fact removal", () => {
    const p = proveDerivedConclusionMutationContracts();
    assert.equal(p.perFactRemovalAlters, true, p.detail);
  });
});

describe("v2.1.4.3 provenance + CORE still hold", () => {
  it("adversarial provenance", () => {
    const a = proveExactProvenanceAdversarialContracts();
    assert.equal(a.mg5NotWrittenCharge, true, a.detail);
    assert.equal(a.mixedClaimsRequireAllRefs, true, a.detail);
  });
  it("provenance four axes", () => {
    const p = proveProvenanceClassifierContracts();
    assert.equal(
      p.positiveAlters && p.negativeAlters && p.unavailableAlters && p.mutationAlters,
      true,
      p.detail,
    );
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
        assert.equal(
          proof.positiveAlters &&
            proof.negativeAlters &&
            proof.unavailableAlters &&
            proof.mutationAlters,
          true,
          proof.detail,
        );
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
