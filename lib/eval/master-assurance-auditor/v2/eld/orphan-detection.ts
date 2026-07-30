/**
 * Orphan conclusion detection on synthetic dependency graphs.
 */

import { incoming, nodesOfKind, outgoing } from "./dependency-graph";
import type { EldDependencyGraph, EldOrphanConclusionFinding } from "./types";

/**
 * A conclusion is orphan when:
 * - no supporting fact edge, or
 * - all supporting facts are withdrawn, or
 * - no dependent sentence remains.
 */
export function detectOrphanConclusions(
  graph: EldDependencyGraph,
): EldOrphanConclusionFinding[] {
  const facts = new Map(nodesOfKind(graph, "fact").map((f) => [f.nodeId, f]));
  const findings: EldOrphanConclusionFinding[] = [];

  for (const c of nodesOfKind(graph, "conclusion")) {
    if (c.withdrawn) continue;

    const supportFacts = incoming(graph, c.nodeId).filter((e) => e.kind === "fact_to_conclusion");
    if (supportFacts.length === 0) {
      findings.push({ conclusionId: c.nodeId, reason: "no_supporting_fact" });
      continue;
    }

    const allWithdrawn = supportFacts.every((e) => facts.get(e.fromId)?.withdrawn === true);
    if (allWithdrawn) {
      findings.push({ conclusionId: c.nodeId, reason: "supporting_fact_withdrawn" });
      continue;
    }

    const sentenceEdges = outgoing(graph, c.nodeId).filter(
      (e) => e.kind === "conclusion_to_sentence",
    );
    if (sentenceEdges.length === 0) {
      findings.push({ conclusionId: c.nodeId, reason: "no_dependent_sentence" });
    }
  }

  return findings.sort((a, b) => a.conclusionId.localeCompare(b.conclusionId));
}
