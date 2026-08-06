/**
 * MAA V2 multi-exit adapter foundation contracts.
 *
 * Schemas · capability checks · receipt validators ·
 * positive / negative / unavailable contracts for:
 *   view | copy | export | api | pdf | composed_prose | authenticated_browser
 *
 * Load/validate only — does not freeze, run detectors, merge, deploy, or PASS.
 *
 * Run: npx tsx --test scripts/maa-v2-multiexit-adapter-contracts.test.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  BASELINE_COMMIT,
  EXIT_ADAPTER_CONTRACTS,
  EXIT_ADAPTER_SCHEMAS,
  MULTI_EXIT_ADAPTER_SCHEMA,
  MULTI_EXIT_IDS,
  MULTI_EXIT_RECEIPT_SCHEMA,
  assertFoundationCompleteness,
  buildAllExitReceipts,
  buildExitReceipt,
  checkAllExitCapabilities,
  checkExitCapability,
  emptyPacket,
  esaPacketWithViewCopyExportMeta,
  runAllExitAdapterContracts,
  validateAllExitReceipts,
  validateExitReceipt,
  viewOnlyPacket,
} from "../lib/eval/master-assurance-auditor/v2/multi-exit-adapters";

describe("MAA V2 multi-exit adapter foundation — schemas", () => {
  it("declares exactly seven exits including authenticated_browser", () => {
    assert.deepEqual([...MULTI_EXIT_IDS], [
      "view",
      "copy",
      "export",
      "api",
      "pdf",
      "composed_prose",
      "authenticated_browser",
    ]);
    assert.equal(EXIT_ADAPTER_SCHEMAS.length, 7);
    for (const s of EXIT_ADAPTER_SCHEMAS) {
      assert.equal(s.schemaVersion, MULTI_EXIT_ADAPTER_SCHEMA);
      assert.equal(s.whenAbsent, "not_exercised");
      assert.equal(s.opensTruth, false);
      assert.equal(s.inventForbidden, true);
      assert.equal(s.receiptSchemaVersion, MULTI_EXIT_RECEIPT_SCHEMA);
    }
  });

  it("pins baseline commit and forbids truth opening", () => {
    assert.equal(BASELINE_COMMIT, "17361223248b41d719c8de2b98c1eaf2cb4125f6");
    assert.ok(EXIT_ADAPTER_SCHEMAS.every((s) => s.opensTruth === false));
  });

  it("has positive/negative/unavailable contracts per exit", () => {
    assertFoundationCompleteness();
    assert.equal(EXIT_ADAPTER_CONTRACTS.length, MULTI_EXIT_IDS.length * 3);
  });
});

describe("MAA V2 multi-exit adapter foundation — capability checks", () => {
  it("marks view+copy exercisable and export partial on ESA-shaped packet", () => {
    const output = esaPacketWithViewCopyExportMeta();
    const checks = checkAllExitCapabilities(output);
    const by = Object.fromEntries(checks.map((c) => [c.exitId, c]));
    assert.equal(by.view.status, "exercisable");
    assert.equal(by.copy.status, "exercisable");
    assert.equal(by.export.status, "partial_fields_only");
    assert.equal(by.export.missingAdapter, "full_export_exit_payload_bytes");
    assert.equal(by.api.status, "not_exercised");
    assert.equal(by.pdf.status, "not_exercised");
    assert.equal(by.composed_prose.status, "not_exercised");
    assert.equal(by.authenticated_browser.status, "not_exercised");
  });

  it("does not invent copy when canCopy is false and no copySuggestion", () => {
    const c = checkExitCapability("copy", viewOnlyPacket());
    assert.equal(c.status, "not_exercised");
    assert.equal(c.missingAdapter, "copy_exit_adapter");
  });

  it("does not invent api/pdf/composed_prose/browser from packet silence", () => {
    for (const exitId of ["api", "pdf", "composed_prose", "authenticated_browser"] as const) {
      const c = checkExitCapability(exitId, esaPacketWithViewCopyExportMeta());
      assert.equal(c.status, "not_exercised", exitId);
      assert.ok(c.missingAdapter, exitId);
    }
  });

  it("honours structured artefact receipts; name-only bags never exercise", () => {
    const h1 = "a".repeat(64);
    const h2 = "b".repeat(64);
    const structured = {
      artefacts: [
        {
          artefactType: "api_exit_payload",
          contentHash: h1,
          schemaVersion: "maa-v2-exit-artefact-receipt@1.0.0",
          sourceCaptureRef: "fixture://shared-capture",
          capturedAt: "2026-07-30T00:00:00.000Z",
          runId: "syn-1",
        },
        {
          artefactType: "api_response_headers_receipt",
          contentHash: h2,
          schemaVersion: "maa-v2-exit-artefact-receipt@1.0.0",
          sourceCaptureRef: "fixture://shared-capture",
          capturedAt: "2026-07-30T00:00:00.000Z",
          runId: "syn-1",
        },
      ],
    };
    const api = checkExitCapability("api", emptyPacket(), structured);
    assert.equal(api.status, "exercisable");
    const nameOnly = checkExitCapability("api", emptyPacket(), {
      observedArtefacts: ["api_exit_payload", "api_response_headers_receipt"],
    });
    assert.equal(nameOnly.status, "not_exercised");
    const malformed = checkExitCapability("api", emptyPacket(), {
      artefacts: [
        {
          artefactType: "api_exit_payload",
          contentHash: "x",
          schemaVersion: "x",
          sourceCaptureRef: "fixture://x",
          capturedAt: "not-a-date",
          runId: "syn-1",
        },
        {
          artefactType: "api_response_headers_receipt",
          contentHash: "y",
          schemaVersion: "x",
          sourceCaptureRef: "fixture://x",
          capturedAt: "not-a-date",
          runId: "syn-1",
        },
      ],
    });
    assert.equal(malformed.status, "not_exercised");
    const pdf = checkExitCapability("pdf", emptyPacket(), {
      artefacts: [
        {
          artefactType: "api_exit_payload",
          contentHash: "c".repeat(64),
          schemaVersion: "maa-v2-exit-artefact-receipt@1.0.0",
          sourceCaptureRef: "fixture://shared-capture",
          capturedAt: "2026-07-30T00:00:00.000Z",
          runId: "syn-1",
        },
      ],
    });
    assert.equal(pdf.status, "not_exercised");
  });

  it("canCopy=true without non-empty court text does not exercise copy", () => {
    const c = checkExitCapability("copy", {
      courtNote: { text: "", canCopy: true, sendabilityLabel: "x" },
    });
    assert.equal(c.status, "not_exercised");
  });

  it("empty evidence rows without solicitor-visible strings do not exercise view", () => {
    const c = checkExitCapability("view", {
      fiveAnswersEvidenceRows: [{ label: "", existence: "", reliability: "", note: "" }],
      evidenceStates: [{ label: "", inferredSourceState: "", existenceLabel: "", evidenceAnchor: "" }],
    });
    assert.equal(c.status, "not_exercised");
  });
});

describe("MAA V2 multi-exit adapter foundation — receipt validators", () => {
  it("emits precise not_exercised receipts for absent exits", () => {
    const receipts = buildAllExitReceipts({
      caseId: "fixture-empty",
      output: emptyPacket(),
    });
    const validation = validateAllExitReceipts(receipts);
    assert.equal(validation.ok, true, validation.issues.map((i) => i.detail).join("; "));
    for (const r of receipts) {
      assert.equal(r.status, "not_exercised");
      assert.equal(r.verdict, "not_exercised");
      assert.ok(r.missingAdapter);
      assert.equal(r.invented, false);
      assert.equal(r.neverPassOnAbsence, true);
    }
  });

  it("rejects invented / pass-on-absence / missing missingAdapter", () => {
    const good = buildExitReceipt({
      caseId: "t",
      exitId: "api",
      output: emptyPacket(),
    });
    assert.equal(validateExitReceipt(good).ok, true);

    const invented = { ...good, invented: true };
    assert.equal(validateExitReceipt(invented).ok, false);

    const noAdapter = { ...good, missingAdapter: null };
    assert.equal(validateExitReceipt(noAdapter).ok, false);

    const badVerdict = { ...good, verdict: null };
    assert.equal(validateExitReceipt(badVerdict).ok, false);
  });

  it("partial export receipt names missing full payload artefact", () => {
    const r = buildExitReceipt({
      caseId: "t",
      exitId: "export",
      output: esaPacketWithViewCopyExportMeta(),
    });
    assert.equal(r.status, "partial_fields_only");
    assert.equal(r.missingAdapter, "full_export_exit_payload_bytes");
    assert.ok(r.missingFullExerciseArtefacts.includes("full_export_exit_payload_bytes"));
    assert.equal(validateExitReceipt(r).ok, true);
  });
});

describe("MAA V2 multi-exit adapter foundation — contracts", () => {
  it("all positive/negative/unavailable contracts pass", () => {
    const run = runAllExitAdapterContracts();
    assert.equal(run.failed.length, 0, run.failed.map((f) => `${f.contractId}: ${f.detail}`).join("\n"));
    assert.equal(run.passed, run.total);
    assert.equal(run.total, 21);
    for (const row of run.coverage) {
      assert.deepEqual(row.kinds.sort(), ["negative", "positive", "unavailable"]);
    }
  });
});

describe("MAA V2 multi-exit adapter foundation — ownership boundaries", () => {
  it("adapter package owns capability algorithm; stage150 map derives from it", () => {
    const root = path.join("lib", "eval", "master-assurance-auditor", "v2", "multi-exit-adapters");
    assert.ok(fs.existsSync(path.join(root, "schemas.ts")));
    assert.ok(fs.existsSync(path.join(root, "registry.ts")));
    assert.ok(fs.existsSync(path.join(root, "capability.ts")));
    assert.ok(fs.existsSync(path.join(root, "receipts.ts")));
    assert.ok(fs.existsSync(path.join(root, "contracts.ts")));
    assert.ok(fs.existsSync(path.join(root, "index.ts")));

    const mapSrc = fs.readFileSync(
      path.join("lib", "eval", "master-assurance-auditor", "v2", "stage150", "multi-exit-map.ts"),
      "utf8",
    );
    assert.ok(mapSrc.includes("multi-exit-adapters"));
    assert.ok(mapSrc.includes("checkAllExitCapabilities") || mapSrc.includes("EXIT_ADAPTER_SCHEMAS"));
    assert.ok(mapSrc.includes("sourceOfTruth"));
  });
});
