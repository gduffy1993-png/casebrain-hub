/**
 * Permanent Assurance Engine control types.
 * Distinct from solicitor-facing ProofReceipt (lib/criminal/proof-receipt).
 */

export type ControlStatus = "PASS" | "PARTIAL" | "FAIL" | "NOT_CHECKED";

export type AssuranceControlId =
  | "AUD-PROV-UNKNOWN-PAGE"
  | "AUD-PROV-FALSE-PAGE-DEFAULT"
  | "AUD-PROV-SOURCE-VS-COMPILED-PAGE"
  | "AUD-DOC-OPERATIVE-PRECEDENCE"
  | "AUD-DOC-UPLOAD-FALLBACK"
  | "AUD-DOC-DETERMINISTIC-TIE"
  | "AUD-DOC-SILENT-SUPERSESSION";

export type AssuranceExitMode = "view" | "copy" | "export" | "api" | "pdf" | "composed_prose";

export type AssuranceControl = {
  id: AssuranceControlId;
  label: string;
  intent: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affectedExits: AssuranceExitMode[];
  likelyFiles: string[];
};

/**
 * Proof receipt emitted by every permanent control.
 * PARTIAL = invariant holds on some exits but not all mandatory ones.
 * FAIL = violated on at least one mandatory exit.
 * NOT_CHECKED requires an explicit reason.
 */
export type ControlProofReceipt = {
  runId: string;
  controlId: AssuranceControlId;
  status: ControlStatus;
  severity: AssuranceControl["severity"];
  checkedAt: string;
  inputState: Record<string, unknown>;
  expectedResult: string;
  actualResult: string;
  affectedExits: AssuranceExitMode[];
  notCheckedReason: string | null;
  detail: string;
};
