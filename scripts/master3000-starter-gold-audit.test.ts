import { describe, expect, it } from "vitest";
import {
  validateControlCoverageMap,
  validateHoldoutManifest,
  validateStarterGoldManifest,
} from "../lib/eval/master3000-quality";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase5-starter-gold-audit",
);

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(ARTIFACT_ROOT, name), "utf8")) as T;
}

describe("master3000 starter Gold audit checkpoint", () => {
  it("uses a real starter Gold denominator, not current CaseBrain output as truth", () => {
    const manifest = readJson<Parameters<typeof validateStarterGoldManifest>[0]>("STARTER-GOLD-MANIFEST.json");
    expect(validateStarterGoldManifest(manifest)).toEqual([]);
    expect(manifest.matters.length).toBeGreaterThanOrEqual(25);
    expect(manifest.matters.length).toBeLessThanOrEqual(50);
    expect(manifest.matters.every((matter) => matter.truthSourceType === "independent_truth_key")).toBe(true);
    expect(manifest.nonClaims.casebrainOutputUsedAsTruth).toBe(false);
  });

  it("keeps holdout disjoint and unaudited", () => {
    const gold = readJson<Parameters<typeof validateStarterGoldManifest>[0]>("STARTER-GOLD-MANIFEST.json");
    const holdout = readJson<Parameters<typeof validateHoldoutManifest>[1]>("HOLDOUT-CANDIDATE-MANIFEST.json");
    expect(validateHoldoutManifest(gold, holdout)).toEqual([]);
    expect(holdout.matters.length).toBeGreaterThanOrEqual(50);
    expect(holdout.nonClaims.audited).toBe(false);
  });

  it("reconciles the 361-control coverage map honestly", () => {
    const map = readJson<Parameters<typeof validateControlCoverageMap>[0]>("361-CONTROL-COVERAGE-MAP.json");
    expect(validateControlCoverageMap(map)).toEqual([]);
    expect(map.totalControls).toBe(361);
    expect(map.rows).toHaveLength(361);
    expect(map.summary.evaluated).toBeGreaterThan(0);
    expect(map.nonClaims.all361Exercised).toBe(false);
  });

  it("clusters failures without pretending P0/P1 were auto-fixed case-by-case", () => {
    const stop = readJson<{
      full3000RunStarted: boolean;
      p0p1SharedFixesApplied: { id: string }[];
      candidateClusters: { total: number; p0p1: number };
      failuresBySeverity: Record<string, number>;
    }>("STOP-FOR-CODEX-REVIEW.json");
    expect(stop.full3000RunStarted).toBe(false);
    expect(Array.isArray(stop.p0p1SharedFixesApplied)).toBe(true);
    expect(stop.p0p1SharedFixesApplied.map((fix) => fix.id)).toContain("AUDITOR-GUARDRAIL-TEXT-NOT-ASSERTION");
    expect(stop.failuresBySeverity.P0 ?? 0).toBe(0);
    expect(stop.candidateClusters.total).toBeGreaterThanOrEqual(stop.candidateClusters.p0p1);
  });

  it("keeps known auditor false-positive classes out of the rerun", () => {
    const clusters = readJson<{ rootCauseCluster: string | null; key: string }[]>("FAILURE-CLUSTERS.json");
    expect(clusters.some((cluster) => cluster.rootCauseCluster === "served_mg6_became_chase")).toBe(false);
    expect(clusters.some((cluster) => cluster.rootCauseCluster === "unsupported_medical_promoted")).toBe(false);
    expect(clusters.some((cluster) => cluster.key.includes("P0|"))).toBe(false);
  });
});
