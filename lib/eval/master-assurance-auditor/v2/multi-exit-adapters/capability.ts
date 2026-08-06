/**
 * Capability checks for multi-exit adapters.
 * Probe only fields genuinely present on the packet / structured receipt bag.
 * Never invents an exit from silence. Artefact-name-only bags never exercise.
 */

import { adapterIdForExit, schemaForExit } from "./registry";
import {
  MULTI_EXIT_CAPABILITY_SCHEMA,
  MULTI_EXIT_IDS,
  type ExitCapabilityCheck,
  type ExitCapabilityStatus,
  type MultiExitId,
} from "./schemas";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function readPointer(output: Record<string, unknown>, pointer: string): unknown {
  const parts = pointer.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (p === "*") return cur;
    if (!isPlainObject(cur) && !Array.isArray(cur)) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else {
      cur = cur[p];
    }
  }
  return cur;
}

function nonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** Structured receipt required for non-packet exit artefacts. */
export type ExitArtefactReceipt = {
  artefactType: string;
  contentHash: string;
  schemaVersion: string;
  sourceCaptureRef: string;
  capturedAt: string;
  runId: string;
};

export const EXIT_ARTEFACT_RECEIPT_SCHEMA = "maa-v2-exit-artefact-receipt@1.0.0" as const;
export const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;
export const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Optional evidence bag for non-packet exits (API/PDF/composed/browser/export bytes).
 * Merely listing an artefact name is insufficient — structured receipts required.
 */
export type ExitEvidenceBag = {
  artefacts?: readonly ExitArtefactReceipt[];
  /** @deprecated name-only lists never exercise an exit */
  observedArtefacts?: readonly string[];
};

export type ArtefactReceiptIssue = {
  code:
    | "not_object"
    | "empty_field"
    | "bad_content_hash"
    | "unsupported_schema"
    | "bad_timestamp"
    | "artefact_type_not_allowed"
    | "run_capture_mismatch";
  detail: string;
};

export function validateArtefactReceiptFields(
  a: unknown,
  opts?: { allowedArtefactTypes?: readonly string[] },
): ArtefactReceiptIssue[] {
  const issues: ArtefactReceiptIssue[] = [];
  if (!isPlainObject(a)) {
    return [{ code: "not_object", detail: "Artefact receipt is not an object." }];
  }
  for (const key of [
    "artefactType",
    "contentHash",
    "schemaVersion",
    "sourceCaptureRef",
    "capturedAt",
    "runId",
  ] as const) {
    if (!nonEmptyString(a[key])) {
      issues.push({ code: "empty_field", detail: `Missing/empty ${key}.` });
    }
  }
  if (nonEmptyString(a.contentHash) && !SHA256_HEX_RE.test(String(a.contentHash).trim())) {
    issues.push({
      code: "bad_content_hash",
      detail: "contentHash must be exactly 64 hexadecimal characters (SHA-256).",
    });
  }
  if (nonEmptyString(a.schemaVersion) && String(a.schemaVersion) !== EXIT_ARTEFACT_RECEIPT_SCHEMA) {
    issues.push({
      code: "unsupported_schema",
      detail: `schemaVersion must be ${EXIT_ARTEFACT_RECEIPT_SCHEMA}.`,
    });
  }
  if (nonEmptyString(a.capturedAt)) {
    const ts = String(a.capturedAt).trim();
    if (!ISO_TIMESTAMP_RE.test(ts) || Number.isNaN(Date.parse(ts))) {
      issues.push({ code: "bad_timestamp", detail: "capturedAt must be a valid ISO-8601 timestamp." });
    }
  }
  if (
    opts?.allowedArtefactTypes &&
    nonEmptyString(a.artefactType) &&
    !opts.allowedArtefactTypes.includes(String(a.artefactType))
  ) {
    issues.push({
      code: "artefact_type_not_allowed",
      detail: `artefactType ${String(a.artefactType)} not allowed for this exit.`,
    });
  }
  return issues;
}

export function isValidArtefactReceipt(
  a: unknown,
  opts?: { allowedArtefactTypes?: readonly string[] },
): a is ExitArtefactReceipt {
  return validateArtefactReceiptFields(a, opts).length === 0;
}

/**
 * Required receipt set for an exit must be valid and share the same runId + sourceCaptureRef.
 */
