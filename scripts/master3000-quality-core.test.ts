import { describe, expect, it } from "vitest";
import {
  FAILURE_TAXONOMY,
  HISTORICAL_INVARIANTS,
  assertInvariantRegistry,
  clusterFailures,
  createAuditResult,
  recommendAuditTier,
  summarizeCoverage,
  validateAuditResult,
} from "../lib/eval/master3000-quality";

const base = {
  runId: "phase2-core-smoke",
  commit: "unit-test",
  caseId: "case-001",
  controlId: "CTRL-001",
  invariantId: "CB-HIST-CCTV-NOT-PHONE-PROVENANCE",
  failureClass: "provenance_family_failure" as const,
  severity: "P0" as const,
  evidenceFamily: "cctv",
  surface: "cps_chase" as const,
  sourceReference: { documentId: "MG6", page: 4, limitation: "fixture source reference" },
  expected: "CCTV chase uses CCTV provenance only.",
  actual: "CCTV chase used phone provenance.",
  rootCauseCluster: "wrong-family-provenance",
  disposition: "confirmed_failure" as const,
  coverageStatus: "evaluated" as const,
};

describe("master3000 quality core", () => {
  it("keeps the A-V failure taxonomy complete and unique", () => {
    expect(FAILURE_TAXONOMY).toHaveLength(22);
    expect(new Set(FAILURE_TAXONOMY.map(([code]) => code)).size).toBe(22);
    expect(FAILURE_TAXONOMY.map(([code]) => code)).toEqual(
      "ABCDEFGHIJKLMNOPQRSTUV".split(""),
    );
  });

  it("validates a source-backed P0 audit result envelope", () => {
    const result = createAuditResult(base);
    expect(validateAuditResult(result)).toEqual([]);
  });

  it("rejects a P0/P1 confirmed failure without source reference", () => {
    const result = createAuditResult({
      ...base,
      disposition: "candidate_failure",
    });
    const withoutSource = { ...result, disposition: "confirmed_failure" as const, sourceReference: undefined };
    expect(validateAuditResult(withoutSource)).toContain(
      "P0/P1 confirmed failures require a sourceReference or explicit source limitation",
    );
  });

  it("reports poor coverage as green on exercised controls only, never corpus pass", () => {
    const results = Array.from({ length: 17 }, (_, index) =>
      createAuditResult({
        ...base,
        controlId: `CTRL-${String(index + 1).padStart(3, "0")}`,
        caseId: `case-${String(index + 1).padStart(3, "0")}`,
        disposition: "pass",
        coverageStatus: "evaluated",
        actual: "No defect.",
      }),
    );
    const summary = summarizeCoverage(results, 361);
    expect(summary.evaluatedControls).toBe(17);
    expect(summary.notExercisedControls).toBe(344);
    expect(summary.claim).toBe("green_on_exercised_controls_only");
  });

  it("clusters sibling failures by shared root instead of treating cases as fixes", () => {
    const results = [
      createAuditResult(base),
      createAuditResult({ ...base, caseId: "case-002" }),
      createAuditResult({
        ...base,
        caseId: "case-003",
        failureClass: "unsupported_promotion_failure",
        rootCauseCluster: "heuristic-promoted",
      }),
    ];
    const clusters = clusterFailures(results);
    expect(clusters[0]).toMatchObject({
      count: 2,
      rootCauseCluster: "wrong-family-provenance",
      failureClass: "provenance_family_failure",
    });
  });

  it("keeps historical invariants general and opposite-direction protected", () => {
    expect(assertInvariantRegistry(HISTORICAL_INVARIANTS)).toEqual([]);
    expect(HISTORICAL_INVARIANTS.some((item) => item.id === "CB-HIST-CCTV-NOT-PHONE-PROVENANCE")).toBe(true);
  });

  it("does not recommend a full 3,000 run for CSS/copy changes", () => {
    expect(recommendAuditTier("css_or_visual_copy")).toMatchObject({ tier: "A", fullCorpusAllowed: false });
    expect(recommendAuditTier("canonical_state_or_parser")).toMatchObject({ tier: "E", fullCorpusAllowed: true });
  });
});

