/**
 * Affected-wording calculation over synthetic version pairs.
 */

import { collectDependentSentenceIds, nodesOfKind } from "./dependency-graph";
import type {
  EldAffectedWordingResult,
  EldSyntheticId,
  EldVersionPair,
} from "./types";
import { ELD_AFFECTED_WORDING_SCHEMA } from "./types";

/**
 * Compute which sentences are affected by declared source/fact change events
 * on the before-graph, then reconcile against after sentence presence.
 */
export function calculateAffectedWording(pair: EldVersionPair): EldAffectedWordingResult {
  const changedNodeIds = pair.changeEvents.map((c) => c.changedNodeId);
  const affected = collectDependentSentenceIds(pair.before.graph, changedNodeIds);

  const beforeSentenceIds = nodesOfKind(pair.before.graph, "sentence").map((s) => s.nodeId);
  const afterSentenceIds = new Set(nodesOfKind(pair.after.graph, "sentence").map((s) => s.nodeId));
  const affectedSet = new Set(affected);

  const unaffectedSentenceIds = beforeSentenceIds
    .filter((id) => !affectedSet.has(id))
    .sort() as EldSyntheticId[];

  const missingAfterWithoutWithdraw = affected.filter((id) => {
    if (afterSentenceIds.has(id)) return false;
    // Missing after is allowed only when an explicit withdraw is recorded via changeEvents
    // or the after graph marks no sentence — callers classify outcomes separately.
    const afterWording = pair.after.sentenceWording[id];
    return afterWording === undefined;
  });

  return {
    schemaVersion: ELD_AFFECTED_WORDING_SCHEMA,
    pairId: pair.pairId,
    changedNodeIds: [...changedNodeIds].sort() as EldSyntheticId[],
    affectedSentenceIds: affected,
    unaffectedSentenceIds,
    missingAfterWithoutWithdraw,
  };
}
