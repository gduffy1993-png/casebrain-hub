/**
 * Batch-10 deficit-120 contracts — preserve cohort A; catalog size; strict rejection honesty.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BATCH10_BASELINE } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import {
  BATCH10_COHORT_B_TARGET,
  BATCH10_CORE_FAMILIES,
  BATCH10_POPULATION_TARGET,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/constants";
import {
  buildDeficit120Catalog,
  coverageMatrixFromCatalog,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/coverage-catalog";
import { buildDeficit120Source } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/source-builder";
import { lockCohortA } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/cohort-pipeline";
import { strictValidateDeficitPacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/strict-validators";
import type { Batch10StructuredCasePacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";

describe("Batch-10 deficit-120 foundation", () => {
  it("locks existing 30 unchanged", () => {
    assert.equal(BATCH10_BASELINE, "78d16bb1a2606f7187f69fc8474e97629bce69ca");
    const lock = lockCohortA(process.cwd());
    assert.equal(lock.count, 30);
    assert.equal(lock.allUnchanged, true);
  });

  it("catalog is exactly 120 stratified across 18 families", () => {
    const cat = buildDeficit120Catalog();
    assert.equal(cat.length, BATCH10_COHORT_B_TARGET);
    assert.equal(BATCH10_POPULATION_TARGET, 150);
    const matrix = coverageMatrixFromCatalog(cat);
    assert.equal(Object.keys(matrix.byFamily).length, BATCH10_CORE_FAMILIES.length);
    const ids = new Set(cat.map((c) => c.caseId));
    assert.equal(ids.size, 120);
  });

  it("source builder emits status/version/timezone without opening truth into bundle", () => {
    const spec = buildDeficit120Catalog()[0]!;
    const src = buildDeficit120Source(spec);
    assert.match(src.canonicalBundle, /Instrument status:/);
    assert.match(src.canonicalBundle, /Instrument version:/);
    assert.match(src.canonicalBundle, /Europe\/London/);
    assert.equal(src.truthKey.blinded, true);
    assert.doesNotMatch(src.canonicalBundle, /mustNotSay|truth-leak/);
  });

  it("strict validator rejects empty packet", () => {
    const empty = {
      schemaVersion: "stage150-structured-case-packet@1.0.0",
      caseId: "x",
      sourceLaneId: "stage150_deficit120_controlled",
      sourceCasePath: "x",
      preservedOriginalHashes: {
        bundleTextSha256: null,
        casebrainOutputSha256: null,
        truthKeySha256: null,
        bundlePdfSha256: null,
        pdfExtractionMetaSha256: null,
        canonicalBundleSha256: null,
      },
      truthKeyIdentified: false,
      truthKeyContentsOpened: false,
      invented: false,
      sourceManifest: [],
      chargeInstruments: [],
      evidenceUnits: [],
      chronologyEvents: [],
      provenance: [],
      chaseRelationships: [],
      exitPayloadReceipts: Object.fromEntries(
        ["view", "copy", "export", "api", "pdf", "composed_prose", "authenticated_browser"].map((id) => [
          id,
          {
            exitId: id,
            payloadIdentity: null,
            payloadPath: null,
            realPayloadPresent: false,
            sendability: null,
            unavailableReason: "none",
            chargeWarningAttached: null,
            evidencePartialWarning: null,
            quarantineScope: null,
            metadataOnly: false,
            sourcePointer: null,
          },
        ]),
      ),
      adapterCapability: {
        sourceManifest: "unavailable",
        chargeInstruments: "unavailable",
        evidenceUnits: "unavailable",
        chronologyEvents: "unavailable",
        provenance: "unavailable",
        chaseRelationships: "unavailable",
        exitPayloadReceipts: "unavailable",
      },
      acceptance: { accepted: false, reasons: [] },
      materialisedAt: "t",
      materialiserVersion: "maa-v2-stage150-batch10-structured-rematerialisation@1.0.0",
    } as Batch10StructuredCasePacket;
    const reasons = strictValidateDeficitPacket(empty);
    assert.ok(reasons.includes("missing_charge_instruments"));
    assert.ok(reasons.some((r) => r.startsWith("missing_real_exit:")));
  });

  it("Five Answers serialisation copies view rows and never invents from court", () => {
    const {
      serializeFiveAnswersEvidenceRowsFromSurfaces,
      alignCasebrainOutputFiveAnswersWithViewRows,
    } = require("../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/five-answers-serialisation") as typeof import("../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/five-answers-serialisation");
    const rows = [
      { label: "CCTV master", existence: "missing" as const, reliability: "needs_review" as const, note: "p.3" },
    ];
    const surfaces = {
      truthMap: {
        caseSaying: { allegation: "a", mainIssue: "m", nextAction: "n" },
        evidenceState: { rows, hardRules: [] as string[] },
        mustNotOverstate: [] as string[],
        chase: [],
        courtNote: { text: "Court", copySuggestionLabel: "", sendabilityLabel: "", canCopy: false, footer: "" },
        contradictions: [],
        evidenceTrace: { rows: [], bySection: {} as never },
      },
      composedProse: { courtLine: "Court", cpsChase: null, clientDisclaimer: "", limitations: [] as string[] },
    };
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(surfaces);
    assert.equal(s.rows.length, 1);
    assert.equal(s.inventedFromCourt, false);
    const emptyCourt = serializeFiveAnswersEvidenceRowsFromSurfaces({
      ...surfaces,
      truthMap: { ...surfaces.truthMap, evidenceState: { rows: [], hardRules: [] } },
    });
    assert.equal(emptyCourt.rows.length, 0);
    const aligned = alignCasebrainOutputFiveAnswersWithViewRows({
      casebrainOutput: { courtNote: { text: "Court" }, fiveAnswersEvidenceRows: [] },
      viewEvidenceRows: rows,
    });
    assert.equal(aligned.repaired, true);
    assert.equal(aligned.afterLen, 1);
  });
});
