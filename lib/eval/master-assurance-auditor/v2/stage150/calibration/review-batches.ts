/**
 * Calibration review batches — max 50 unique strings; human dispositions blank.
 */

import crypto from "node:crypto";
import type { CalibrationCandidate } from "./blind-runner";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export type ReviewBatchItem = {
  textHash: string;
  templateHash: string;
  text: string;
  controlId: string;
  rootCauseFamily: string;
  severity: "candidate_defect" | "human_review_required" | "unresolved" | "other";
  audience: "solicitor_visible" | "structural" | "unknown";
  exit: string | null;
  caseFamily: string | null;
  candidateClass: string;
  occurrences: Array<{
    caseId: string;
    cohort: "A" | "B";
    surface: string;
    candidateId: string;
  }>;
  humanReviewDisposition: null;
  humanReviewer: null;
};

function severityOf(c: CalibrationCandidate): ReviewBatchItem["severity"] {
  if (c.candidateClass === "candidate_defect") return "candidate_defect";
  if (c.candidateClass === "human_review_required") return "human_review_required";
  if (c.candidateClass === "unresolved") return "unresolved";
  return "other";
}

function rootCause(c: CalibrationCandidate): string {
  const parts = c.controlId.split("-");
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : c.controlId;
}

export function buildCalibrationReviewBatches(args: {
  candidates: CalibrationCandidate[];
  caseFamilyById: Record<string, string | null>;
  maxPerBatch?: number;
}): {
  batches: ReviewBatchItem[][];
  indexMarkdown: string;
  uniqueStringCount: number;
} {
  const max = args.maxPerBatch ?? 50;
  // Prefer non-duplicate primary findings for review
  const primary = args.candidates.filter((c) => !c.duplicateOfCandidateId);
  const byExact = new Map<string, ReviewBatchItem>();

  for (const c of primary) {
    const key = c.wordingHash;
    const existing = byExact.get(key);
    if (existing) {
      existing.occurrences.push({
        caseId: c.caseId,
        cohort: c.cohort,
        surface: c.surface,
        candidateId: c.candidateId,
      });
      continue;
    }
    byExact.set(key, {
      textHash: c.wordingHash,
      templateHash: c.normalisedTemplateHash,
      text: c.exactWording.slice(0, 2000),
      controlId: c.controlId,
      rootCauseFamily: rootCause(c),
      severity: severityOf(c),
      audience: c.surface.includes("fiveAnswers") || c.surface.includes("courtNote")
        ? "solicitor_visible"
        : "structural",
      exit: c.exitId,
      caseFamily: args.caseFamilyById[c.caseId] ?? null,
      candidateClass: c.candidateClass,
      occurrences: [
        {
          caseId: c.caseId,
          cohort: c.cohort,
          surface: c.surface,
          candidateId: c.candidateId,
        },
      ],
      humanReviewDisposition: null,
      humanReviewer: null,
    });
  }

  // Group sort: control → root-cause → severity → exit → case family → occurrence count
  const items = [...byExact.values()].sort((a, b) => {
    const keys = [
      a.controlId.localeCompare(b.controlId),
      a.rootCauseFamily.localeCompare(b.rootCauseFamily),
      a.severity.localeCompare(b.severity),
      (a.exit ?? "").localeCompare(b.exit ?? ""),
      (a.caseFamily ?? "").localeCompare(b.caseFamily ?? ""),
      b.occurrences.length - a.occurrences.length,
    ];
    return keys.find((k) => k !== 0) ?? 0;
  });

  const batches: ReviewBatchItem[][] = [];
  for (let i = 0; i < items.length; i += max) batches.push(items.slice(i, i + max));

  const indexMarkdown = [
    "# Stage-150 calibration — review batches",
    "",
    `Unique exact strings: ${items.length}`,
    `Batches: ${batches.length} (max ${max}/batch)`,
    "Human disposition fields remain blank.",
    "",
    ...batches.map(
      (b, i) => `- batch-${String(i + 1).padStart(3, "0")}.json — ${b.length} unique strings`,
    ),
    "",
  ].join("\n");

  return { batches, indexMarkdown, uniqueStringCount: items.length };
}

void sha256;
