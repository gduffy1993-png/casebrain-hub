/**
 * Contracts for Stage-300 new-150 control-coverage materialisation.
 * Fixtures prove evaluator/harness behaviour only — never corpus calibration.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FROZEN_150_CANDIDATE_FREEZE_SHA256,
  FROZEN_150_ORDERED_MEMBERSHIP_SHA256,
  NEW150_ARTIFACT_ROOT,
  NEW150_TARGET,
} from "../lib/eval/master-assurance-auditor/v2/stage300/new150/constants";
import { buildNew150Catalog, coverageMatrixFromCatalog } from "../lib/eval/master-assurance-auditor/v2/stage300/new150/coverage-catalog";
import { buildNew150Source } from "../lib/eval/master-assurance-auditor/v2/stage300/new150/source-builder";

const ROOT = process.cwd();
const OUT = path.join(ROOT, NEW150_ARTIFACT_ROOT);

test("catalog builds 150 unique case ids across 18 families", () => {
  const catalog = buildNew150Catalog(NEW150_TARGET);
  assert.equal(catalog.length, 150);
  const ids = new Set(catalog.map((c) => c.caseId));
  assert.equal(ids.size, 150);
  const matrix = coverageMatrixFromCatalog(catalog);
  assert.equal(matrix.familiesPresent.length, 18);
  assert.ok((matrix.byTag.ocr_binary_heavy ?? 0) >= 20);
  assert.ok((matrix.byTag.specialty_youth_dob ?? 0) >= 10);
});

test("source builder never embeds truth-leak phrases into canonical bundle", () => {
  const spec = buildNew150Catalog(1)[0]!;
  const src = buildNew150Source(spec);
  assert.ok(!src.canonicalBundle.includes("truth-leak-"));
  assert.equal(src.truthKey.mustNotOpenDuringOutputGeneration, true);
  assert.ok(src.sourceCapabilityInventory);
  assert.ok(!("legalStateTaxonomy" in src.truthKey && (src.truthKey as { legalStateTaxonomy?: unknown }).legalStateTaxonomy));
});

test("locked acceptance contract exists and is locked before implementation", () => {
  const p = path.join(OUT, "LOCKED-ACCEPTANCE-CONTRACT.json");
  assert.ok(fs.existsSync(p), "LOCKED-ACCEPTANCE-CONTRACT.json missing");
  const locked = JSON.parse(fs.readFileSync(p, "utf8")) as {
    lockedBeforeImplementation: boolean;
    baselineCommit: string;
  };
  assert.equal(locked.lockedBeforeImplementation, true);
  assert.equal(locked.baselineCommit, "d03e0a57c279d9e155ea20cf89c2e40b3f6848c9");
});

test("frozen Stage-150 lineage pins remain the Batch-B authority hashes", () => {
  assert.equal(
    FROZEN_150_ORDERED_MEMBERSHIP_SHA256,
    "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1",
  );
  assert.equal(
    FROZEN_150_CANDIDATE_FREEZE_SHA256,
    "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202",
  );
});

test("if population manifest exists, dual-status honesty holds for specialty bags", () => {
  const manifestPath = path.join(OUT, "new-150-population-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    assert.ok(true, "manifest not yet emitted — skip runtime assertion");
    return;
  }
  const summaryPath = path.join(OUT, "capability-snapshot-summary.json");
  assert.ok(fs.existsSync(summaryPath));
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
    rows: Array<{
      productionSpecialtyBags: {
        legalStateTaxonomy: boolean;
        dobAgeCalcLedger: boolean;
        proceduralPartyState: boolean;
      };
      sixProductionExitsComplete: boolean;
    }>;
  };
  for (const row of summary.rows) {
    assert.equal(row.productionSpecialtyBags.legalStateTaxonomy, false);
    assert.equal(row.productionSpecialtyBags.dobAgeCalcLedger, false);
    assert.equal(row.productionSpecialtyBags.proceduralPartyState, false);
    assert.equal(row.sixProductionExitsComplete, true);
  }
  const denomPath = path.join(OUT, "per-control-denominator-report.json");
  assert.ok(fs.existsSync(denomPath));
  const denom = JSON.parse(fs.readFileSync(denomPath, "utf8")) as {
    rows: Array<{ controlId: string; achievedDenominator: number }>;
    threeDenominatorHeadline?: {
      auditorTestable: string;
      productionBacked: string;
      harnessOnlySpecialty: string;
    };
  };
  assert.equal(denom.rows.length, 43);
  if (denom.threeDenominatorHeadline) {
    assert.equal(denom.threeDenominatorHeadline.auditorTestable, "43/43");
    assert.equal(denom.threeDenominatorHeadline.productionBacked, "37/43");
    assert.equal(denom.threeDenominatorHeadline.harnessOnlySpecialty, "6/43");
  }

  // Sample: CaseBrain output must not carry specialty bags after honesty correction.
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    cases: Array<{ caseId: string }>;
  };
  const sampleId = manifest.cases[30]?.caseId;
  if (sampleId) {
    const cbPath = path.join(
      ROOT,
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/sources",
      sampleId,
      "casebrain-output.json",
    );
    if (fs.existsSync(cbPath)) {
      const cb = JSON.parse(fs.readFileSync(cbPath, "utf8")) as Record<string, unknown>;
      assert.ok(cb.legalStateTaxonomy == null);
      assert.ok(cb.dobAgeCalcLedger == null);
      assert.ok(cb.proceduralPartyState == null);
    }
  }
});

test("honesty correction three-denominator matrix exists when emitted", () => {
  const p = path.join(OUT, "honesty-correction-v1", "three-denominator-readiness-matrix.json");
  if (!fs.existsSync(p)) {
    assert.ok(true, "honesty correction not yet emitted");
    return;
  }
  const m = JSON.parse(fs.readFileSync(p, "utf8")) as {
    headline: { auditorTestable: string; productionBacked: string; harnessOnlySpecialty: string };
    harnessOnlySpecialtyControlIds: string[];
  };
  assert.equal(m.headline.auditorTestable, "43/43");
  assert.equal(m.headline.productionBacked, "37/43");
  assert.equal(m.headline.harnessOnlySpecialty, "6/43");
  assert.equal(m.harnessOnlySpecialtyControlIds.length, 6);
});
