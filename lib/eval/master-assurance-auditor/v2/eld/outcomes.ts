/**
 * Unchanged / updated / withdrawn / unresolved wording outcomes.
 */

import { calculateAffectedWording } from "./affected-wording";
import { nodesOfKind } from "./dependency-graph";
import type {
  EldSentenceOutcomeRecord,
  EldVersionPair,
  EldWordingOutcome,
} from "./types";
import { ELD_OUTCOME_SCHEMA } from "./types";

export type EldOutcomeClassificationInput = {
  pair: EldVersionPair;
  /**
   * Optional explicit outcome overrides (e.g. withdrawn / unresolved declared by fixture).
   * Keys are sentenceIds.
   */
  declaredOutcomes?: Record<string, EldWordingOutcome>;
  /** Optional per-sentence change reasons for updated wording. */
  changeReasons?: Record<string, string>;
};

/**
 * Classify each before-sentence against after wording and affected set.
 *
 * Rules:
 * - unaffected → must be byte-identical → unchanged (else unresolved)
 * - affected + identical wording → unresolved (silent stale / incomplete update)
 * - affected + different wording → updated
 * - affected + missing after + declared withdrawn → withdrawn
 * - affected + missing after without withdraw → unresolved
 * - declared unresolved always wins when provided
 */
export function classifyWordingOutcomes(
  input: EldOutcomeClassificationInput,
): EldSentenceOutcomeRecord[] {
  const { pair, declaredOutcomes = {}, changeReasons = {} } = input;
  const affected = calculateAffectedWording(pair);
  const affectedSet = new Set(affected.affectedSentenceIds);
  const beforeSentences = nodesOfKind(pair.before.graph, "sentence");

  return beforeSentences.map((s) => {
    const beforeWording = pair.before.sentenceWording[s.nodeId] ?? s.exactWording;
    const afterPresent = Object.prototype.hasOwnProperty.call(
      pair.after.sentenceWording,
      s.nodeId,
    );
    const afterWording = afterPresent ? pair.after.sentenceWording[s.nodeId]! : null;
    const byteIdentical = afterPresent && afterWording === beforeWording;
    const isAffected = affectedSet.has(s.nodeId);
    const declared = declaredOutcomes[s.nodeId];

    let outcome: EldWordingOutcome;
    let changeReason: string | null = changeReasons[s.nodeId] ?? null;

    if (declared === "unresolved") {
      outcome = "unresolved";
    } else if (declared === "withdrawn") {
      outcome = afterPresent ? "unresolved" : "withdrawn";
      changeReason = changeReason ?? "declared_withdrawn";
    } else if (!isAffected) {
      outcome = byteIdentical ? "unchanged" : "unresolved";
      if (outcome === "unchanged") changeReason = null;
      else changeReason = changeReason ?? "unaffected_wording_mutated";
    } else if (!afterPresent) {
      outcome = "unresolved";
      changeReason = changeReason ?? "affected_missing_after_without_withdraw";
    } else if (byteIdentical) {
      outcome = "unresolved";
      changeReason = changeReason ?? "affected_wording_not_updated";
    } else {
      outcome = "updated";
      changeReason = changeReason ?? "affected_wording_updated";
    }

    return {
      schemaVersion: ELD_OUTCOME_SCHEMA,
      sentenceId: s.nodeId,
      outcome,
      beforeWording,
      afterWording,
      byteIdentical: Boolean(byteIdentical),
      changeReason,
      affected: isAffected,
    };
  });
}

export function outcomesByKind(
  records: EldSentenceOutcomeRecord[],
): Record<EldWordingOutcome, number> {
  const out: Record<EldWordingOutcome, number> = {
    unchanged: 0,
    updated: 0,
    withdrawn: 0,
    unresolved: 0,
  };
  for (const r of records) out[r.outcome] += 1;
  return out;
}
