/**
 * MAA V2 multi-exit adapter schemas.
 *
 * Foundation only: schemas + capability contracts for view / copy / export /
 * api / pdf / composed_prose / authenticated_browser.
 *
 * Never invents absent exits. Missing exits → precise not_exercised receipts.
 * Does not touch the central detector registry, readiness gate, or live app.
 */

export const MULTI_EXIT_ADAPTER_SCHEMA = "maa-v2-multi-exit-adapter@1.0.0" as const;
export const MULTI_EXIT_RECEIPT_SCHEMA = "maa-v2-exit-adapter-receipt@1.0.0" as const;
export const MULTI_EXIT_CAPABILITY_SCHEMA = "maa-v2-exit-capability-check@1.0.0" as const;

export const BASELINE_COMMIT = "17361223248b41d719c8de2b98c1eaf2cb4125f6" as const;

/** Exit slots covered by this foundation (includes browser evidence). */
export type MultiExitId =
  | "view"
  | "copy"
  | "export"
  | "api"
  | "pdf"
  | "composed_prose"
  | "authenticated_browser";

export const MULTI_EXIT_IDS: readonly MultiExitId[] = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
  "authenticated_browser",
] as const;

export type ExitCapabilityStatus =
  | "exercisable"
  | "partial_fields_only"
  | "not_exercised";

export type ExitEvidenceSource =
  | "casebrain-output.json"
  | "authenticated_browser_receipt"
  | "absent";

/**
 * Declared schema for one exit adapter.
 * `evidencePointers` are packet-local JSON pointers (or named receipt artefacts)
 * that must be observed — never inferred.
 */
export type ExitAdapterSchema = {
  schemaVersion: typeof MULTI_EXIT_ADAPTER_SCHEMA;
  exitId: MultiExitId;
  adapterId: string;
  purpose: string;
  source: ExitEvidenceSource;
  /** Pointers / artefact names that evidence this exit when present. */
  evidencePointers: string[];
  /** Additional artefacts required for full (non-partial) exercise. */
  requiredForFullExercise: string[];
  whenAbsent: "not_exercised";
  opensTruth: false;
  inventForbidden: true;
  receiptSchemaVersion: typeof MULTI_EXIT_RECEIPT_SCHEMA;
  notes: string;
};

/**
 * Capability-check result for one exit against one packet output.
 * Status is derived only from observed pointers — never invented.
 */
export type ExitCapabilityCheck = {
  schemaVersion: typeof MULTI_EXIT_CAPABILITY_SCHEMA;
  exitId: MultiExitId;
  adapterId: string;
  status: ExitCapabilityStatus;
  presentEvidencePointers: string[];
  missingEvidencePointers: string[];
  missingFullExerciseArtefacts: string[];
  missingAdapter: string | null;
  note: string;
};

/**
 * Per-case / per-exit receipt. Absent exits produce status=not_exercised with
 * a precise missingAdapter; never pass.
 */
export type ExitAdapterReceipt = {
  schemaVersion: typeof MULTI_EXIT_RECEIPT_SCHEMA;
  exitId: MultiExitId;
  adapterId: string;
  caseId: string;
  status: ExitCapabilityStatus;
  presentEvidencePointers: string[];
  missingEvidencePointers: string[];
  missingFullExerciseArtefacts: string[];
  missingAdapter: string | null;
  /** Set when the exit cannot be exercised from available evidence. */
  verdict: "not_exercised" | null;
  note: string;
  neverPassOnAbsence: true;
  invented: false;
  opensTruth: false;
};

export type ExitContractKind = "positive" | "negative" | "unavailable";

export type ExitAdapterContract = {
  contractId: string;
  exitId: MultiExitId;
  kind: ExitContractKind;
  description: string;
  /** Fixture output fragment used by the contract runner. */
  fixtureOutput: Record<string, unknown>;
  /**
   * Structured artefact receipts for full-exit exercise tests.
   * Name-only lists are forbidden — use ExitArtefactReceipt fields.
   */
  artefactReceipts?: readonly {
    artefactType: string;
    contentHash: string;
    schemaVersion: string;
    sourceCaptureRef: string;
    capturedAt: string;
    runId: string;
  }[];
  /** @deprecated ignored — name-only never exercises */
  observedArtefacts?: readonly string[];
  expectedStatus: ExitCapabilityStatus;
  expectedVerdict: "not_exercised" | null;
  mustIncludePointers?: string[];
  mustNotInventExit?: boolean;
};
