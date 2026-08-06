/**
 * Controlled synthetic version-pair fixtures for ELD foundation contracts.
 * IDs are always syn-eld-* — never real CaseBrain case IDs.
 */

import type {
  EldDependencyGraph,
  EldDraftVersion,
  EldExitSurface,
  EldSyntheticId,
  EldVersionPair,
} from "../types";
import {
  ELD_DEPENDENCY_GRAPH_SCHEMA,
  ELD_VERSION_PAIR_SCHEMA,
} from "../types";

const SID = (s: string): EldSyntheticId => `syn-eld-${s}`;

function hash(s: string): string {
  // Deterministic non-crypto fixture hash — sufficient for synthetic identity checks.
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `h${h.toString(16).padStart(8, "0")}`;
}

function exitNodes(exits: EldExitSurface[], blocksStale: boolean) {
  return exits.map((exit) => ({
    nodeId: SID(`exit-${exit}`),
    kind: "exit_surface" as const,
    exit,
    blocksStale,
  }));
}

type GraphParts = {
  graphId: EldSyntheticId;
  sourceHash: string;
  factWithdrawn?: boolean;
  conclusionOrphan?: "no_fact" | "fact_withdrawn" | "no_sentence" | null;
  sentenceA: string;
  sentenceB: string;
  sentenceAStale?: boolean;
  includeSentenceA?: boolean;
  includeSentenceB?: boolean;
  exits: EldExitSurface[];
  blocksStale: boolean;
};

function buildGraph(p: GraphParts): EldDependencyGraph {
  const includeA = p.includeSentenceA !== false;
  const includeB = p.includeSentenceB !== false;
  const orphan = p.conclusionOrphan ?? null;

  const nodes: EldDependencyGraph["nodes"] = [
    {
      nodeId: SID("src-1"),
      kind: "source",
      label: "synthetic MG11 extract",
      contentHash: p.sourceHash,
      withdrawn: false,
    },
    {
      nodeId: SID("fact-1"),
      kind: "fact",
      label: "arrival time fact",
      contentHash: hash(`fact:${p.sourceHash}`),
      withdrawn: Boolean(p.factWithdrawn) || orphan === "fact_withdrawn",
    },
    {
      nodeId: SID("conc-1"),
      kind: "conclusion",
      label: "timeline conclusion",
      contentHash: hash(`conc:${p.sourceHash}`),
      withdrawn: false,
    },
    ...exitNodes(p.exits, p.blocksStale),
  ];

  if (includeA) {
    nodes.push({
      nodeId: SID("sent-a"),
      kind: "sentence",
      exactWording: p.sentenceA,
      wordingHash: hash(p.sentenceA),
      exitSurfaces: [...p.exits],
      stale: Boolean(p.sentenceAStale),
    });
  }
  if (includeB) {
    nodes.push({
      nodeId: SID("sent-b"),
      kind: "sentence",
      exactWording: p.sentenceB,
      wordingHash: hash(p.sentenceB),
      exitSurfaces: [...p.exits],
      stale: false,
    });
  }

  const edges: EldDependencyGraph["edges"] = [];
  if (orphan !== "no_fact") {
    edges.push({
      edgeId: SID("e-src-fact"),
      kind: "source_to_fact",
      fromId: SID("src-1"),
      toId: SID("fact-1"),
    });
    edges.push({
      edgeId: SID("e-fact-conc"),
      kind: "fact_to_conclusion",
      fromId: SID("fact-1"),
      toId: SID("conc-1"),
    });
  }

  if (orphan !== "no_sentence" && includeA) {
    edges.push({
      edgeId: SID("e-conc-sent-a"),
      kind: "conclusion_to_sentence",
      fromId: SID("conc-1"),
      toId: SID("sent-a"),
    });
  }

  // sent-b is intentionally independent of src-1 (unaffected path)
  if (includeB) {
    nodes.push({
      nodeId: SID("src-2"),
      kind: "source",
      label: "unrelated custody record",
      contentHash: hash("src-2-stable"),
      withdrawn: false,
    });
    nodes.push({
      nodeId: SID("fact-2"),
      kind: "fact",
      label: "custody fact",
      contentHash: hash("fact-2-stable"),
      withdrawn: false,
    });
    nodes.push({
      nodeId: SID("conc-2"),
      kind: "conclusion",
      label: "custody conclusion",
      contentHash: hash("conc-2-stable"),
      withdrawn: false,
    });
    edges.push(
      {
        edgeId: SID("e-src2-fact2"),
        kind: "source_to_fact",
        fromId: SID("src-2"),
        toId: SID("fact-2"),
      },
      {
        edgeId: SID("e-fact2-conc2"),
        kind: "fact_to_conclusion",
        fromId: SID("fact-2"),
        toId: SID("conc-2"),
      },
      {
        edgeId: SID("e-conc2-sent-b"),
        kind: "conclusion_to_sentence",
        fromId: SID("conc-2"),
        toId: SID("sent-b"),
      },
    );
  }

  for (const exit of p.exits) {
    if (includeA) {
      edges.push({
        edgeId: SID(`e-sent-a-${exit}`),
        kind: "sentence_to_exit",
        fromId: SID("sent-a"),
        toId: SID(`exit-${exit}`),
      });
    }
    if (includeB) {
      edges.push({
        edgeId: SID(`e-sent-b-${exit}`),
        kind: "sentence_to_exit",
        fromId: SID("sent-b"),
        toId: SID(`exit-${exit}`),
      });
    }
  }

  return {
    schemaVersion: ELD_DEPENDENCY_GRAPH_SCHEMA,
    graphId: p.graphId,
    nodes,
    edges,
  };
}

