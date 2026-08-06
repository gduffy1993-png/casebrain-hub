/**
 * Batch-7 honest named-control receipts for EVS-01 / ATR-01.
 *
 * Honesty rules:
 * - applicable unit count ≠ case count;
 * - cases with zero applicable units are not_exercised (not partially_exercised);
 * - ATR-01 applicable units = other_defendant_only rows only.
 */

import crypto from "node:crypto";
import type { Stage150HandlerDef } from "./detector-registry";
import type { Stage150Hit } from "./detectors";
import {
  collectExactPrerequisiteEvidence,
  missingPrerequisite,
} from "./eligibility";
import type { SourceLeaf } from "../every-word/independent-leaf-inventory";

export type Batch7NamedExerciseStatus = "partially_exercised" | "not_exercised";

export type Batch7HonestExerciseReceipt = {
  caseId: string;
  controlId: string;
  probeEligible: boolean;
  probeMissingInputReason: string | null;
  namedControlExerciseStatus: Batch7NamedExerciseStatus;
  namedControlMissingInputReason: string | null;
  exactPrerequisiteEvidenceRefs: string[];
  /** Structured units inspected for this control (not case count). */
  applicableEvidenceRowCount: number;
  /** True only when applicableEvidenceRowCount > 0. */
  applicableCase: boolean;
  inspectedFieldReferences: Array<{
    ref: string;
    path: string;
    valueSha256: string;
    summary: string;
  }>;
  findingCount: number;
  hitCount: number;
  findingCodes: string[];
  honestyNote: string;
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function summarize(v: unknown, max = 80): string {
  if (v == null) return "null";
  if (typeof v === "string") return v.length <= max ? v : `${v.slice(0, max)}…`;
  return String(v);
}

export function buildBatch7HonestReceipt(args: {
  caseId: string;
  handler: Stage150HandlerDef;
  output: Record<string, unknown>;
  leaves: SourceLeaf[];
  hits: Stage150Hit[];
}): Batch7HonestExerciseReceipt {
  const { caseId, handler, output, leaves, hits } = args;
  const probeMissing = missingPrerequisite(handler, output, leaves, "probe");
  const namedMissing = missingPrerequisite(handler, output, leaves, "named");
  const refs = handler.exactPrerequisiteEvidenceRefs ?? [...handler.requiredInputs];
  const evidence = collectExactPrerequisiteEvidence(refs, output, leaves);

  let applicableEvidenceRowCount = 0;
  const inspected: Batch7HonestExerciseReceipt["inspectedFieldReferences"] = [];

  if (handler.controlId === "MAA2-EVS-01-DIMENSION-SEPARATION") {
    const five = arr(output.fiveAnswersEvidenceRows);
    applicableEvidenceRowCount = five.length;
    five.forEach((row, i) => {
      for (const field of ["existence", "reliability"] as const) {
        const val = String(row[field] ?? "");
        inspected.push({
          ref: `/fiveAnswersEvidenceRows/*/${field}`,
          path: `/fiveAnswersEvidenceRows/${i}/${field}`,
          valueSha256: sha256(val),
          summary: summarize(val),
        });
      }
    });
  } else if (handler.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION") {
    const five = arr(output.fiveAnswersEvidenceRows);
    const applicable = five.filter(
      (r) => String(r.existence ?? "").toLowerCase() === "other_defendant_only",
    );
    applicableEvidenceRowCount = applicable.length;
    if (applicableEvidenceRowCount > 0) {
      five.forEach((row, i) => {
        if (String(row.existence ?? "").toLowerCase() !== "other_defendant_only") return;
        for (const field of ["existence", "label"] as const) {
          const val = String(row[field] ?? "");
          inspected.push({
            ref: `/fiveAnswersEvidenceRows/*/${field}`,
            path: `/fiveAnswersEvidenceRows/${i}/${field}`,
            valueSha256: sha256(val),
            summary: summarize(val),
          });
        }
      });
      const gaps = (output.warningsAndGaps ?? {}) as Record<string, unknown>;
      const dno = arr(gaps.doNotOverstate);
      dno.forEach((t, i) => {
        const val = String(t ?? "");
        inspected.push({
          ref: "/warningsAndGaps/doNotOverstate",
          path: `/warningsAndGaps/doNotOverstate/${i}`,
          valueSha256: sha256(val),
          summary: summarize(val),
        });
      });
      const court = String(((output.courtNote ?? {}) as Record<string, unknown>).text ?? "");
      inspected.push({
        ref: "/courtNote/text",
        path: "/courtNote/text",
        valueSha256: sha256(court),
        summary: summarize(court),
      });
    }
  }

  const applicableCase = applicableEvidenceRowCount > 0;
  const namedControlExerciseStatus: Batch7NamedExerciseStatus =
    !applicableCase || namedMissing || !evidence.ok ? "not_exercised" : "partially_exercised";

  const namedControlMissingInputReason = !applicableCase
    ? handler.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION"
      ? "no_applicable_other_defendant_only_units"
      : "missing_or_empty:/fiveAnswersEvidenceRows"
    : namedMissing ??
      (!evidence.ok ? `missing:exactPrerequisiteEvidenceRefs:${evidence.missingRefs.join(",")}` : null);

  return {
    caseId,
    controlId: handler.controlId,
    probeEligible: probeMissing == null,
    probeMissingInputReason: probeMissing,
    namedControlExerciseStatus,
    namedControlMissingInputReason:
      namedControlExerciseStatus === "not_exercised" ? namedControlMissingInputReason : null,
    exactPrerequisiteEvidenceRefs: refs,
    applicableEvidenceRowCount,
    applicableCase,
    inspectedFieldReferences: inspected,
    findingCount: hits.length,
    hitCount: hits.length,
    findingCodes: hits.map((h) => h.findingCode),
    honestyNote:
      namedControlExerciseStatus === "not_exercised"
        ? `namedControl=not_exercised (${namedControlMissingInputReason}); applicableUnits=0. probeEligible=${probeMissing == null} with hitCount=${hits.length} is not proof of named exercise. Unit count must not be conflated with case count.`
        : `namedControl=partially_exercised; applicableUnits=${applicableEvidenceRowCount}; applicableCase=true; inspectedFields=${inspected.length}; findingCount=${hits.length}. Zero findings ≠ programme PASS.`,
  };
}
