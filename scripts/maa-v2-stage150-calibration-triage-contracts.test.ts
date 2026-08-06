/**
 * Calibration triage contracts — projection honesty + freeze integrity.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const TRIAGE = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/triage",
);

describe("Stage-150 calibration triage artefacts", () => {
  it("keeps freeze intact and forbids Cohort A confirmed defects", () => {
    const stopPath = path.join(TRIAGE, "STOP-FOR-CODEX-REVIEW.json");
    if (!fs.existsSync(stopPath)) return;
    const stop = JSON.parse(fs.readFileSync(stopPath, "utf8")) as {
      calibrationRunId: string;
      populationAltered: boolean;
      detectorsAltered: boolean;
      caseBrainRepaired: boolean;
      projectionHonesty: { cohortAConfirmedForbidden: number; allProjectionOnly: boolean };
      uniqueConfirmedRootCauses: number;
      unitReport: { occurrences: number };
    };
    assert.equal(stop.calibrationRunId, "s150-cal-2026-07-31T16-55-01-119Z-a33adbda");
    assert.equal(stop.populationAltered, false);
    assert.equal(stop.detectorsAltered, false);
    assert.equal(stop.caseBrainRepaired, false);
    assert.equal(stop.projectionHonesty.cohortAConfirmedForbidden, 0);
    assert.equal(stop.projectionHonesty.allProjectionOnly, true);
    assert.equal(stop.unitReport.occurrences, 58);
    assert.ok(stop.uniqueConfirmedRootCauses <= 58);
  });

  it("disposition ledger covers exactly 58 rows with allowed labels", () => {
    const ledgerPath = path.join(TRIAGE, "disposition-ledger-58.json");
    if (!fs.existsSync(ledgerPath)) return;
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as {
      rows: Array<{ disposition: string; cohort: string }>;
    };
    assert.equal(ledger.rows.length, 58);
    const allowed = new Set([
      "confirmed_app_defect",
      "detector_false_positive",
      "unresolved_source",
      "truth_key_defect",
      "safe_containment",
      "duplicate_occurrence_of_confirmed_root",
      "not_exercised_projection_only",
    ]);
    for (const r of ledger.rows) {
      assert.ok(allowed.has(r.disposition), r.disposition);
      if (r.cohort === "A") assert.equal(r.disposition, "not_exercised_projection_only");
    }
  });
});
