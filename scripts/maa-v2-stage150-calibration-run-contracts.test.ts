/**
 * Stage-150 frozen calibration run — contracts (measurement honesty).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  STAGE150_CALIBRATION_BASELINE,
  freezeAcceptedPopulation,
  revalidatePopulationFreeze,
} from "../lib/eval/master-assurance-auditor/v2/stage150/calibration";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { applyOwnershipAndDedupe } from "../lib/eval/master-assurance-auditor/v2/stage150/calibration/ownership-dedupe";
import type { CalibrationCandidate } from "../lib/eval/master-assurance-auditor/v2/stage150/calibration/blind-runner";

describe("Stage-150 calibration freeze foundation", () => {
  it("freezes exact 150 ordered membership without opening truth", () => {
    assert.equal(STAGE150_CALIBRATION_BASELINE, "9cdd8fd66773872cb94a21c0a202ee63c40f6a83");
    const freeze = freezeAcceptedPopulation({
      repoRoot: process.cwd(),
      headCommit: STAGE150_CALIBRATION_BASELINE,
      runId: "contract-freeze-test",
    });
    assert.equal(freeze.populationCount, 150);
    assert.equal(freeze.membership.length, 150);
    assert.equal(freeze.coverage.byCohort.A, 30);
    assert.equal(freeze.coverage.byCohort.B, 120);
    assert.match(freeze.orderedMembershipSha256, /^[0-9a-f]{64}$/);
    const re = revalidatePopulationFreeze(process.cwd(), freeze);
    assert.equal(re.ok, true);
    assert.equal(re.orderedMembershipSha256, freeze.orderedMembershipSha256);
  });

  it("keeps Stage-150 execution gates false while calibration may complete", () => {
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.stage150ControlCount, 161);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
  });

  it("ownership links duplicates without deleting evidence", () => {
    const base: CalibrationCandidate = {
      candidateId: "c1",
      caseId: "case-a",
      cohort: "B",
      controlId: "MAA2-BND-09-STILL-CLIP-VS-MASTER",
      findingCode: "X",
      occurrenceRef: "/eu/1",
      exactWording: "still as master",
      wordingHash: "wh1",
      normalisedTemplateHash: "th1",
      plainEnglish: "collapse",
      candidateClass: "candidate_defect",
      evidenceRefs: [],
      outputSha256: "o1",
      surface: "/eu/1",
      exitId: null,
      ownerFindingId: null,
      ownershipGroupId: null,
      duplicateOfCandidateId: null,
    };
    const clone = { ...base, candidateId: "c2" };
    const consumer: CalibrationCandidate = {
      ...base,
      candidateId: "c3",
      controlId: "MAA2-BND-07-ALIAS-SAFE-COLLAPSE",
      wordingHash: "wh2",
    };
    const linked = applyOwnershipAndDedupe([base, clone, consumer]);
    assert.equal(linked[1]?.duplicateOfCandidateId, "c1");
    assert.equal(linked[2]?.ownerFindingId, "c1");
    assert.equal(linked.length, 3);
  });
});

describe("Stage-150 calibration emit artefacts (if present)", () => {
  it("STOP keeps executionAllowed false and calibrationCompleted true", () => {
    const stopPath = path.join(
      process.cwd(),
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/STOP-FOR-CODEX-REVIEW.json",
    );
    if (!fs.existsSync(stopPath)) return;
    const stop = JSON.parse(fs.readFileSync(stopPath, "utf8")) as {
      stage150ExecutionAllowed: boolean;
      stage150CalibrationRunCompleted: boolean;
      programmePassSupported: boolean;
      populationCount: number;
    };
    assert.equal(stop.stage150ExecutionAllowed, false);
    assert.equal(stop.stage150CalibrationRunCompleted, true);
    assert.equal(stop.programmePassSupported, false);
    assert.equal(stop.populationCount, 150);
  });
});