function draft(
  versionId: EldSyntheticId,
  label: string,
  graph: EldDependencyGraph,
  wording: Record<string, string>,
  extras?: Partial<Pick<EldDraftVersion, "warnings" | "approvals">>,
): EldDraftVersion {
  return {
    versionId,
    label,
    capturedAt: "2026-07-30T00:00:00.000Z",
    graph,
    sentenceWording: wording,
    warnings: extras?.warnings ?? [],
    approvals: extras?.approvals ?? [],
  };
}

const BASE_EXITS: EldExitSurface[] = ["view", "copy", "export"];

const WARNING = {
  nodeId: SID("warn-1"),
  kind: "warning" as const,
  code: "DO_NOT_OVERSTATE",
  message: "Do not overstate identification.",
  attachedSentenceIds: [SID("sent-a")],
};

const APPROVAL = {
  nodeId: SID("appr-1"),
  kind: "approval" as const,
  actorId: "syn-eld-solicitor-1",
  approvedAt: "2026-07-29T12:00:00.000Z",
  sentenceIds: [SID("sent-a"), SID("sent-b")],
  externalUseAllowed: true,
};

/** Positive: source change updates affected sentence; unaffected stays byte-identical. */
export function syntheticPositiveUpdatePair(): EldVersionPair {
  const beforeHash = hash("source-v1");
  const afterHash = hash("source-v2");
  const beforeWordingA = "The defendant arrived at 14:02 according to the MG11.";
  const afterWordingA = "The defendant arrived at 14:17 according to the revised MG11.";
  const wordingB = "Custody clock started at 09:00.";

  const beforeGraph = buildGraph({
    graphId: SID("graph-before-pos"),
    sourceHash: beforeHash,
    sentenceA: beforeWordingA,
    sentenceB: wordingB,
    exits: BASE_EXITS,
    blocksStale: true,
  });
  const afterGraph = buildGraph({
    graphId: SID("graph-after-pos"),
    sourceHash: afterHash,
    sentenceA: afterWordingA,
    sentenceB: wordingB,
    exits: BASE_EXITS,
    blocksStale: true,
  });

  return {
    schemaVersion: ELD_VERSION_PAIR_SCHEMA,
    pairId: SID("pair-positive-update"),
    syntheticMatterId: SID("matter-positive-001"),
    before: draft(SID("ver-before-pos"), "before", beforeGraph, {
      [SID("sent-a")]: beforeWordingA,
      [SID("sent-b")]: wordingB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    after: draft(SID("ver-after-pos"), "after", afterGraph, {
      [SID("sent-a")]: afterWordingA,
      [SID("sent-b")]: wordingB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    changeEvents: [
      {
        changeId: SID("chg-src-1"),
        changedNodeId: SID("src-1"),
        changedKind: "source",
        reason: "MG11 arrival time corrected",
        beforeContentHash: beforeHash,
        afterContentHash: afterHash,
        withdrawn: false,
      },
    ],
  };
}

/** Negative: affected sentence left identical (stale) after source change. */
export function syntheticNegativeStalePair(): EldVersionPair {
  const beforeHash = hash("source-v1");
  const afterHash = hash("source-v2-stale");
  const wordingA = "The defendant arrived at 14:02 according to the MG11.";
  const wordingB = "Custody clock started at 09:00.";

  const beforeGraph = buildGraph({
    graphId: SID("graph-before-stale"),
    sourceHash: beforeHash,
    sentenceA: wordingA,
    sentenceB: wordingB,
    exits: BASE_EXITS,
    blocksStale: true,
  });
  const afterGraph = buildGraph({
    graphId: SID("graph-after-stale"),
    sourceHash: afterHash,
    sentenceA: wordingA,
    sentenceB: wordingB,
    sentenceAStale: true,
    exits: ["view", "copy"],
    blocksStale: false,
  });

  return {
    schemaVersion: ELD_VERSION_PAIR_SCHEMA,
    pairId: SID("pair-negative-stale"),
    syntheticMatterId: SID("matter-negative-001"),
    before: draft(SID("ver-before-stale"), "before", beforeGraph, {
      [SID("sent-a")]: wordingA,
      [SID("sent-b")]: wordingB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    after: draft(SID("ver-after-stale"), "after", afterGraph, {
      [SID("sent-a")]: wordingA,
      [SID("sent-b")]: wordingB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    changeEvents: [
      {
        changeId: SID("chg-src-stale"),
        changedNodeId: SID("src-1"),
        changedKind: "source",
        reason: "MG11 corrected but draft not refreshed",
        beforeContentHash: beforeHash,
        afterContentHash: afterHash,
        withdrawn: false,
      },
    ],
  };
}

/** Positive withdraw: affected sentence removed with declared withdrawn outcome. */
export function syntheticPositiveWithdrawPair(): EldVersionPair {
  const beforeHash = hash("source-v1");
  const wordingA = "The defendant arrived at 14:02 according to the MG11.";
  const wordingB = "Custody clock started at 09:00.";

  const beforeGraph = buildGraph({
    graphId: SID("graph-before-withdraw"),
    sourceHash: beforeHash,
    sentenceA: wordingA,
    sentenceB: wordingB,
    exits: BASE_EXITS,
    blocksStale: true,
  });
  const afterGraph = buildGraph({
    graphId: SID("graph-after-withdraw"),
    sourceHash: beforeHash,
    factWithdrawn: true,
    sentenceA: wordingA,
    sentenceB: wordingB,
    includeSentenceA: false,
    exits: BASE_EXITS,
    blocksStale: true,
  });

  return {
    schemaVersion: ELD_VERSION_PAIR_SCHEMA,
    pairId: SID("pair-positive-withdraw"),
    syntheticMatterId: SID("matter-withdraw-001"),
    before: draft(SID("ver-before-withdraw"), "before", beforeGraph, {
      [SID("sent-a")]: wordingA,
      [SID("sent-b")]: wordingB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    after: draft(SID("ver-after-withdraw"), "after", afterGraph, {
      [SID("sent-b")]: wordingB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    changeEvents: [
      {
        changeId: SID("chg-fact-withdraw"),
        changedNodeId: SID("fact-1"),
        changedKind: "fact",
        reason: "Supporting fact withdrawn",
        beforeContentHash: hash(`fact:${beforeHash}`),
        afterContentHash: null,
        withdrawn: true,
      },
    ],
  };
}

/** Mutation: unaffected sentence rewritten (collateral rewrite). */
export function syntheticMutationCollateralPair(): EldVersionPair {
  const beforeHash = hash("source-v1");
  const afterHash = hash("source-v2");
  const beforeWordingA = "The defendant arrived at 14:02 according to the MG11.";
  const afterWordingA = "The defendant arrived at 14:17 according to the revised MG11.";
  const beforeB = "Custody clock started at 09:00.";
  const afterB = "Custody clock started at 09:05."; // collateral mutation

  const beforeGraph = buildGraph({
    graphId: SID("graph-before-mut"),
    sourceHash: beforeHash,
    sentenceA: beforeWordingA,
    sentenceB: beforeB,
    exits: BASE_EXITS,
    blocksStale: true,
  });
  const afterGraph = buildGraph({
    graphId: SID("graph-after-mut"),
    sourceHash: afterHash,
    sentenceA: afterWordingA,
    sentenceB: afterB,
    exits: BASE_EXITS,
    blocksStale: true,
  });

  return {
    schemaVersion: ELD_VERSION_PAIR_SCHEMA,
    pairId: SID("pair-mutation-collateral"),
    syntheticMatterId: SID("matter-mutation-001"),
    before: draft(SID("ver-before-mut"), "before", beforeGraph, {
      [SID("sent-a")]: beforeWordingA,
      [SID("sent-b")]: beforeB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    after: draft(SID("ver-after-mut"), "after", afterGraph, {
      [SID("sent-a")]: afterWordingA,
      [SID("sent-b")]: afterB,
    }, { warnings: [WARNING], approvals: [APPROVAL] }),
    changeEvents: [
      {
        changeId: SID("chg-src-mut"),
        changedNodeId: SID("src-1"),
        changedKind: "source",
        reason: "MG11 corrected",
        beforeContentHash: beforeHash,
        afterContentHash: afterHash,
        withdrawn: false,
      },
    ],
  };
}

/** Receipt loss mutation: warnings/approvals dropped on after. */
export function syntheticMutationReceiptLossPair(): EldVersionPair {
  const pair = syntheticPositiveUpdatePair();
  return {
    ...pair,
    pairId: SID("pair-mutation-receipt-loss"),
    syntheticMatterId: SID("matter-receipt-loss-001"),
    after: {
      ...pair.after,
      versionId: SID("ver-after-receipt-loss"),
      warnings: [],
      approvals: [],
    },
  };
}

/** Orphan conclusion graph (after fact withdrawn, conclusion remains). */
export function syntheticOrphanConclusionGraph(): EldDependencyGraph {
  return buildGraph({
    graphId: SID("graph-orphan-conc"),
    sourceHash: hash("source-orphan"),
    conclusionOrphan: "fact_withdrawn",
    sentenceA: "Orphan-linked sentence.",
    sentenceB: "Independent sentence.",
    includeSentenceA: true,
    includeSentenceB: false,
    exits: ["view"],
    blocksStale: true,
  });
}

/** Graph with conclusion that has no supporting fact edge. */
export function syntheticOrphanNoFactGraph(): EldDependencyGraph {
  return buildGraph({
    graphId: SID("graph-orphan-nofact"),
    sourceHash: hash("source-orphan-nf"),
    conclusionOrphan: "no_fact",
    sentenceA: "Sentence without fact chain.",
    sentenceB: "x",
    includeSentenceB: false,
    exits: ["view"],
    blocksStale: true,
  });
}

/** Graph with conclusion that has facts but no dependent sentence edge. */
export function syntheticOrphanNoSentenceGraph(): EldDependencyGraph {
  return buildGraph({
    graphId: SID("graph-orphan-nosent"),
    sourceHash: hash("source-orphan-ns"),
    conclusionOrphan: "no_sentence",
    sentenceA: "Unlinked sentence node present without conclusion edge.",
    sentenceB: "x",
    includeSentenceA: true,
    includeSentenceB: false,
    exits: ["view"],
    blocksStale: true,
  });
}

/** Unavailable: empty/minimal pair with no change events and no graphs usable for live adapters. */
export function syntheticUnavailableEmptyPair(): EldVersionPair {
  const emptyGraph: EldDependencyGraph = {
    schemaVersion: ELD_DEPENDENCY_GRAPH_SCHEMA,
    graphId: SID("graph-unavailable"),
    nodes: [],
    edges: [],
  };
  return {
    schemaVersion: ELD_VERSION_PAIR_SCHEMA,
    pairId: SID("pair-unavailable"),
    syntheticMatterId: SID("matter-unavailable-001"),
    before: draft(SID("ver-before-unavail"), "before", emptyGraph, {}),
    after: draft(SID("ver-after-unavail"), "after", emptyGraph, {}),
    changeEvents: [],
  };
}

export const SYNTHETIC_VERSION_PAIRS = {
  positiveUpdate: syntheticPositiveUpdatePair,
  negativeStale: syntheticNegativeStalePair,
  positiveWithdraw: syntheticPositiveWithdrawPair,
  mutationCollateral: syntheticMutationCollateralPair,
  mutationReceiptLoss: syntheticMutationReceiptLossPair,
  unavailableEmpty: syntheticUnavailableEmptyPair,
} as const;
