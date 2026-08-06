/**
 * Multi-exit adapter registry — declared schemas only.
 * Capability is probed separately; this file never invents presence.
 */

import {
  MULTI_EXIT_ADAPTER_SCHEMA,
  MULTI_EXIT_RECEIPT_SCHEMA,
  type ExitAdapterSchema,
  type MultiExitId,
} from "./schemas";

export const EXIT_ADAPTER_SCHEMAS: readonly ExitAdapterSchema[] = [
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "view",
    adapterId: "view_exit_adapter",
    purpose: "Solicitor-visible on-screen wording from saved packet surfaces.",
    source: "casebrain-output.json",
    evidencePointers: [
      "/courtNote/text",
      "/fiveAnswersEvidenceRows",
      "/evidenceStates",
      "/warningsAndGaps/doNotOverstate",
    ],
    requiredForFullExercise: ["/courtNote/text"],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes: "Primary ESA H5 view surface when any solicitor-visible text pointer is present.",
  },
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "copy",
    adapterId: "copy_exit_adapter",
    purpose: "Explicitly copyable solicitor text (canCopy / copySuggestion).",
    source: "casebrain-output.json",
    evidencePointers: [
      "/courtNote/canCopy",
      "/warningsAndGaps/chaseItems/*/copySuggestion",
    ],
    requiredForFullExercise: [
      "/courtNote/canCopy=true_or_nonempty_copySuggestion",
    ],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes:
      "Copy requires (canCopy===true AND non-empty courtNote.text) OR non-empty copySuggestion. canCopy alone is insufficient.",
  },
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "export",
    adapterId: "export_exit_adapter",
    purpose: "Export-pack wording and sendability metadata on the packet.",
    source: "casebrain-output.json",
    evidencePointers: [
      "/exportVersion/reviewFooter",
      "/exportVersion/sendability",
      "/exportVersion/blockedReason",
    ],
    requiredForFullExercise: [
      "full_export_exit_payload_bytes",
    ],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes:
      "ESA H5 stores exportVersion metadata fields; full export payload bytes are absent → partial_fields_only when metadata present.",
  },
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "api",
    adapterId: "api_exit_adapter",
    purpose: "API exit payload as returned to an authenticated client.",
    source: "absent",
    evidencePointers: ["api_exit_payload"],
    requiredForFullExercise: ["api_exit_payload", "api_response_headers_receipt"],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes: "No API exit payload observed on ESA corpus — never invent.",
  },
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "pdf",
    adapterId: "pdf_exit_adapter",
    purpose: "Rendered PDF exit bytes / text extraction receipt.",
    source: "absent",
    evidencePointers: ["pdf_exit_payload_bytes"],
    requiredForFullExercise: ["pdf_exit_payload_bytes", "pdf_text_extraction_receipt"],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes: "No PDF exit payload observed on ESA H5 adapter evidence.",
  },
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "composed_prose",
    adapterId: "composed_prose_exit_adapter",
    purpose: "Composed prose exit (court/CPS/client narrative beyond packet fields).",
    source: "absent",
    evidencePointers: ["composed_prose_exit_payload"],
    requiredForFullExercise: ["composed_prose_exit_payload"],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes: "No composed-prose exit payload observed on ESA corpus.",
  },
  {
    schemaVersion: MULTI_EXIT_ADAPTER_SCHEMA,
    exitId: "authenticated_browser",
    adapterId: "authenticated_browser_evidence_adapter",
    purpose: "Authenticated browser session evidence for live UI exits.",
    source: "authenticated_browser_receipt",
    evidencePointers: [
      "browser_session_receipt",
      "authenticated_screenshot_hash",
      "dom_text_extraction_receipt",
      "exit_click_path_receipt",
    ],
    requiredForFullExercise: [
      "browser_session_receipt",
      "authenticated_screenshot_hash",
      "dom_text_extraction_receipt",
      "exit_click_path_receipt",
    ],
    whenAbsent: "not_exercised",
    opensTruth: false,
    inventForbidden: true,
    receiptSchemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    notes:
      "Browser evidence is a future adapter; ESA packets cannot exercise it. Missing → not_exercised.",
  },
] as const;

export function schemaForExit(exitId: MultiExitId): ExitAdapterSchema {
  const found = EXIT_ADAPTER_SCHEMAS.find((s) => s.exitId === exitId);
  if (!found) {
    throw new Error(`No exit adapter schema for ${exitId}`);
  }
  return found;
}

export function adapterIdForExit(exitId: MultiExitId): string {
  return schemaForExit(exitId).adapterId;
}
