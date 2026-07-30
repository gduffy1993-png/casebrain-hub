/**
 * Positive / negative / unavailable contracts for each multi-exit adapter.
 * Fixtures use only fields that can genuinely appear on ESA packets (or named
 * artefacts when testing full exercise). Never invents live application data.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  checkExitCapability,
  EXIT_ARTEFACT_RECEIPT_SCHEMA,
  type ExitArtefactReceipt,
} from "./capability";
import { buildExitReceipt, validateExitReceipt } from "./receipts";
import { EXIT_ADAPTER_SCHEMAS } from "./registry";
import {
  MULTI_EXIT_IDS,
  type ExitAdapterContract,
  type MultiExitId,
} from "./schemas";

function receipt(artefactType: string): ExitArtefactReceipt {
  return {
    artefactType,
    contentHash: crypto.createHash("sha256").update(`fixture:${artefactType}`).digest("hex"),
    schemaVersion: EXIT_ARTEFACT_RECEIPT_SCHEMA,
    sourceCaptureRef: "fixture://shared-capture",
    capturedAt: "2026-07-30T00:00:00.000Z",
    runId: "syn-exit-run-001",
  };
}

/** Minimal ESA-shaped packet with view + copy + export metadata present. */
export function esaPacketWithViewCopyExportMeta(): Record<string, unknown> {
  return {
    courtNote: {
      text: "The defence asks the court to record that source material must be clarified.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
      blockedReason: null,
    },
    fiveAnswersEvidenceRows: [
      { label: "CCTV", existence: "incomplete", reliability: "needs_review", note: "Partial." },
    ],
    evidenceStates: [
      {
        label: "CCTV",
        inferredSourceState: "provisional",
        existenceLabel: "Unknown",
        evidenceAnchor: "MG6C extract",
      },
    ],
    warningsAndGaps: {
      doNotOverstate: ["Do not state CCTV proves guilt."],
      chaseItems: [
        {
          label: "CCTV master",
          copySuggestion: "Please provide CCTV master or confirm why unavailable.",
        },
      ],
    },
    exportVersion: {
      exportId: "exp-fixture",
      sendability: "needs_solicitor_review",
      blockedReason: null,
      reviewFooter: "Solicitor review required before sending to CPS, court, or client.",
    },
  };
}

/** Packet with no solicitor-visible surfaces and no export metadata. */
export function emptyPacket(): Record<string, unknown> {
  return {};
}

/** Packet with view text but no copy evidence and no exportVersion. */
export function viewOnlyPacket(): Record<string, unknown> {
  return {
    courtNote: {
      text: "Court line only.",
      sendabilityLabel: "Solicitor review required",
      canCopy: false,
      blockedReason: null,
    },
    fiveAnswersEvidenceRows: [{ label: "MG11", existence: "served", reliability: "ok", note: "ok" }],
  };
}

function contractId(exitId: MultiExitId, kind: ExitAdapterContract["kind"], slot: string): string {
  return `maa-v2-multiexit/${exitId}/${kind}/${slot}`;
}

