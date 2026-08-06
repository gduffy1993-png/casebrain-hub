/**
 * Stale drafting detection over synthetic version pairs / graphs.
 */

import { calculateAffectedWording } from "./affected-wording";
import { nodesOfKind } from "./dependency-graph";
import type { EldStaleDraftFinding, EldVersionPair } from "./types";

/**
 * A sentence is stale when it remains on the after graph with identical wording
 * despite depending on a changed source/fact, or when the after graph marks stale=true.
 */
export function detectStaleDrafting(pair: EldVersionPair): EldStaleDraftFinding[] {
  const affected = calculateAffectedWording(pair);
  const affectedSet = new Set(affected.affectedSentenceIds);
  const afterSentences = nodesOfKind(pair.after.graph, "sentence");
  const findings: EldStaleDraftFinding[] = [];

  for (const s of afterSentences) {
    const beforeWording = pair.before.sentenceWording[s.nodeId];
    const afterWording = pair.after.sentenceWording[s.nodeId] ?? s.exactWording;
    const dependsOnChange = affectedSet.has(s.nodeId);

    if (s.stale) {
      findings.push({
        sentenceId: s.nodeId,
        reason: "after_graph_stale_flag",
        exitSurfaces: [...s.exitSurfaces],
      });
      continue;
    }

    if (dependsOnChange && beforeWording !== undefined && beforeWording === afterWording) {
      findings.push({
        sentenceId: s.nodeId,
        reason: "affected_sentence_unchanged_after_source_change",
        exitSurfaces: [...s.exitSurfaces],
      });
    }
  }

  return findings.sort((a, b) => a.sentenceId.localeCompare(b.sentenceId));
}

/**
 * True when any stale finding exists on an exit that does not block stale text.
 * Used by all-exit expectation checks (foundation-level; not a live exit gate).
 */
export function staleLeaksAcrossExits(pair: EldVersionPair): {
  leakingExits: string[];
  staleSentenceIds: string[];
} {
  const stale = detectStaleDrafting(pair);
  const exitNodes = nodesOfKind(pair.after.graph, "exit_surface");
  const blockByExit = new Map(exitNodes.map((e) => [e.exit, e.blocksStale]));
  const leaking = new Set<string>();
  for (const f of stale) {
    for (const exit of f.exitSurfaces) {
      if (blockByExit.get(exit) !== true) leaking.add(exit);
    }
  }
  return {
    leakingExits: [...leaking].sort(),
    staleSentenceIds: stale.map((s) => s.sentenceId),
  };
}
