/**
 * MAA V2 Evidence-Locked Drafting (ELD) foundation types.
 *
 * Schema + calculation surface only. No ELD control is marked implemented
 * or runnable from this module. Synthetic version pairs only — never real case IDs.
 */

export const ELD_FOUNDATION_SCHEMA = "maa-v2-eld-foundation@1.0.0" as const;
export const ELD_VERSION_PAIR_SCHEMA = "maa-v2-eld-version-pair@1.0.0" as const;
export const ELD_DEPENDENCY_GRAPH_SCHEMA = "maa-v2-eld-dependency-graph@1.0.0" as const;
export const ELD_AFFECTED_WORDING_SCHEMA = "maa-v2-eld-affected-wording@1.0.0" as const;
export const ELD_OUTCOME_SCHEMA = "maa-v2-eld-wording-outcome@1.0.0" as const;
export const ELD_RECEIPT_SCHEMA = "maa-v2-eld-receipt@1.0.0" as const;
export const ELD_EXIT_EXPECTATION_SCHEMA = "maa-v2-eld-exit-expectation@1.0.0" as const;

/** Explicit non-runnable posture for the ELD foundation. */
export const ELD_FOUNDATION_STATUS = {
  familyCode: "ELD",
  /** Batch-4 remediation: adapter foundation only — not partially_implemented detectors. */
  foundationStatus: "adapter_foundation_only",
  currentlyRunnable: false,
  countsAsFullyExercised: false,
  programmePassForbidden: true,
  note:
    "Foundation schemas + Batch-4 adapters. ELD remains specified_not_implemented / adapter_foundation_only. Synthetic fixtures alone cannot make ELD Stage-150 exercisable. Never currentlyRunnable, fully exercised, or programme PASS.",
} as const;

export type EldNodeKind =
  | "source"
  | "fact"
  | "conclusion"
  | "sentence"
  | "exit_surface"
  | "approval"
  | "warning";

export type EldExitSurface =
  | "view"
  | "copy"
  | "export"
  | "api"
  | "pdf"
  | "composed_prose";

export const ELD_ALL_EXIT_SURFACES: readonly EldExitSurface[] = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
] as const;

/**
 * Wording disposition after a source/fact change.
 * Unaffected wording must remain byte-identical → "unchanged".
 */
export type EldWordingOutcome =
  | "unchanged"
  | "updated"
  | "withdrawn"
  | "unresolved";

export type EldSyntheticId = `syn-eld-${string}`;

export type EldSourceNode = {
  nodeId: EldSyntheticId;
  kind: "source";
  label: string;
  contentHash: string;
  withdrawn: boolean;
};

export type EldFactNode = {
  nodeId: EldSyntheticId;
  kind: "fact";
  label: string;
  contentHash: string;
  withdrawn: boolean;
};

export type EldConclusionNode = {
  nodeId: EldSyntheticId;
  kind: "conclusion";
  label: string;
  contentHash: string;
  withdrawn: boolean;
};

export type EldSentenceNode = {
  nodeId: EldSyntheticId;
  kind: "sentence";
  exactWording: string;
  wordingHash: string;
  exitSurfaces: EldExitSurface[];
  stale: boolean;
};

export type EldApprovalNode = {
  nodeId: EldSyntheticId;
  kind: "approval";
  actorId: string;
  approvedAt: string;
  sentenceIds: EldSyntheticId[];
  externalUseAllowed: boolean;
};

export type EldWarningNode = {
  nodeId: EldSyntheticId;
  kind: "warning";
  code: string;
  message: string;
  attachedSentenceIds: EldSyntheticId[];
};

export type EldExitSurfaceNode = {
  nodeId: EldSyntheticId;
  kind: "exit_surface";
  exit: EldExitSurface;
  blocksStale: boolean;
};

export type EldGraphNode =
  | EldSourceNode
  | EldFactNode
  | EldConclusionNode
  | EldSentenceNode
  | EldApprovalNode
  | EldWarningNode
  | EldExitSurfaceNode;