export const EXIT_ADAPTER_CONTRACTS: readonly ExitAdapterContract[] = [
  // —— view ——
  {
    contractId: contractId("view", "positive", "solicitor-visible"),
    exitId: "view",
    kind: "positive",
    description: "Non-empty court/fiveAnswers wording → view exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "exercisable",
    expectedVerdict: null,
    mustIncludePointers: ["/courtNote/text"],
  },
  {
    contractId: contractId("view", "negative", "no-invention-from-empty"),
    exitId: "view",
    kind: "negative",
    description: "Empty packet must not invent view.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
    mustNotInventExit: true,
  },
  {
    contractId: contractId("view", "unavailable", "empty"),
    exitId: "view",
    kind: "unavailable",
    description: "Unavailable view → precise not_exercised receipt.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },

  // —— copy ——
  {
    contractId: contractId("copy", "positive", "cancopy-or-suggestion"),
    exitId: "copy",
    kind: "positive",
    description: "(canCopy===true + non-empty court text) or non-empty copySuggestion → copy exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "exercisable",
    expectedVerdict: null,
  },
  {
    contractId: contractId("copy", "negative", "cancopy-false-no-suggestion"),
    exitId: "copy",
    kind: "negative",
    description: "canCopy===false without copySuggestion must not invent copy.",
    fixtureOutput: viewOnlyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
    mustNotInventExit: true,
  },
  {
    contractId: contractId("copy", "unavailable", "empty"),
    exitId: "copy",
    kind: "unavailable",
    description: "Unavailable copy → not_exercised with missingAdapter.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },

  // —— export ——
  {
    contractId: contractId("export", "positive", "full-payload"),
    exitId: "export",
    kind: "positive",
    description: "Metadata + full_export_exit_payload_bytes → export exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    artefactReceipts: [receipt("full_export_exit_payload_bytes")],
    expectedStatus: "exercisable",
    expectedVerdict: null,
    mustIncludePointers: ["/exportVersion/reviewFooter"],
  },
  {
    contractId: contractId("export", "negative", "no-full-payload-invention"),
    exitId: "export",
    kind: "negative",
    description: "Metadata alone must never be reported as fully exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "partial_fields_only",
    expectedVerdict: null,
    mustNotInventExit: true,
  },
  {
    contractId: contractId("export", "unavailable", "no-exportVersion"),
    exitId: "export",
    kind: "unavailable",
    description: "No exportVersion → not_exercised.",
    fixtureOutput: viewOnlyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },

  // —— api ——
  {
    contractId: contractId("api", "positive", "artefact-present"),
    exitId: "api",
    kind: "positive",
    description: "When api_exit_payload is genuinely supplied, API is exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    artefactReceipts: [receipt("api_exit_payload"), receipt("api_response_headers_receipt")],
    expectedStatus: "exercisable",
    expectedVerdict: null,
  },
  {
    contractId: contractId("api", "negative", "no-invention-from-packet"),
    exitId: "api",
    kind: "negative",
    description: "Packet fields must never invent an API exit.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
    mustNotInventExit: true,
  },
  {
    contractId: contractId("api", "unavailable", "missing-adapter"),
    exitId: "api",
    kind: "unavailable",
    description: "Unavailable API → not_exercised naming api_exit_adapter.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },

  // —— pdf ——
  {
    contractId: contractId("pdf", "positive", "artefact-present"),
    exitId: "pdf",
    kind: "positive",
    description: "When pdf_exit_payload_bytes is genuinely supplied, PDF is exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    artefactReceipts: [receipt("pdf_exit_payload_bytes"), receipt("pdf_text_extraction_receipt")],
    expectedStatus: "exercisable",
    expectedVerdict: null,
  },
  {
    contractId: contractId("pdf", "negative", "no-invention-from-packet"),
    exitId: "pdf",
    kind: "negative",
    description: "Packet fields must never invent a PDF exit.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
    mustNotInventExit: true,
  },
  {
    contractId: contractId("pdf", "unavailable", "missing-adapter"),
    exitId: "pdf",
    kind: "unavailable",
    description: "Unavailable PDF → not_exercised naming pdf_exit_adapter.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },

  // —— composed_prose ——
  {
    contractId: contractId("composed_prose", "positive", "artefact-present"),
    exitId: "composed_prose",
    kind: "positive",
    description: "When composed_prose_exit_payload is genuinely supplied, exit is exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    artefactReceipts: [receipt("composed_prose_exit_payload")],
    expectedStatus: "exercisable",
    expectedVerdict: null,
  },
  {
    contractId: contractId("composed_prose", "negative", "no-invention-from-packet"),
    exitId: "composed_prose",
    kind: "negative",
    description: "Packet fields must never invent composed_prose.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
    mustNotInventExit: true,
  },
  {
    contractId: contractId("composed_prose", "unavailable", "missing-adapter"),
    exitId: "composed_prose",
    kind: "unavailable",
    description: "Unavailable composed_prose → not_exercised naming composed_prose_exit_adapter.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },

  // —— authenticated_browser ——
  {
    contractId: contractId("authenticated_browser", "positive", "receipts-present"),
    exitId: "authenticated_browser",
    kind: "positive",
    description: "When all four browser receipts are supplied, browser evidence is exercisable.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    artefactReceipts: [receipt("browser_session_receipt"), receipt("authenticated_screenshot_hash"), receipt("dom_text_extraction_receipt"), receipt("exit_click_path_receipt")],
    expectedStatus: "exercisable",
    expectedVerdict: null,
  },
  {
    contractId: contractId("authenticated_browser", "negative", "no-invention-from-packet"),
    exitId: "authenticated_browser",
    kind: "negative",
    description: "Packet fields must never invent authenticated browser evidence.",
    fixtureOutput: esaPacketWithViewCopyExportMeta(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
    mustNotInventExit: true,
  },
  {
    contractId: contractId("authenticated_browser", "unavailable", "missing-adapter"),
    exitId: "authenticated_browser",
    kind: "unavailable",
    description:
      "Unavailable browser evidence → not_exercised naming authenticated_browser_evidence_adapter.",
    fixtureOutput: emptyPacket(),
    expectedStatus: "not_exercised",
    expectedVerdict: "not_exercised",
  },
];

export type ContractRunResult = {
  contractId: string;
  ok: boolean;
  detail: string;
};

export function runExitAdapterContract(c: ExitAdapterContract): ContractRunResult {
  const bag = c.artefactReceipts ? { artefacts: c.artefactReceipts } : undefined;
  const check = checkExitCapability(c.exitId, c.fixtureOutput, bag);
  const receipt = buildExitReceipt({
    caseId: `contract:${c.contractId}`,
    exitId: c.exitId,
    output: c.fixtureOutput,
    bag,
  });
  const validation = validateExitReceipt(receipt);

  try {
    assert.equal(check.status, c.expectedStatus, `status for ${c.contractId}`);
    assert.equal(receipt.status, c.expectedStatus, `receipt.status for ${c.contractId}`);
    assert.equal(receipt.verdict, c.expectedVerdict, `verdict for ${c.contractId}`);
    assert.equal(receipt.invented, false);
    assert.equal(receipt.opensTruth, false);
    assert.equal(receipt.neverPassOnAbsence, true);
    assert.equal(validation.ok, true, validation.issues.map((i) => i.detail).join("; "));

    if (c.mustIncludePointers) {
      for (const p of c.mustIncludePointers) {
        assert.ok(
          check.presentEvidencePointers.includes(p),
          `${c.contractId} missing expected pointer ${p}`,
        );
      }
    }

    if (c.mustNotInventExit) {
      assert.notEqual(check.status, "exercisable", `${c.contractId} invented full exercise`);
      if (c.expectedStatus === "not_exercised") {
        assert.equal(check.missingAdapter != null, true);
        assert.equal(receipt.verdict, "not_exercised");
      }
      if (c.expectedStatus === "partial_fields_only") {
        assert.ok(check.missingFullExerciseArtefacts.length > 0);
        assert.ok(check.missingAdapter != null);
      }
    }

    if (c.kind === "unavailable" || c.expectedStatus === "not_exercised") {
      assert.equal(receipt.verdict, "not_exercised");
      assert.ok(
        typeof receipt.missingAdapter === "string" && receipt.missingAdapter.length > 0,
        `${c.contractId} must name missingAdapter`,
      );
    }

    return { contractId: c.contractId, ok: true, detail: "ok" };
  } catch (err) {
    return {
      contractId: c.contractId,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export function runAllExitAdapterContracts(): {
  total: number;
  passed: number;
  failed: ContractRunResult[];
  coverage: { exitId: MultiExitId; kinds: string[] }[];
} {
  const results = EXIT_ADAPTER_CONTRACTS.map(runExitAdapterContract);
  const failed = results.filter((r) => !r.ok);
  const coverage = MULTI_EXIT_IDS.map((exitId) => ({
    exitId,
    kinds: EXIT_ADAPTER_CONTRACTS.filter((c) => c.exitId === exitId).map((c) => c.kind),
  }));
  return {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed,
    coverage,
  };
}

/** Structural completeness of the adapter foundation (schemas × contracts). */
export function assertFoundationCompleteness(): void {
  assert.equal(EXIT_ADAPTER_SCHEMAS.length, MULTI_EXIT_IDS.length);
  for (const exitId of MULTI_EXIT_IDS) {
    const kinds = new Set(
      EXIT_ADAPTER_CONTRACTS.filter((c) => c.exitId === exitId).map((c) => c.kind),
    );
    assert.ok(kinds.has("positive"), `${exitId} missing positive contract`);
    assert.ok(kinds.has("negative"), `${exitId} missing negative contract`);
    assert.ok(kinds.has("unavailable"), `${exitId} missing unavailable contract`);
  }
}
