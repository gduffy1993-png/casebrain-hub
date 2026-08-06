/**
 * Exit-adapter receipt builders and validators.
 * Missing exits → precise not_exercised receipts. Never pass on absence.
 */

import { checkExitCapability, type ExitEvidenceBag } from "./capability";
import { schemaForExit } from "./registry";
import {
  MULTI_EXIT_IDS,
  MULTI_EXIT_RECEIPT_SCHEMA,
  type ExitAdapterReceipt,
  type ExitCapabilityCheck,
  type MultiExitId,
} from "./schemas";

export type ReceiptValidationIssue = {
  code:
    | "schema_mismatch"
    | "invented_flag"
    | "pass_on_absence"
    | "status_verdict_mismatch"
    | "missing_adapter_required"
    | "opens_truth"
    | "exit_unknown";
  detail: string;
};

export type ReceiptValidationResult = {
  ok: boolean;
  issues: ReceiptValidationIssue[];
};

function verdictForStatus(
  status: ExitCapabilityCheck["status"],
): ExitAdapterReceipt["verdict"] {
  if (status === "not_exercised") return "not_exercised";
  // partial_fields_only is still an honest partial exercise of metadata — not a pass claim.
  return null;
}

export function buildExitReceipt(input: {
  caseId: string;
  exitId: MultiExitId;
  output: Record<string, unknown>;
  bag?: ExitEvidenceBag;
}): ExitAdapterReceipt {
  const check = checkExitCapability(input.exitId, input.output, input.bag);
  return {
    schemaVersion: MULTI_EXIT_RECEIPT_SCHEMA,
    exitId: check.exitId,
    adapterId: check.adapterId,
    caseId: input.caseId,
    status: check.status,
    presentEvidencePointers: check.presentEvidencePointers,
    missingEvidencePointers: check.missingEvidencePointers,
    missingFullExerciseArtefacts: check.missingFullExerciseArtefacts,
    missingAdapter: check.missingAdapter,
    verdict: verdictForStatus(check.status),
    note: check.note,
    neverPassOnAbsence: true,
    invented: false,
    opensTruth: false,
  };
}

export function buildAllExitReceipts(input: {
  caseId: string;
  output: Record<string, unknown>;
  bag?: ExitEvidenceBag;
}): ExitAdapterReceipt[] {
  return MULTI_EXIT_IDS.map((exitId) =>
    buildExitReceipt({ caseId: input.caseId, exitId, output: input.output, bag: input.bag }),
  );
}

/**
 * Validate a receipt object. Rejects invented exits, pass-on-absence, and
 * missingAdapter omissions when status is not_exercised.
 */
export function validateExitReceipt(receipt: unknown): ReceiptValidationResult {
  const issues: ReceiptValidationIssue[] = [];

  if (receipt == null || typeof receipt !== "object") {
    return { ok: false, issues: [{ code: "schema_mismatch", detail: "Receipt is not an object." }] };
  }

  const r = receipt as Record<string, unknown>;

  if (r.schemaVersion !== MULTI_EXIT_RECEIPT_SCHEMA) {
    issues.push({
      code: "schema_mismatch",
      detail: `Expected schemaVersion ${MULTI_EXIT_RECEIPT_SCHEMA}, got ${String(r.schemaVersion)}`,
    });
  }

  const exitId = r.exitId as MultiExitId;
  if (!MULTI_EXIT_IDS.includes(exitId)) {
    issues.push({ code: "exit_unknown", detail: `Unknown exitId: ${String(r.exitId)}` });
  } else {
    const schema = schemaForExit(exitId);
    if (r.adapterId !== schema.adapterId) {
      issues.push({
        code: "schema_mismatch",
        detail: `adapterId mismatch: expected ${schema.adapterId}, got ${String(r.adapterId)}`,
      });
    }
  }

  if (r.invented !== false) {
    issues.push({ code: "invented_flag", detail: "invented must be false — never invent exits." });
  }

  if (r.opensTruth !== false) {
    issues.push({ code: "opens_truth", detail: "opensTruth must be false." });
  }

  if (r.neverPassOnAbsence !== true) {
    issues.push({
      code: "pass_on_absence",
      detail: "neverPassOnAbsence must be true.",
    });
  }

  if (r.status === "not_exercised") {
    if (r.verdict !== "not_exercised") {
      issues.push({
        code: "status_verdict_mismatch",
        detail: "status=not_exercised requires verdict=not_exercised.",
      });
    }
    if (r.missingAdapter == null || String(r.missingAdapter).trim() === "") {
      issues.push({
        code: "missing_adapter_required",
        detail: "not_exercised receipts must name missingAdapter precisely.",
      });
    }
    // Explicit guard: never allow a pass-like claim (defensive against malformed receipts)
    if (String(r.verdict) === "pass" || String(r.status) === "pass") {
      issues.push({
        code: "pass_on_absence",
        detail: "Unavailable exit must never be pass.",
      });
    }
  }

  if (r.status === "partial_fields_only") {
    if (!Array.isArray(r.missingFullExerciseArtefacts) || r.missingFullExerciseArtefacts.length === 0) {
      issues.push({
        code: "schema_mismatch",
        detail: "partial_fields_only must list missingFullExerciseArtefacts.",
      });
    }
    if (r.missingAdapter == null || String(r.missingAdapter).trim() === "") {
      issues.push({
        code: "missing_adapter_required",
        detail: "partial_fields_only must name the missing full-exercise adapter/artefact.",
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validateAllExitReceipts(receipts: ExitAdapterReceipt[]): ReceiptValidationResult {
  const issues: ReceiptValidationIssue[] = [];
  for (const r of receipts) {
    const v = validateExitReceipt(r);
    for (const issue of v.issues) {
      issues.push({ ...issue, detail: `[${r.exitId}] ${issue.detail}` });
    }
  }
  const seen = new Set(receipts.map((r) => r.exitId));
  for (const id of MULTI_EXIT_IDS) {
    if (!seen.has(id)) {
      issues.push({
        code: "schema_mismatch",
        detail: `Missing receipt for exit ${id}`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}
