/**
 * Blinded human disposition import / validation.
 * Blank or unverified rows never produce rates. Rates use explicit denominators.
 */

import fs from "node:fs";
import type { HumanRateKnowledge } from "./types";

export type HumanDispositionRow = {
  findingId: string;
  textHash: string;
  /** confirmed_defect | detector_false_positive | needs_human_review | unresolved | null */
  disposition: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  blinded: boolean;
  notes?: string | null;
};

export type HumanDispositionBatch = {
  schemaVersion: "1.0.0";
  batchId: string;
  rows: HumanDispositionRow[];
};

export function isValidReviewedRow(row: HumanDispositionRow): boolean {
  if (!row.blinded) return false;
  if (!row.reviewer || !row.reviewedAt) return false;
  if (!row.disposition) return false;
  if (row.disposition === "needs_human_review") return false;
  return ["confirmed_defect", "detector_false_positive", "unresolved"].includes(
    row.disposition,
  );
}

export function loadHumanDispositionBatch(filePath: string): HumanDispositionBatch {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as HumanDispositionBatch;
}

export function deriveHumanRateKnowledge(
  batches: HumanDispositionBatch[],
): HumanRateKnowledge {
  const rows = batches.flatMap((b) => b.rows);
  const blankOrUnverified = rows.filter((r) => !isValidReviewedRow(r)).length;
  const reviewed = rows.filter(isValidReviewedRow);
  if (!reviewed.length) {
    return {
      humanConfirmationRate: null,
      detectorFalsePositiveRate: null,
      knowledgeState: "unavailable",
      reviewedSampleCount: 0,
      confirmedDefectCount: 0,
      detectorFalsePositiveCount: 0,
      blankOrUnverifiedCount: blankOrUnverified + reviewed.length,
      reviewerIds: [],
      denominators: {
        reviewedSamples: 0,
        dispositionedSamples: 0,
      },
    };
  }

  const confirmed = reviewed.filter((r) => r.disposition === "confirmed_defect").length;
  const fps = reviewed.filter((r) => r.disposition === "detector_false_positive").length;
  const dispositioned = confirmed + fps; // rate denominators among defect-vs-FP labels
  const reviewerIds = [...new Set(reviewed.map((r) => r.reviewer!).filter(Boolean))];

  return {
    humanConfirmationRate: reviewed.length ? confirmed / reviewed.length : null,
    detectorFalsePositiveRate: dispositioned > 0 ? fps / dispositioned : null,
    knowledgeState: "reviewed_samples",
    reviewedSampleCount: reviewed.length,
    confirmedDefectCount: confirmed,
    detectorFalsePositiveCount: fps,
    blankOrUnverifiedCount: blankOrUnverified,
    reviewerIds,
    denominators: {
      reviewedSamples: reviewed.length,
      dispositionedSamples: dispositioned,
    },
  };
}