export function validateArtefactReceiptSet(args: {
  artefacts: readonly unknown[];
  requiredTypes: readonly string[];
}): { ok: boolean; issues: ArtefactReceiptIssue[] } {
  const issues: ArtefactReceiptIssue[] = [];
  const byType = new Map<string, ExitArtefactReceipt>();
  for (const raw of args.artefacts) {
    const fieldIssues = validateArtefactReceiptFields(raw, {
      allowedArtefactTypes: args.requiredTypes,
    });
    issues.push(...fieldIssues);
    if (fieldIssues.length === 0 && isPlainObject(raw)) {
      byType.set(String(raw.artefactType), raw as ExitArtefactReceipt);
    }
  }
  for (const t of args.requiredTypes) {
    if (!byType.has(t)) {
      issues.push({ code: "empty_field", detail: `Missing required artefactType ${t}.` });
    }
  }
  const present = args.requiredTypes.map((t) => byType.get(t)).filter(Boolean) as ExitArtefactReceipt[];
  if (present.length >= 2) {
    const run0 = present[0].runId;
    const cap0 = present[0].sourceCaptureRef;
    for (const r of present.slice(1)) {
      if (r.runId !== run0 || r.sourceCaptureRef !== cap0) {
        issues.push({
          code: "run_capture_mismatch",
          detail: "Required receipt set must share the same runId and sourceCaptureRef.",
        });
        break;
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

function namedArtefactValid(
  bag: ExitEvidenceBag | undefined,
  name: string,
  allowedArtefactTypes: readonly string[],
): boolean {
  void bag?.observedArtefacts;
  const named = bag?.artefacts?.find((a) => isPlainObject(a) && String(a.artefactType) === name);
  return Boolean(named && isValidArtefactReceipt(named, { allowedArtefactTypes }));
}

function requiredArtefactsSatisfied(
  bag: ExitEvidenceBag | undefined,
  requiredTypes: readonly string[],
): boolean {
  void bag?.observedArtefacts;
  if (!bag?.artefacts?.length || requiredTypes.length === 0) return false;
  return validateArtefactReceiptSet({ artefacts: bag.artefacts, requiredTypes }).ok;
}

function anySolicitorVisibleNonEmptyString(output: Record<string, unknown>): boolean {
  if (nonEmptyString(readPointer(output, "/courtNote/text"))) return true;

  const dno = readPointer(output, "/warningsAndGaps/doNotOverstate");
  if (Array.isArray(dno) && dno.some((x) => nonEmptyString(x))) return true;

  const chase = readPointer(output, "/warningsAndGaps/chaseItems");
  if (Array.isArray(chase)) {
    for (const it of chase) {
      if (!isPlainObject(it)) continue;
      if (nonEmptyString(it.copySuggestion) || nonEmptyString(it.label)) return true;
    }
  }

  const five = readPointer(output, "/fiveAnswersEvidenceRows");
  if (Array.isArray(five)) {
    for (const row of five) {
      if (!isPlainObject(row)) continue;
      if (
        nonEmptyString(row.label) ||
        nonEmptyString(row.note) ||
        nonEmptyString(row.existence) ||
        nonEmptyString(row.reliability)
      ) {
        return true;
      }
    }
  }

  const states = readPointer(output, "/evidenceStates");
  if (Array.isArray(states)) {
    for (const row of states) {
      if (!isPlainObject(row)) continue;
      if (
        nonEmptyString(row.label) ||
        nonEmptyString(row.existenceLabel) ||
        nonEmptyString(row.evidenceAnchor) ||
        nonEmptyString(row.inferredSourceState)
      ) {
        return true;
      }
    }
  }

  return false;
}

function pointerPresent(output: Record<string, unknown>, pointer: string): boolean {
  if (pointer === "/warningsAndGaps/chaseItems/*/copySuggestion") {
    const items = readPointer(output, "/warningsAndGaps/chaseItems");
    if (!Array.isArray(items)) return false;
    return items.some((it) => isPlainObject(it) && nonEmptyString(it.copySuggestion));
  }

  if (pointer === "/warningsAndGaps/doNotOverstate") {
    const v = readPointer(output, "/warningsAndGaps/doNotOverstate");
    return Array.isArray(v) && v.some((x) => nonEmptyString(x));
  }

  if (pointer === "/fiveAnswersEvidenceRows" || pointer === "/evidenceStates") {
    // Array presence alone is insufficient — require solicitor-visible non-empty string.
    return anySolicitorVisibleNonEmptyString(output) && Array.isArray(readPointer(output, pointer));
  }

  if (pointer === "/courtNote/canCopy") {
    return typeof readPointer(output, "/courtNote/canCopy") === "boolean";
  }

  if (pointer === "/courtNote/text") {
    return nonEmptyString(readPointer(output, "/courtNote/text"));
  }

  if (
    pointer === "/exportVersion/reviewFooter" ||
    pointer === "/exportVersion/sendability" ||
    pointer === "/exportVersion/blockedReason"
  ) {
    const exp = readPointer(output, "/exportVersion");
    const key = pointer.split("/").pop()!;
    return isPlainObject(exp) && key in exp;
  }

  if (!pointer.startsWith("/")) return false;

  const v = readPointer(output, pointer);
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Copy is exercisable only with actual non-empty copy wording:
 * - non-empty courtNote.text with canCopy=true; OR
 * - non-empty copySuggestion.
 * canCopy=true alone is insufficient.
 */
function copyExercisable(output: Record<string, unknown>): boolean {
  const canCopy = readPointer(output, "/courtNote/canCopy") === true;
  const courtText = nonEmptyString(readPointer(output, "/courtNote/text"));
  if (canCopy && courtText) return true;
  return pointerPresent(output, "/warningsAndGaps/chaseItems/*/copySuggestion");
}

/**
 * View requires at least one genuinely solicitor-visible non-empty string.
 * A non-empty evidence array of empty rows is insufficient.
 */
function viewExercisable(output: Record<string, unknown>): boolean {
  return anySolicitorVisibleNonEmptyString(output);
}

function exportPartial(output: Record<string, unknown>): boolean {
  return (
    pointerPresent(output, "/exportVersion/reviewFooter") ||
    pointerPresent(output, "/exportVersion/sendability") ||
    pointerPresent(output, "/exportVersion/blockedReason")
  );
}

export function checkExitCapability(
  exitId: MultiExitId,
  output: Record<string, unknown>,
  bag?: ExitEvidenceBag,
): ExitCapabilityCheck {
  const schema = schemaForExit(exitId);
  const adapterId = adapterIdForExit(exitId);

  if (exitId === "view") {
    const present = schema.evidencePointers.filter((p) => pointerPresent(output, p));
    const missing = schema.evidencePointers.filter((p) => !pointerPresent(output, p));
    const ok = viewExercisable(output);
    return {
      schemaVersion: MULTI_EXIT_CAPABILITY_SCHEMA,
      exitId,
      adapterId,
      status: ok ? "exercisable" : "not_exercised",
      presentEvidencePointers: present,
      missingEvidencePointers: missing,
      missingFullExerciseArtefacts: ok ? [] : schema.requiredForFullExercise,
      missingAdapter: ok ? null : "view_exit_adapter",
      note: ok
        ? "Solicitor-visible non-empty string present on packet."
        : "No solicitor-visible non-empty string — not_exercised (empty arrays insufficient).",
    };
  }

  if (exitId === "copy") {
    const present = schema.evidencePointers.filter((p) => {
      if (p === "/courtNote/canCopy") {
        return readPointer(output, "/courtNote/canCopy") === true;
      }
      return pointerPresent(output, p);
    });
    const ok = copyExercisable(output);
    const missing = schema.evidencePointers.filter((p) => !present.includes(p));
    return {
      schemaVersion: MULTI_EXIT_CAPABILITY_SCHEMA,
      exitId,
      adapterId,
      status: ok ? "exercisable" : "not_exercised",
      presentEvidencePointers: present,
      missingEvidencePointers: missing,
      missingFullExerciseArtefacts: ok ? [] : schema.requiredForFullExercise,
      missingAdapter: ok ? null : "copy_exit_adapter",
      note: ok
        ? "Copy evidenced by (canCopy===true + non-empty courtNote.text) and/or non-empty copySuggestion."
        : "canCopy alone or empty wording insufficient — not_exercised.",
    };
  }

  if (exitId === "export") {
    const present = schema.evidencePointers.filter((p) => pointerPresent(output, p));
    const hasMeta = exportPartial(output);
    const hasFullBytes = requiredArtefactsSatisfied(bag, ["full_export_exit_payload_bytes"]);
    let status: ExitCapabilityStatus = "not_exercised";
    if (hasFullBytes && hasMeta) status = "exercisable";
    else if (hasMeta) status = "partial_fields_only";
    return {
      schemaVersion: MULTI_EXIT_CAPABILITY_SCHEMA,
      exitId,
      adapterId,
      status,
      presentEvidencePointers: present,
      missingEvidencePointers: schema.evidencePointers.filter((p) => !present.includes(p)),
      missingFullExerciseArtefacts: hasFullBytes ? [] : ["full_export_exit_payload_bytes"],
      missingAdapter: status === "exercisable" ? null : "full_export_exit_payload_bytes",
      note:
        status === "exercisable"
          ? "Export metadata and structured full payload receipt both present."
          : status === "partial_fields_only"
            ? "Export metadata fields present; full export payload receipt absent — partial_fields_only."
            : "No exportVersion metadata observed — not_exercised.",
    };
  }

  // Absent-on-ESA exits: api / pdf / composed_prose / authenticated_browser
  const allowed = schema.requiredForFullExercise;
  const present = schema.evidencePointers.filter((p) =>
    p.startsWith("/")
      ? pointerPresent(output, p)
      : namedArtefactValid(bag, p, allowed),
  );
  const missing = schema.evidencePointers.filter((p) => !present.includes(p));
  const requiredOk = requiredArtefactsSatisfied(bag, schema.requiredForFullExercise);
  const ok = missing.length === 0 && present.length > 0 && requiredOk;
  return {
    schemaVersion: MULTI_EXIT_CAPABILITY_SCHEMA,
    exitId,
    adapterId,
    status: ok ? "exercisable" : "not_exercised",
    presentEvidencePointers: present,
    missingEvidencePointers: missing,
    missingFullExerciseArtefacts: ok
      ? []
      : schema.requiredForFullExercise.filter((a) => !namedArtefactValid(bag, a, allowed)),
    missingAdapter: ok ? null : schema.adapterId,
    note: ok
      ? `${exitId} structured artefact receipts observed — exercisable.`
      : `No verified ${exitId} structured receipts — not_exercised (name-only bags ignored; missing adapter: ${schema.adapterId}).`,
  };
}

export function checkAllExitCapabilities(
  output: Record<string, unknown>,
  bag?: ExitEvidenceBag,
): ExitCapabilityCheck[] {
  return MULTI_EXIT_IDS.map((id) => checkExitCapability(id, output, bag));
}
