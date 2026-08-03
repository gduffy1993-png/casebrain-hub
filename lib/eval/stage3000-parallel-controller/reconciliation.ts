/**
 * Final population reconciliation.
 * No final PASS based only on shard self-reporting.
 */

import {
  RECONCILIATION_SCHEMA,
  TARGET_POPULATION_SIZE,
  WAVE_COUNT,
  SHARDS_PER_WAVE,
  CHECKPOINT_THRESHOLDS,
  type CheckpointThreshold,
} from "./constants";
import { assertMembershipUntampered } from "./manifests";
import { assertReceiptMatchesMembership } from "./receipts";
import { scanSemanticDuplicates } from "./semantic-dupes";
import type {
  ControllerState,
  PopulationReconciliation,
  ReconciliationVerdict,
} from "./types";

export function reconcilePopulation(
  state: ControllerState,
  opts?: { generatorBound?: boolean; nowIso?: string },
): PopulationReconciliation {
  const reasons: string[] = [];
  let verdict: ReconciliationVerdict = "PASS";
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const expectedReceiptCount = WAVE_COUNT * SHARDS_PER_WAVE;

  const fail = (v: ReconciliationVerdict, reason: string) => {
    if (verdict === "PASS") verdict = v;
    reasons.push(reason);
  };

  // 1) Generator must be bound for a real population PASS.
  if (opts?.generatorBound === false) {
    fail("FAIL_GENERATOR_UNBOUND", "generator port is unbound");
  }

  // 2) Membership integrity.
  try {
    assertMembershipUntampered(state.membership);
  } catch (err) {
    fail(
      "FAIL_MEMBERSHIP_TAMPER",
      err instanceof Error ? err.message : String(err),
    );
  }

  // 3) Count.
  if (state.membership.acceptedCount !== TARGET_POPULATION_SIZE) {
    fail(
      "FAIL_INCOMPLETE",
      `acceptedCount ${state.membership.acceptedCount} != ${TARGET_POPULATION_SIZE}`,
    );
  }

  // 4) Overlaps on primary slots / caseIds.
  const ids = state.membership.accepted.map((e) => e.caseId);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) {
    const overlapCaseIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    fail(
      "FAIL_OVERLAP",
      `duplicate caseIds in membership: ${[...new Set(overlapCaseIds)].join(",")}`,
    );
  }
  const primarySlots = state.membership.accepted
    .filter((e) => e.globalSlot >= 0)
    .map((e) => e.globalSlot);
  const slotSet = new Set(primarySlots);
  if (slotSet.size !== primarySlots.length) {
    fail("FAIL_OVERLAP", "duplicate primary globalSlots in membership");
  }

  // 5) Central semantic duplicate scan.
  const dupes = scanSemanticDuplicates(state.membership.accepted);
  if (!dupes.clean) {
    fail(
      "FAIL_DUPLICATE_SEMANTIC",
      `semantic duplicate groups: ${dupes.duplicateGroups.length}`,
    );
  }

  // 6) Receipts present and match membership — necessary but not sufficient.
  if (state.receipts.length !== expectedReceiptCount) {
    fail(
      "FAIL_INCOMPLETE",
      `receiptCount ${state.receipts.length} != ${expectedReceiptCount}`,
    );
  }
  for (const receipt of state.receipts) {
    try {
      assertReceiptMatchesMembership(receipt, state.membership);
    } catch (err) {
      fail(
        "FAIL_COUNT_MISMATCH",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // 7) Explicitly reject PASS based only on shard self-reporting.
  const onlySelfReport =
    state.receipts.length === expectedReceiptCount &&
    state.membership.acceptedCount === 0;
  if (onlySelfReport) {
    fail(
      "FAIL_RECEIPT_ONLY",
      "shard self-reporting alone cannot yield PASS",
    );
  }

  // 8) Checkpoints.
  const checkpointsHit = CHECKPOINT_THRESHOLDS.filter((t) =>
    state.checkpoints.some((c) => c.threshold === t),
  ) as CheckpointThreshold[];
  if (
    state.membership.acceptedCount >= TARGET_POPULATION_SIZE &&
    checkpointsHit.length !== CHECKPOINT_THRESHOLDS.length
  ) {
    fail(
      "FAIL_INCOMPLETE",
      `missing checkpoints; hit ${checkpointsHit.join(",")} expected all`,
    );
  }

  // If membership is empty but receipts claim complete → receipt-only FAIL.
  if (
    state.receipts.every((r) => r.selfReportStatus === "shard_complete_claimed") &&
    state.receipts.length > 0 &&
    state.membership.acceptedCount < TARGET_POPULATION_SIZE &&
    !reasons.some((r) => r.includes("self-reporting"))
  ) {
    // Already covered by FAIL_INCOMPLETE; annotate.
    reasons.push(
      "note: receipts are self-reports and are insufficient without reconciled membership",
    );
  }

  return {
    schema: RECONCILIATION_SCHEMA,
    populationId: state.populationId,
    acceptedCount: state.membership.acceptedCount,
    targetSize: TARGET_POPULATION_SIZE,
    membershipSha256: state.membership.membershipSha256,
    receiptCount: state.receipts.length,
    expectedReceiptCount,
    overlapCaseIds: findDuplicateIds(ids),
    semanticDuplicateGroups: dupes.duplicateGroups,
    checkpointsHit,
    verdict,
    reasons,
    reconciledAtIso: nowIso,
  };
}

function findDuplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups].sort();
}
