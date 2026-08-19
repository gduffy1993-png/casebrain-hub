import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateControlCoverageMap } from "../lib/eval/master3000-quality";

const ROOT = process.cwd();
const PHASE6 = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase6-p1-live-builder-validation",
);
const PHASE7 = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase7-high-risk-coverage-expansion",
);

function readJson<T>(dir: string, name: string): T {
  return JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T;
}

describe("master3000 phase6/7 coverage checkpoint contracts", () => {
  it("keeps liveFailureClusters semantically distinct from human-review observations", () => {
    const stop = readJson<{
      affectedBatchRerun: {
        liveCandidateFailures: number;
        liveFailureClusters: number;
        humanReviewClusters: number;
        semantics?: string;
      };
      classifications: Record<string, number>;
      truthAmbiguousClusters: { caseIds: string[] }[];
      auditorFalsePositiveClusters: { caseIds: string[] }[];
      commitMetadata: { certifiedCommit: string };
    }>(PHASE6, "STOP-FOR-CODEX-REVIEW.json");

    expect(stop.affectedBatchRerun.liveCandidateFailures).toBe(0);
    expect(stop.affectedBatchRerun.liveFailureClusters).toBe(0);
    expect(stop.affectedBatchRerun.humanReviewClusters).toBeGreaterThanOrEqual(0);
    expect(stop.affectedBatchRerun.semantics).toMatch(/humanReviewClusters/i);
    expect(stop.classifications.TRUTH_AMBIGUOUS_REQUIRES_REVIEW).toBe(0);
    expect(stop.classifications.AUDITOR_FALSE_POSITIVE).toBe(1);
    expect(stop.truthAmbiguousClusters.some((c) => c.caseIds.includes("cb-fresh-002-jordan-hale"))).toBe(false);
    expect(stop.auditorFalsePositiveClusters.some((c) => c.caseIds.includes("sim-106"))).toBe(true);
    expect(stop.commitMetadata.certifiedCommit.length).toBeGreaterThan(10);
  });

  it("records material high-risk coverage expansion beyond Phase 6", () => {
    const phase6 = readJson<Parameters<typeof validateControlCoverageMap>[0]>(
      PHASE6,
      "361-CONTROL-COVERAGE-MAP-AFTER.json",
    );
    const phase7 = readJson<Parameters<typeof validateControlCoverageMap>[0]>(
      PHASE7,
      "361-CONTROL-COVERAGE-MAP-AFTER.json",
    );
    const stop = readJson<{
      coverageBeforeAfter: { before: { evaluated: number }; after: { evaluated: number } };
      newlyEvaluatedControlIds: string[];
      full3000RunStarted: boolean;
      candidateFailures: number;
    }>(PHASE7, "STOP-FOR-CODEX-REVIEW.json");

    expect(validateControlCoverageMap(phase6)).toEqual([]);
    expect(validateControlCoverageMap(phase7)).toEqual([]);
    expect(phase6.summary.evaluated).toBe(12);
    expect(phase7.summary.evaluated).toBeGreaterThanOrEqual(40);
    expect(stop.coverageBeforeAfter.after.evaluated).toBe(phase7.summary.evaluated);
    expect(stop.newlyEvaluatedControlIds.length).toBeGreaterThanOrEqual(25);
    expect(stop.candidateFailures).toBe(0);
    expect(stop.full3000RunStarted).toBe(false);
    expect(stop.newlyEvaluatedControlIds).toEqual(
      expect.arrayContaining([
        "MAA-PARTIES-ATTRIBUTION",
        "MAA-CHRONOLOGY-HEARING",
        "MAA2-EVS-01-DIMENSION-SEPARATION",
        "MAA2-SEC-01-PROMPT-INJECTION-DOCS",
        "MAA2-SEC-08-TENANT-ISOLATION",
      ]),
    );
  });
});
