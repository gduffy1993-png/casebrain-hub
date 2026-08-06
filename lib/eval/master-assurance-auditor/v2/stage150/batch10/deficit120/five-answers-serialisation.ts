/**
 * Batch-10 Five Answers evidence serialisation invariant.
 *
 * Corpus-harness only: persists genuine production truthMap rows into
 * casebrain-output. Never invents evidence rows from court prose.
 */

import crypto from "node:crypto";

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type { LiveProductionSurfaces } from "@/lib/criminal/canonical-live-surface-adapter";

export const FIVE_ANSWERS_SERIALISATION_INVARIANT =
  "batch10-five-answers-serialisation@1.0.0" as const;

function sha256Json(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Deep-copy rows so later surface mutation cannot empty the persisted bag. */
export function deepCopyFiveAnswersEvidenceRows(
  rows: readonly FiveAnswersEvidenceRow[] | null | undefined,
): FiveAnswersEvidenceRow[] {
  if (!rows || rows.length === 0) return [];
  // JSON round-trip preserves field order and drops non-JSON values — bag must
  // stay byte-comparable to the view truthMap rows at serialisation time.
  return JSON.parse(JSON.stringify(rows)) as FiveAnswersEvidenceRow[];
}

/**
 * Canonical rows for casebrain-output: exact deep copy of the Five Answers
 * truthMap rows that back the view exit. Court note must never seed rows.
 */
export function serializeFiveAnswersEvidenceRowsFromSurfaces(
  surfaces: Pick<LiveProductionSurfaces, "truthMap" | "composedProse">,
): {
  rows: FiveAnswersEvidenceRow[];
  viewRowsSha256: string;
  persistedRowsSha256: string;
  courtNotePresent: boolean;
  inventedFromCourt: false;
} {
  const viewRows = surfaces.truthMap.evidenceState.rows ?? [];
  const rows = deepCopyFiveAnswersEvidenceRows(viewRows);
  const viewRowsSha256 = sha256Json(viewRows);
  const persistedRowsSha256 = sha256Json(rows);
  if (viewRowsSha256 !== persistedRowsSha256) {
    throw new Error(
      "Five Answers serialisation invariant broken: deep-copy hash ≠ view truthMap rows",
    );
  }
  const courtNotePresent = Boolean(surfaces.composedProse.courtLine?.trim());
  // Explicit non-invention: court presence does not add rows when view is empty.
  if (courtNotePresent && viewRows.length === 0 && rows.length !== 0) {
    throw new Error(
      "Five Answers serialisation invariant broken: rows invented while view evidence empty",
    );
  }
  return {
    rows,
    viewRowsSha256,
    persistedRowsSha256,
    courtNotePresent,
    inventedFromCourt: false,
  };
}

/**
 * Align a persisted casebrain-output bag with frozen view-exit rows.
 * Used for corpus rematerialisation without rewriting frozen sources in place.
 */
export function alignCasebrainOutputFiveAnswersWithViewRows(args: {
  casebrainOutput: Record<string, unknown>;
  viewEvidenceRows: readonly FiveAnswersEvidenceRow[] | null | undefined;
}): {
  output: Record<string, unknown>;
  beforeLen: number;
  afterLen: number;
  beforeSha256: string;
  afterSha256: string;
  repaired: boolean;
  inventedFromCourt: false;
} {
  const before = Array.isArray(args.casebrainOutput.fiveAnswersEvidenceRows)
    ? (args.casebrainOutput.fiveAnswersEvidenceRows as FiveAnswersEvidenceRow[])
    : [];
  const after = deepCopyFiveAnswersEvidenceRows(args.viewEvidenceRows);
  const beforeSha256 = sha256Json(before);
  const afterSha256 = sha256Json(after);
  const court = args.casebrainOutput.courtNote as { text?: string } | undefined;
  const courtPresent = Boolean(court?.text?.trim());
  if (courtPresent && after.length === 0 && before.length > 0) {
    // View genuinely empty — do not keep stale manufactured rows.
    // (Defensive; deficit corpus should not invent. Prefer view as authority.)
  }
  if (courtPresent && (args.viewEvidenceRows?.length ?? 0) === 0 && after.length !== 0) {
    throw new Error("align refused: would invent rows from non-view source while court present");
  }
  return {
    output: {
      ...args.casebrainOutput,
      fiveAnswersEvidenceRows: after,
      fiveAnswersSerialisation: {
        invariant: FIVE_ANSWERS_SERIALISATION_INVARIANT,
        alignedFrom: "exits/view/payload.json → truthMap.evidenceState.rows",
        inventedFromCourt: false,
        viewRowsSha256: afterSha256,
      },
    },
    beforeLen: before.length,
    afterLen: after.length,
    beforeSha256,
    afterSha256,
    repaired: beforeSha256 !== afterSha256,
    inventedFromCourt: false,
  };
}

export function fiveAnswersRowsSha256(rows: unknown): string {
  return sha256Json(rows ?? []);
}
