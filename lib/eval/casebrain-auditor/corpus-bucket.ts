/**
 * Corpus buckets for real-case auditor scoring.
 * A = firm-ready real work, B = pilot-visible demo matters, C = eval/stress/lab.
 */
import {
  isEvalOrStressTestCase,
  isInternalPilotTestCaseTitle,
  isPilotDemoAllowlistMatter,
  isPilotReadyCase,
  type PilotCaseFilterRow,
} from "@/lib/pilot-mode";
import type { AuditorIssue, CorpusBucket, ReleaseGate } from "./types";

export type { CorpusBucket };

const LAB_CASE_TITLE_RE =
  /\b(CB-STAGE|CB-INJECT|CB-NOSAFE|CB-EXHIBIT|CB-PRESSURE|CB-INTERVIEW|CB-DISC|CB-THIN|CB-COLLISION|CB-TRAP|CB-GOLD|CB-MESSY|CB-AA2?|CB-Z|CB-TEST|Pack\s+[A-Z]{1,2}\s*—\s*Case)\b/i;

export type CorpusBucketInput = PilotCaseFilterRow & {
  caseId?: string;
  documentCount?: number;
};

export function isLabStressCaseTitle(title: string | null | undefined): boolean {
  const t = title?.trim() ?? "";
  return t.length > 0 && LAB_CASE_TITLE_RE.test(t);
}

/** Classify a real/org case row for auditor production vs lab scoring. */
export function classifyCorpusBucket(row: CorpusBucketInput): CorpusBucket {
  if (isEvalOrStressTestCase(row)) return "C";
  if (isLabStressCaseTitle(row.title)) return "C";
  if (isInternalPilotTestCaseTitle(row.title)) return "C";
  if (isPilotDemoAllowlistMatter(row.title)) return "B";
  if (isPilotReadyCase(row)) return "B";
  const docs = row.documentCount ?? 0;
  if (docs > 0) return "A";
  return "C";
}

export function isProductionScoredBucket(bucket: CorpusBucket): boolean {
  return bucket === "A" || bucket === "B";
}

export function bucketLabel(bucket: CorpusBucket): string {
  switch (bucket) {
    case "A":
      return "real_work";
    case "B":
      return "pilot_visible";
    case "C":
      return "lab_eval";
  }
}

/** Release gate for firm/pilot corpus only (excludes lab/eval bucket C). */
export function computeProductionReleaseGate(issues: AuditorIssue[]): ReleaseGate {
  const production = issues.filter((i) => !i.productionExcluded);
  const confirmedBlocking = production.filter((i) => i.releaseBlocking && i.manifestConfirmed);
  if (confirmedBlocking.some((i) => i.severity === "CRITICAL" || i.severity === "HIGH")) {
    return "RED";
  }
  if (
    production.some((i) => !i.manifestConfirmed) ||
    production.some((i) => i.severity === "MEDIUM" || i.severity === "LOW")
  ) {
    return "AMBER";
  }
  return "GREEN";
}

export function summarizeBucketCounts(rows: Array<{ corpusBucket: CorpusBucket }>): Record<CorpusBucket, number> {
  const counts: Record<CorpusBucket, number> = { A: 0, B: 0, C: 0 };
  for (const r of rows) {
    counts[r.corpusBucket] += 1;
  }
  return counts;
}
