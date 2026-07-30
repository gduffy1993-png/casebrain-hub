/**
 * All-exit dependency expectations for ELD stale/update blocking.
 * Foundation expectation matrix only — full-exit adapter remains absent on ESA.
 */

import type { EldExitBlockExpectation, EldExitSurface } from "./types";
import { ELD_ALL_EXIT_SURFACES, ELD_EXIT_EXPECTATION_SCHEMA } from "./types";

/**
 * Every ELD exit surface must eventually block stale text.
 * Until the full_exit_block_matrix adapter exists, absent exits are not_exercised
 * (never PASS).
 */
export function buildAllExitDependencyExpectations(
  presentExits: readonly EldExitSurface[],
): EldExitBlockExpectation[] {
  const present = new Set(presentExits);
  return ELD_ALL_EXIT_SURFACES.map((exit) => ({
    schemaVersion: ELD_EXIT_EXPECTATION_SCHEMA,
    exit,
    mustBlockStale: true as const,
    expectedPresent: present.has(exit),
    absentVerdict: "not_exercised" as const,
  }));
}

export function missingExitSurfaces(
  presentExits: readonly EldExitSurface[],
): EldExitSurface[] {
  const present = new Set(presentExits);
  return ELD_ALL_EXIT_SURFACES.filter((e) => !present.has(e));
}

export const ELD_REQUIRED_ADAPTERS = [
  "source_to_sentence_graph",
  "version_pairs",
  "approval_receipts",
  "revision_ledger",
  "full_exit_block_matrix",
] as const;

export type EldRequiredAdapterId = (typeof ELD_REQUIRED_ADAPTERS)[number];

/**
 * Foundation-level adapter availability. Always reports adapters as unavailable
 * for live CaseBrain/ESA — synthetic fixtures exercise calculators only.
 */
export function adapterAvailabilityForLiveSurfaces(): Record<
  EldRequiredAdapterId,
  { available: false; absentVerdict: "not_exercised" }
> {
  return {
    source_to_sentence_graph: { available: false, absentVerdict: "not_exercised" },
    version_pairs: { available: false, absentVerdict: "not_exercised" },
    approval_receipts: { available: false, absentVerdict: "not_exercised" },
    revision_ledger: { available: false, absentVerdict: "not_exercised" },
    full_exit_block_matrix: { available: false, absentVerdict: "not_exercised" },
  };
}