export type EldEdgeKind =
  | "source_to_fact"
  | "fact_to_conclusion"
  | "conclusion_to_sentence"
  | "sentence_to_exit"
  | "approval_to_exit"
  | "warning_to_sentence";

export type EldDependencyEdge = {
  edgeId: EldSyntheticId;
  kind: EldEdgeKind;
  fromId: EldSyntheticId;
  toId: EldSyntheticId;
};

export type EldDependencyGraph = {
  schemaVersion: typeof ELD_DEPENDENCY_GRAPH_SCHEMA;
  graphId: EldSyntheticId;
  nodes: EldGraphNode[];
  edges: EldDependencyEdge[];
};

export type EldDraftVersion = {
  versionId: EldSyntheticId;
  label: string;
  capturedAt: string;
  graph: EldDependencyGraph;
  /** Exact wording map for byte-identity checks. */
  sentenceWording: Record<string, string>;
  warnings: EldWarningNode[];
  approvals: EldApprovalNode[];
};

/**
 * Before/after draft pair. Synthetic IDs only — never real CaseBrain case IDs.
 */
export type EldVersionPair = {
  schemaVersion: typeof ELD_VERSION_PAIR_SCHEMA;
  pairId: EldSyntheticId;
  /** Always synthetic; never a live/pilot case id. */
  syntheticMatterId: EldSyntheticId;
  before: EldDraftVersion;
  after: EldDraftVersion;
  /** Declared source/fact change events that drove the after version. */
  changeEvents: EldChangeEvent[];
};

export type EldChangeEvent = {
  changeId: EldSyntheticId;
  changedNodeId: EldSyntheticId;
  changedKind: "source" | "fact";
  reason: string;
  beforeContentHash: string;
  afterContentHash: string | null;
  withdrawn: boolean;
};

export type EldAffectedWordingResult = {
  schemaVersion: typeof ELD_AFFECTED_WORDING_SCHEMA;
  pairId: EldSyntheticId;
  changedNodeIds: EldSyntheticId[];
  affectedSentenceIds: EldSyntheticId[];
  unaffectedSentenceIds: EldSyntheticId[];
  /** Sentences present before but missing after without withdraw outcome. */
  missingAfterWithoutWithdraw: EldSyntheticId[];
};

export type EldSentenceOutcomeRecord = {
  schemaVersion: typeof ELD_OUTCOME_SCHEMA;
  sentenceId: EldSyntheticId;
  outcome: EldWordingOutcome;
  beforeWording: string | null;
  afterWording: string | null;
  byteIdentical: boolean;
  changeReason: string | null;
  affected: boolean;
};

export type EldStaleDraftFinding = {
  sentenceId: EldSyntheticId;
  reason: string;
  exitSurfaces: EldExitSurface[];
};

export type EldOrphanConclusionFinding = {
  conclusionId: EldSyntheticId;
  reason: "no_supporting_fact" | "supporting_fact_withdrawn" | "no_dependent_sentence";
};

export type EldReceiptPreservationResult = {
  schemaVersion: typeof ELD_RECEIPT_SCHEMA;
  pairId: EldSyntheticId;
  warningReceiptsPreserved: boolean;
  approvalReceiptsPreserved: boolean;
  lostWarningIds: EldSyntheticId[];
  lostApprovalIds: EldSyntheticId[];
  note: string;
};

export type EldExitBlockExpectation = {
  schemaVersion: typeof ELD_EXIT_EXPECTATION_SCHEMA;
  exit: EldExitSurface;
  mustBlockStale: true;
  expectedPresent: boolean;
  absentVerdict: "not_exercised";
};

export type EldFoundationContractKind =
  | "positive"
  | "negative"
  | "unavailable"
  | "mutation";

export type EldFoundationContractMeta = {
  contractId: string;
  kind: EldFoundationContractKind;
  controlIdPattern: string;
  description: string;
  currentlyRunnable: false;
  implementationStatus: "specified_not_implemented";
};
