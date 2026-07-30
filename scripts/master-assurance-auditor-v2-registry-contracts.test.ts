/**
 * Master Assurance Auditor V2 — registry/schema validation contracts.
 * Does not run Stage 150. Does not mutate V1 frozen artefacts.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALL_LANE_IDS, MASTER_CONTROL_REGISTRY } from "../lib/eval/master-assurance-auditor/control-registry";
import {
  buildEvidenceRequirements,
  buildStageActivationMatrix,
  buildV1ToV2Migration,
  buildV2RegistryDocument,
  validateV2Registry,
} from "../lib/eval/master-assurance-auditor/v2/assemble";
import {
  MAA_V2_ALLOWED_VERDICTS,
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_INVARIANTS,
} from "../lib/eval/master-assurance-auditor/v2/schema";

describe("MAA V2 registry — preservation", () => {
  it("preserves exactly 24 V1 controls and lanes", () => {
    const doc = buildV2RegistryDocument();
    assert.equal(MASTER_CONTROL_REGISTRY.length, 24);
    assert.equal(ALL_LANE_IDS.length, 24);
    assert.equal(doc.preservedV1ControlIds.length, 24);
    assert.equal(doc.preservedV1LaneIds.length, 24);
    for (const c of MASTER_CONTROL_REGISTRY) {
      assert.ok(doc.preservedV1ControlIds.includes(c.id), c.id);
      assert.ok(doc.preservedV1LaneIds.includes(c.laneId), c.laneId);
      const env = doc.controls.find((x) => x.controlId === c.id && x.preservedFromV1);
      assert.ok(env, `envelope for ${c.id}`);
      assert.equal(env!.version, "1.0.0");
      assert.equal(env!.v1ControlId, c.id);
      assert.equal(env!.laneId, c.laneId);
    }
  });

  it("keeps historical V1 IDs interpretable and does not rename lanes", () => {
    const doc = buildV2RegistryDocument();
    for (const id of doc.preservedV1ControlIds) {
      assert.match(id, /^MAA-/);
      assert.ok(!id.startsWith("MAA2-"));
    }
    for (const lane of doc.preservedV1LaneIds) {
      assert.match(lane, /^LANE-\d{2}-/);
    }
  });
});

describe("MAA V2 registry — schema and invariants", () => {
  it("validates with zero issues", () => {
    const doc = buildV2RegistryDocument();
    const issues = validateV2Registry(doc);
    assert.deepEqual(issues, []);
  });

  it("forbids programme PASS and Stage 150 start flags", () => {
    const doc = buildV2RegistryDocument();
    assert.equal(doc.programmePassSupported, false);
    assert.equal(doc.stage150Started, false);
    assert.equal(doc.baselineCommit, MAA_V2_BASELINE_COMMIT);
    assert.ok(MAA_V2_INVARIANTS.length >= 8);
  });

  it("every control allows only the five verdicts and anti-pass rules", () => {
    const doc = buildV2RegistryDocument();
    for (const c of doc.controls) {
      assert.deepEqual([...c.allowedVerdicts].sort(), [...MAA_V2_ALLOWED_VERDICTS].sort());
      const rules = c.verdictRules.toLowerCase();
      assert.ok(
        rules.includes("never pass") || rules.includes("not_exercised"),
        c.controlId,
      );
      assert.ok(c.exactEvidenceRequired.length > 0, c.controlId);
      assert.ok(c.minimumDenominator.length > 0, c.controlId);
      assert.ok(c.authority.length > 0, c.controlId);
      assert.ok(c.version.length > 0, c.controlId);
      assert.ok(c.effectiveDate.length > 0, c.controlId);
      assert.ok(c.receiptSchema.length > 0, c.controlId);
    }
  });

  it("assigns unique control IDs and includes additive MAA2 families", () => {
    const doc = buildV2RegistryDocument();
    const ids = doc.controls.map((c) => c.controlId);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(doc.controls.length > 24);
    const additive = doc.controls.filter((c) => !c.preservedFromV1);
    assert.ok(additive.every((c) => c.controlId.startsWith("MAA2-")));
    assert.ok(doc.familyIndex.some((f) => f.familyCode === "SRC"));
    assert.ok(doc.familyIndex.some((f) => f.familyCode === "EXT"));
  });

  it("declares relationships for overlapping V1 refinements", () => {
    const doc = buildV2RegistryDocument();
    const refining = doc.controls.filter((c) =>
      c.relationships.some((r) => r.relationship === "refines" || r.relationship === "extends"),
    );
    assert.ok(refining.length > 10);
    for (const c of refining) {
      for (const r of c.relationships) {
        if (r.relationship === "independent" || r.relatedControlId == null) continue;
        assert.ok(r.relatedControlId.length > 0);
        assert.ok(r.note.length > 0);
      }
    }
  });
});

describe("MAA V2 registry — derived artefacts", () => {
  it("builds stage activation matrix without starting Stage 150", () => {
    const matrix = buildStageActivationMatrix();
    assert.equal(matrix.stage150Started, false);
    assert.equal(matrix.historicalExecution.stage20.historicalStage20ControlCount, 24);
    const stage150 = matrix.futureActivation.find((s) => s.stage === "150");
    assert.ok(stage150);
    assert.ok(stage150!.controlCount > 0);
    const roadmap = matrix.futureActivation.find((s) => s.stage === "roadmap");
    assert.ok(roadmap);
    assert.ok(roadmap!.controlCount > 0);
  });

  it("builds evidence requirements for every control", () => {
    const doc = buildV2RegistryDocument();
    const ev = buildEvidenceRequirements(doc.controls);
    assert.equal(ev.controls.length, doc.controls.length);
    assert.match(ev.rule, /never pass/i);
  });

  it("builds v1→v2 migration retaining 24 controls", () => {
    const mig = buildV1ToV2Migration();
    assert.equal(mig.preservedControlCount, 24);
    assert.equal(mig.preservedControls.length, 24);
    assert.ok(mig.additiveControlCount > 0);
    for (const p of mig.preservedControls) {
      assert.equal(p.disposition, "retained");
      assert.equal(p.controlVersion, "1.0.0");
      assert.equal(p.historicalFindingsInterpretation, "unchanged");
    }
  });

  it("marks external assurance family as roadmap / non-impersonating", () => {
    const doc = buildV2RegistryDocument();
    const ext = doc.controls.filter((c) => c.familyCode === "EXT");
    assert.ok(ext.length >= 8);
    for (const c of ext) {
      assert.equal(c.activationStage, "roadmap");
      assert.ok(c.authority.includes("human_review"));
      assert.match(c.verdictRules.toLowerCase(), /pass/);
    }
    const human = doc.controls.find((c) => c.controlId === "MAA2-HUM-05-SAFETY-CRITICAL-FN");
    assert.ok(human);
    assert.match(human!.verdictRules, /null until human/i);
  });
});
