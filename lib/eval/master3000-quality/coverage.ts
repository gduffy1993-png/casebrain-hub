import type { AuditResultEnvelope, CoverageStatus, CoverageSummary } from "./types";

const STATUSES: CoverageStatus[] = ["evaluated", "not_exercised", "unavailable", "unresolved", "projection_only"];

export function summarizeCoverage(results: readonly AuditResultEnvelope[], totalControls: number): CoverageSummary {
  const byControl = new Map<string, Set<CoverageStatus>>();
  for (const result of results) {
    const set = byControl.get(result.controlId) ?? new Set<CoverageStatus>();
    set.add(result.coverageStatus);
    byControl.set(result.controlId, set);
  }

  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<CoverageStatus, number>;
  for (const statuses of byControl.values()) {
    if (statuses.has("evaluated")) byStatus.evaluated += 1;
    else if (statuses.has("unresolved")) byStatus.unresolved += 1;
    else if (statuses.has("unavailable")) byStatus.unavailable += 1;
    else if (statuses.has("projection_only")) byStatus.projection_only += 1;
    else byStatus.not_exercised += 1;
  }

  const uniqueControlsSeen = byControl.size;
  const unseen = Math.max(0, totalControls - uniqueControlsSeen);
  byStatus.not_exercised += unseen;

  const evaluatedControls = byStatus.evaluated;
  const claim =
    evaluatedControls === totalControls
      ? "sufficient_for_configured_gate"
      : evaluatedControls > 0
        ? "green_on_exercised_controls_only"
        : "insufficient_coverage";

  return {
    totalControls,
    uniqueControlsSeen,
    evaluatedControls,
    notExercisedControls: byStatus.not_exercised,
    unavailableControls: byStatus.unavailable,
    unresolvedControls: byStatus.unresolved,
    projectionOnlyControls: byStatus.projection_only,
    claim,
    byStatus,
  };
}

