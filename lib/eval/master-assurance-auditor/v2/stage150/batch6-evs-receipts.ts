/**
 * Batch-6 honest named-control receipts for EVS-02 / EVS-03.
 * probeEligible + hitCount=0 alone is insufficient proof of named exercise.
 */

import crypto from "node:crypto";
import type { Stage150HandlerDef } from "./detector-registry";
import type { Stage150Hit } from "./detectors";
import {
  collectExactPrerequisiteEvidence,
  missingPrerequisite,
} from "./eligibility";
import type { SourceLeaf } from "../every-word/independent-leaf-inventory";

export type Batch6NamedExerciseStatus = "partially_exercised" | "not_exercised";

export type Batch6InspectedField = {
  ref: string;
  path: string;
  valueSha256: string;
  summary: string;
};

export type Batch6HonestExerciseReceipt = {
  caseId: string;
  controlId: string;
  /** Narrow probe eligibility — not proof of named exercise. */
  probeEligible: boolean;
  probeMissingInputReason: string | null;
  namedControlExerciseStatus: Batch6NamedExerciseStatus;
  namedControlMissingInputReason: string | null;
  exactPrerequisiteEvidenceRefs: string[];
  applicableEvidenceRowCount: number;
  inspectedFieldReferences: Batch6InspectedField[];
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

/**
 * Build an honest EVS-02/EVS-03 receipt. When no applicable structured rows exist,
 * namedControlExerciseStatus is always not_exercised.
 */
export function buildBatch6EvsHonestReceipt(args: {
  caseId: string;
  handler: Stage150HandlerDef;
  output: Record<string, unknown>;
  leaves: SourceLeaf[];
  hits: Stage150Hit[];
}): Batch6HonestExerciseReceipt {
  const { caseId, handler, output, leaves, hits } = args;
  const probeMissing = missingPrerequisite(handler, output, leaves, "probe");
  const namedMissing = missingPrerequisite(handler, output, leaves, "named");
  const refs = handler.exactPrerequisiteEvidenceRefs ?? [...handler.requiredInputs];
  const evidence = collectExactPrerequisiteEvidence(refs, output, leaves);

  let applicableEvidenceRowCount = 0;
  const inspected: Batch6InspectedField[] = [];

  if (handler.controlId === "MAA2-EVS-02-STATE-ENUM") {
    const states = arr(output.evidenceStates);
    applicableEvidenceRowCount = states.length;
    states.forEach((row, i) => {
      const val = String(row.inferredSourceState ?? "");
      inspected.push({
        ref: "/evidenceStates/*/inferredSourceState",
        path: `/evidenceStates/${i}/inferredSourceState`,
        valueSha256: sha256(val),
        summary: summarize(val),
      });
    });
  } else if (handler.controlId === "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED") {
    const five = arr(output.fiveAnswersEvidenceRows);
    applicableEvidenceRowCount = five.length;
    five.forEach((row, i) => {
      for (const field of ["existence", "reliability", "note"] as const) {
        const val = String(row[field] ?? "");
        inspected.push({
          ref: `/fiveAnswersEvidenceRows/*/${field}`,
          path: `/fiveAnswersEvidenceRows/${i}/${field}`,
          valueSha256: sha256(val),
          summary: summarize(val),
        });
      }
    });
  }

  const noApplicableRows = applicableEvidenceRowCount === 0;
  const namedControlExerciseStatus: Batch6NamedExerciseStatus =
    noApplicableRows || namedMissing || !evidence.ok ? "not_exercised" : "partially_exercised";

  const namedControlMissingInputReason = noApplicableRows
    ? handler.controlId === "MAA2-EVS-02-STATE-ENUM"
      ? "missing_or_empty:/evidenceStates"
      : "missing_or_empty:/fiveAnswersEvidenceRows"
    : namedMissing ??
      (!evidence.ok ? `missing:exactPrerequisiteEvidenceRefs:${evidence.missingRefs.join(",")}` : null);

  return {
    caseId,
    controlId: handler.controlId,
    probeEligible: probeMissing == null,
    probeMissingInputReason: probeMissing,
    namedControlExerciseStatus,
    namedControlMissingInputReason,
    exactPrerequisiteEvidenceRefs: refs,
    applicableEvidenceRowCount,
    inspectedFieldReferences: inspected,
    findingCount: hits.length,
    hitCount: hits.length,
    findingCodes: hits.map((h) => h.findingCode),
    honestyNote:
      namedControlExerciseStatus === "not_exercised"
        ? `namedControl=not_exercised (${namedControlMissingInputReason ?? "no applicable rows"}). probeEligible=${probeMissing == null} with hitCount=${hits.length} is not proof of named exercise.`
        : `namedControl=partially_exercised; applicableRows=${applicableEvidenceRowCount}; inspectedFields=${inspected.length}; findingCount=${hits.length}. Zero findings ≠ programme PASS.`,
  };
}
