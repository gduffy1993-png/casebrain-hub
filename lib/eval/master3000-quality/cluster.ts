import type { AuditResultEnvelope } from "./types";

export interface FailureCluster {
  key: string;
  count: number;
  severity: string;
  failureClass: string;
  evidenceFamily: string | null;
  surface: string;
  representativeCaseIds: string[];
  rootCauseCluster: string | null;
}

export function clusterFailures(results: readonly AuditResultEnvelope[]): FailureCluster[] {
  const clusters = new Map<string, FailureCluster>();
  for (const result of results) {
    if (!["candidate_failure", "confirmed_failure", "human_review_required"].includes(result.disposition)) continue;
    const key = [
      result.severity,
      result.failureClass,
      result.evidenceFamily ?? "no_family",
      result.surface,
      result.rootCauseCluster ?? "unclustered",
    ].join("|");
    const cluster =
      clusters.get(key) ??
      {
        key,
        count: 0,
        severity: result.severity,
        failureClass: result.failureClass,
        evidenceFamily: result.evidenceFamily ?? null,
        surface: result.surface,
        representativeCaseIds: [],
        rootCauseCluster: result.rootCauseCluster ?? null,
      };
    cluster.count += 1;
    if (!cluster.representativeCaseIds.includes(result.caseId) && cluster.representativeCaseIds.length < 10) {
      cluster.representativeCaseIds.push(result.caseId);
    }
    clusters.set(key, cluster);
  }
  return [...clusters.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

