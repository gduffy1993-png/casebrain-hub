/**
 * MAA V2 Evidence-Locked Drafting foundation contracts.
 *
 * positive | negative | unavailable | mutation
 * Synthetic version pairs only. No real case IDs.
 * No ELD control marked implemented/runnable. No freeze/run/PASS.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ELD_ALL_EXIT_SURFACES,
  ELD_FOUNDATION_STATUS,
  ELD_REQUIRED_ADAPTERS,
  ELD_VERSION_PAIR_SCHEMA,
  adapterAvailabilityForLiveSurfaces,
  assertNoEldMarkedRunnable,
  assertSyntheticOnly,
  buildAllExitDependencyExpectations,
  calculateAffectedWording,
  classifyWordingOutcomes,
  detectOrphanConclusions,
  detectStaleDrafting,
  eldFoundationControlPosture,
  isSyntheticEldId,
  missingExitSurfaces,
  outcomesByKind,
  assessReceiptPreservation,
  staleLeaksAcrossExits,
  syntheticMutationCollateralPair,
  syntheticMutationReceiptLossPair,
  syntheticNegativeStalePair,
  syntheticOrphanConclusionGraph,
  syntheticOrphanNoFactGraph,
  syntheticOrphanNoSentenceGraph,
  syntheticPositiveUpdatePair,
  syntheticPositiveWithdrawPair,
  syntheticUnavailableEmptyPair,
  validateDependencyGraphShape,
  validateChangedNodesAndSentenceIdentity,
} from "../lib/eval/master-assurance-auditor/v2/eld";
import { ELD_DEPENDENCY_SPEC } from "../lib/eval/master-assurance-auditor/v2/stage150/eld-dependency-spec";

describe("ELD foundation — posture / schemas", () => {
  it("eld_posture_not_runnable — no control fully implemented or runnable", () => {
    assert.equal(ELD_FOUNDATION_STATUS.currentlyRunnable, false);
    assert.equal(ELD_FOUNDATION_STATUS.countsAsFullyExercised, false);
    assert.equal(ELD_FOUNDATION_STATUS.programmePassForbidden, true);
    const posture = eldFoundationControlPosture();
    assert.equal(posture.length, 14);
    assertNoEldMarkedRunnable(posture);
    for (const row of posture) {
      assert.notEqual(row.implementationStatus, "implemented");
      assert.equal(row.currentlyRunnable, false);
    }
  });

  it("eld_synthetic_ids_only — rejects real case id shapes", () => {
    assert.equal(isSyntheticEldId("syn-eld-matter-positive-001"), true);
    assert.equal(isSyntheticEldId("sim-224"), false);
    assert.equal(isSyntheticEldId("case-abc"), false);
    assert.throws(() => assertSyntheticOnly(["sim-224"]), /rejects non-synthetic/);
  });
});

describe("ELD foundation — positive contracts", () => {
  it("eld_positive_version_pair_schema", () => {
    const pair = syntheticPositiveUpdatePair();
    assert.equal(pair.schemaVersion, ELD_VERSION_PAIR_SCHEMA);
    assert.ok(pair.pairId.startsWith("syn-eld-"));
    assert.ok(pair.syntheticMatterId.startsWith("syn-eld-"));
    assert.equal(validateDependencyGraphShape(pair.before.graph).length, 0);
    assert.equal(validateDependencyGraphShape(pair.after.graph).length, 0);
  });

  it("eld_positive_affected_wording — source change lists dependent sentence only", () => {
    const pair = syntheticPositiveUpdatePair();
    const affected = calculateAffectedWording(pair);
    assert.deepEqual(affected.affectedSentenceIds, ["syn-eld-sent-a"]);
    assert.deepEqual(affected.unaffectedSentenceIds, ["syn-eld-sent-b"]);
    assert.deepEqual(affected.changedNodeIds, ["syn-eld-src-1"]);
  });

  it("eld_positive_outcomes — updated + unchanged", () => {
    const pair = syntheticPositiveUpdatePair();
    const records = classifyWordingOutcomes({
      pair,
      changeReasons: { "syn-eld-sent-a": "MG11 arrival time corrected" },
    });
    const byId = Object.fromEntries(records.map((r) => [r.sentenceId, r]));
    assert.equal(byId["syn-eld-sent-a"]!.outcome, "updated");
    assert.equal(byId["syn-eld-sent-a"]!.byteIdentical, false);
    assert.equal(byId["syn-eld-sent-b"]!.outcome, "unchanged");
    assert.equal(byId["syn-eld-sent-b"]!.byteIdentical, true);
    assert.deepEqual(outcomesByKind(records), {
      unchanged: 1,
      updated: 1,
      withdrawn: 0,
      unresolved: 0,
    });
  });

  it("eld_positive_withdraw — affected sentence withdrawn", () => {
    const pair = syntheticPositiveWithdrawPair();
    const records = classifyWordingOutcomes({
      pair,
      declaredOutcomes: { "syn-eld-sent-a": "withdrawn" },
    });
    const byId = Object.fromEntries(records.map((r) => [r.sentenceId, r]));
    assert.equal(byId["syn-eld-sent-a"]!.outcome, "withdrawn");
    assert.equal(byId["syn-eld-sent-b"]!.outcome, "unchanged");
  });

  it("eld_positive_receipt_preservation", () => {
    const pair = syntheticPositiveUpdatePair();
    const result = assessReceiptPreservation(pair);
    assert.equal(result.warningReceiptsPreserved, true);
    assert.equal(result.approvalReceiptsPreserved, true);
    assert.deepEqual(result.lostWarningIds, []);
    assert.deepEqual(result.lostApprovalIds, []);
  });

  it("eld_positive_no_stale_after_update", () => {
    const pair = syntheticPositiveUpdatePair();
    assert.deepEqual(detectStaleDrafting(pair), []);
    assert.deepEqual(staleLeaksAcrossExits(pair).leakingExits, []);
  });
});

describe("ELD foundation — negative contracts", () => {
  it("eld_negative_stale_draft_marking", () => {
    const pair = syntheticNegativeStalePair();
    const stale = detectStaleDrafting(pair);
    assert.ok(stale.some((s) => s.sentenceId === "syn-eld-sent-a"));
    assert.ok(
      stale.some((s) => s.reason === "after_graph_stale_flag") ||
        stale.some((s) => s.reason === "affected_sentence_unchanged_after_source_change"),
    );
  });

  it("eld_negative_affected_left_identical_is_unresolved", () => {
    const pair = syntheticNegativeStalePair();
    const records = classifyWordingOutcomes({ pair });
    const sentA = records.find((r) => r.sentenceId === "syn-eld-sent-a")!;
    assert.equal(sentA.affected, true);
    assert.equal(sentA.outcome, "unresolved");
    assert.equal(sentA.byteIdentical, true);
  });

  it("eld_negative_stale_exit_leak_when_blocksStale_false", () => {
    const pair = syntheticNegativeStalePair();
    const leaks = staleLeaksAcrossExits(pair);
    assert.ok(leaks.leakingExits.includes("view"));
    assert.ok(leaks.leakingExits.includes("copy"));
  });

  it("eld_negative_orphan_conclusion_fact_withdrawn", () => {
    const findings = detectOrphanConclusions(syntheticOrphanConclusionGraph());
    assert.ok(
      findings.some(
        (f) =>
          f.conclusionId === "syn-eld-conc-1" && f.reason === "supporting_fact_withdrawn",
      ),
    );
  });

  it("eld_negative_orphan_conclusion_no_supporting_fact", () => {
    const findings = detectOrphanConclusions(syntheticOrphanNoFactGraph());
    assert.ok(
      findings.some(
        (f) => f.conclusionId === "syn-eld-conc-1" && f.reason === "no_supporting_fact",
      ),
    );
  });

  it("eld_negative_orphan_conclusion_no_dependent_sentence", () => {
    const findings = detectOrphanConclusions(syntheticOrphanNoSentenceGraph());
    assert.ok(
      findings.some(
        (f) => f.conclusionId === "syn-eld-conc-1" && f.reason === "no_dependent_sentence",
      ),
    );
  });
});

describe("ELD foundation — unavailable contracts", () => {
  it("eld_unavailable_live_adapters_absent", () => {
    const avail = adapterAvailabilityForLiveSurfaces();
    for (const id of ELD_REQUIRED_ADAPTERS) {
      assert.equal(avail[id].available, false);
      assert.equal(avail[id].absentVerdict, "not_exercised");
    }
  });

  it("eld_unavailable_empty_pair_not_exercised_shape", () => {
    const pair = syntheticUnavailableEmptyPair();
    assert.equal(pair.changeEvents.length, 0);
    assert.equal(pair.before.graph.nodes.length, 0);
    const affected = calculateAffectedWording(pair);
    assert.deepEqual(affected.affectedSentenceIds, []);
    assert.deepEqual(affected.unaffectedSentenceIds, []);
    const outcomes = classifyWordingOutcomes({ pair });
    assert.equal(outcomes.length, 0);
    // Empty evaluation never implies PASS
    assert.equal(ELD_FOUNDATION_STATUS.programmePassForbidden, true);
  });

  it("eld_unavailable_missing_exits_are_not_exercised", () => {
    const present = ["view", "copy", "export"] as const;
    const missing = missingExitSurfaces(present);
    assert.ok(missing.includes("api"));
    assert.ok(missing.includes("pdf"));
    assert.ok(missing.includes("composed_prose"));
    const expectations = buildAllExitDependencyExpectations(present);
    assert.equal(expectations.length, ELD_ALL_EXIT_SURFACES.length);
    for (const row of expectations) {
      assert.equal(row.mustBlockStale, true);
      assert.equal(row.absentVerdict, "not_exercised");
      if (!present.includes(row.exit as (typeof present)[number])) {
        assert.equal(row.expectedPresent, false);
      }
    }
  });
});

describe("ELD foundation — mutation contracts", () => {
  it("eld_mutation_collateral_rewrite_of_unaffected", () => {
    const pair = syntheticMutationCollateralPair();
    const affected = calculateAffectedWording(pair);
    assert.deepEqual(affected.unaffectedSentenceIds, ["syn-eld-sent-b"]);
    const records = classifyWordingOutcomes({ pair });
    const sentB = records.find((r) => r.sentenceId === "syn-eld-sent-b")!;
    assert.equal(sentB.affected, false);
    assert.equal(sentB.outcome, "unresolved");
    assert.equal(sentB.changeReason, "unaffected_wording_mutated");
    const sentA = records.find((r) => r.sentenceId === "syn-eld-sent-a")!;
    assert.equal(sentA.outcome, "updated");
  });

  it("eld_mutation_receipt_loss", () => {
    const pair = syntheticMutationReceiptLossPair();
    const result = assessReceiptPreservation(pair);
    assert.equal(result.warningReceiptsPreserved, false);
    assert.equal(result.approvalReceiptsPreserved, false);
    assert.deepEqual(result.lostWarningIds, ["syn-eld-warn-1"]);
    assert.deepEqual(result.lostApprovalIds, ["syn-eld-appr-1"]);
  });

  it("eld_mutation_declared_unresolved_wins", () => {
    const pair = syntheticPositiveUpdatePair();
    const records = classifyWordingOutcomes({
      pair,
      declaredOutcomes: { "syn-eld-sent-a": "unresolved" },
    });
    assert.equal(records.find((r) => r.sentenceId === "syn-eld-sent-a")!.outcome, "unresolved");
  });
});

describe("ELD foundation — all-exit dependency expectations", () => {
  it("eld_all_exit_surfaces_enumerated", () => {
    assert.deepEqual([...ELD_ALL_EXIT_SURFACES], [
      "view",
      "copy",
      "export",
      "api",
      "pdf",
      "composed_prose",
    ]);
  });
});

describe("ELD foundation — graph integrity validation", () => {
  it("rejects duplicate node/edge IDs, cycles, missing changed nodes, bad direction", () => {
    const pair = syntheticPositiveUpdatePair();
    assert.equal(validateDependencyGraphShape(pair.before.graph).length, 0);

    const dupNode = {
      ...pair.before.graph,
      nodes: [...pair.before.graph.nodes, pair.before.graph.nodes[0]],
    };
    assert.ok(validateDependencyGraphShape(dupNode).some((e) => /duplicate node/.test(e)));

    const dupEdge = {
      ...pair.before.graph,
      edges: [...pair.before.graph.edges, pair.before.graph.edges[0]],
    };
    assert.ok(validateDependencyGraphShape(dupEdge).some((e) => /duplicate edge/.test(e)));

    const conclusion = pair.before.graph.nodes.find((n) => n.kind === "conclusion")!;
    const fact = pair.before.graph.nodes.find((n) => n.kind === "fact")!;
    const cyclic = {
      ...pair.before.graph,
      edges: [
        ...pair.before.graph.edges,
        {
          edgeId: "syn-eld-edge-cycle" as const,
          kind: "fact_to_conclusion" as const,
          fromId: conclusion.nodeId,
          toId: fact.nodeId,
        },
      ],
    };
    assert.ok(validateDependencyGraphShape(cyclic).length > 0);

    const missingChanged = validateChangedNodesAndSentenceIdentity({
      graph: pair.before.graph,
      changedNodeIds: ["syn-eld-missing-node"],
    });
    assert.ok(missingChanged.some((e) => /missing changed-node/.test(e)));
  });

  it("aligns with canonical ELD_DEPENDENCY_SPEC posture", () => {
    assert.equal(ELD_DEPENDENCY_SPEC.controls.length, 14);
    assert.ok(ELD_DEPENDENCY_SPEC.controls.every((c) => c.currentlyRunnable === false));
    assert.ok(ELD_DEPENDENCY_SPEC.graphValidationRequired.includes("cycles"));
  });
});
