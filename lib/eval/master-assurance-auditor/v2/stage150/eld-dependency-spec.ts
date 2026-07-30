/**
 * Evidence-locked drafting dependency specification.
 * Canonical Stage-150 ownership definition — foundation calculators must align.
 * All 14 ELD controls remain non-runnable until adapters exist.
 */

export const ELD_DEPENDENCY_SPEC = {
  schemaVersion: "eld-dependency-specification@1.1.0",
  familyCode: "ELD",
  runnableOnEsa: false,
  canonicalOwnership:
    "stage150/eld-dependency-spec.ts is the programme ownership definition; lib/.../v2/eld implements synthetic foundation calculators only.",
  requiredAdapters: [
    {
      adapterId: "source_to_sentence_graph",
      purpose: "Link each generated sentence to supporting sources/facts/conclusions",
      absentVerdict: "not_exercised",
    },
    {
      adapterId: "version_pairs",
      purpose: "Before/after draft versions with byte-identity for unaffected sentences",
      absentVerdict: "not_exercised",
    },
    {
      adapterId: "approval_receipts",
      purpose: "Solicitor approval state before external use",
      absentVerdict: "not_exercised",
    },
    {
      adapterId: "revision_ledger",
      purpose: "Rejected/superseded history, change reasons, rollback",
      absentVerdict: "not_exercised",
    },
    {
      adapterId: "full_exit_block_matrix",
      purpose: "Block stale text across view/copy/export/API/PDF/composed prose",
      absentVerdict: "not_exercised",
    },
  ],
  controls: Array.from({ length: 14 }, (_, i) => {
    const serial = String(i + 1).padStart(2, "0");
    return {
      controlIdPattern: `MAA2-ELD-${serial}-*`,
      implementationStatus: "specified_not_implemented" as const,
      currentlyRunnable: false as const,
      countsAsFullyExercised: false as const,
      note: "Do not mark partially_implemented until adapters + positive/negative/unavailable contracts exist.",
    };
  }),
  dependencyModel: {
    nodes: ["source", "fact", "conclusion", "sentence", "exit_surface", "approval", "warning"],
    edges: [
      "source→fact",
      "fact→conclusion",
      "conclusion→sentence",
      "sentence→exit_surface",
      "approval→exit_surface",
      "warning→sentence",
    ],
    ownershipRules: [
      "source/fact/conclusion/sentence kinds are exclusive per nodeId",
      "invalid dependency directions are rejected",
      "duplicate node/edge IDs are rejected",
      "cycles are rejected",
      "missing changed-node IDs are rejected",
      "unaffected sentences must remain byte-identical across version pairs",
    ],
    changePropagationRule:
      "If a source/fact changes, every dependent sentence must update, withdraw, or become unresolved; unaffected sentences remain byte-identical.",
  },
  graphValidationRequired: [
    "duplicate_node_ids",
    "duplicate_edge_ids",
    "cycles",
    "missing_changed_node_ids",
    "invalid_dependency_direction",
    "dangling_nodes_edges",
    "inconsistent_before_after_sentence_identity",
    "source_fact_conclusion_sentence_ownership",
  ],
} as const;
