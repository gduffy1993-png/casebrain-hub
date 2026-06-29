/** Evidence-State Accuracy Audit — truth-key and comparison types (controlled fixtures only). */

export const TRUTH_EVIDENCE_STATES = [
  "served",
  "referred_only",
  "missing",
  "incomplete",
  "not_safely_confirmed",
  "inferred_only",
  "other_defendant_only",
] as const;

export type TruthEvidenceState = (typeof TRUTH_EVIDENCE_STATES)[number];

export type TruthKeyEvidenceItem = {
  evidence_item: string;
  evidence_type?: string;
  correct_evidence_state: TruthEvidenceState;
  source_page_anchor?: string;
  defendant_relevance?: string;
  chase_needed?: boolean;
  safe_to_rely_on?: boolean;
  must_not_say?: string[];
  expected_handling?: Record<string, string>;
};

/** Item-list truth key (proof pack / internal audit format). */
export type EvidenceStateTruthKey = {
  caseId: string;
  title?: string;
  offenceFamily?: string;
  offenceWording?: string;
  profile?: string;
  bundleStatus?: string;
  evidenceItems: TruthKeyEvidenceItem[];
  expectedChaseItems?: string[];
  expectedSendability?: string;
  mustNotSayGlobal?: string[];
  blockingFailPatterns?: string[];
};

/** Simulator v2 list-style truth key (converted to item-list internally). */
export type SimulatorV2TruthKey = {
  caseId: string;
  title?: string;
  offenceFamily?: string;
  servedEvidence?: string[];
  referredOnlyEvidence?: string[];
  missingEvidence?: string[];
  uncertainEvidence?: string[];
  expectedChaseItems?: string[];
  mustNotSayExpected?: string[];
  blockingFailPatterns?: string[];
};

export type PredictedEvidenceState =
  | "served"
  | "referred_only"
  | "missing"
  | "incomplete"
  | "not_safely_confirmed"
  | "inferred_only"
  | "other_defendant_only"
  | "provisional"
  | "unknown"
  | "unmatched";

export type AdaptedPrediction = {
  label: string;
  predictedState: PredictedEvidenceState;
  existence?: string | null;
  inferredSourceState?: string | null;
  sendability?: string | null;
  reliability?: string | null;
  source?: string | null;
};

export type CaseBrainAuditOutput = {
  caseId: string;
  generatedAt?: string;
  matterConfidence?: {
    level?: string;
    chaseSendability?: string;
    summarySendability?: string;
    safeCourtLineStatus?: string;
  };
  evidenceStates?: Array<{
    label: string;
    inferredSourceState?: string | null;
    existenceLabel?: string | null;
    sendability?: string | null;
    baseStatus?: string | null;
    source?: string | null;
  }>;
  fiveAnswersEvidenceRows?: Array<{
    label: string;
    existence?: string | null;
    reliability?: string | null;
    note?: string | null;
  }>;
  warningsAndGaps?: {
    doNotOverstate?: string[];
    hardRules?: string[];
    chaseItems?: Array<{
      label: string;
      sendabilityLabel?: string;
      copySuggestion?: string;
    }>;
  };
  courtNote?: {
    text?: string;
    sendabilityLabel?: string;
    canCopy?: boolean;
    blockedReason?: string | null;
  };
  exportVersion?: {
    sendability?: string;
    blockedReason?: string | null;
    reviewFooter?: string;
  };
  outputTextBlob?: string;
};

export type ItemComparison = {
  truthItem: string;
  truthState: TruthEvidenceState;
  predictedLabel: string | null;
  predictedState: PredictedEvidenceState | null;
  matched: boolean;
  falseServed: boolean;
  overCautious: boolean;
  stateAccurate: boolean;
  wrongDefendantBleed: boolean;
  unsafeReliance: boolean;
  notes: string[];
};

export type BlockingFailureCode =
  | "false_served"
  | "referred_marked_served"
  | "missing_marked_served"
  | "incomplete_treated_complete"
  | "inferred_stated_as_fact"
  | "wrong_defendant_bleed"
  | "wrong_family_bleed"
  | "unsafe_win_collapse_wording"
  | "blocking_pattern_in_output"
  | "unsafe_sendability"
  | "safe_line_without_source_state";

export type BlockingFailure = {
  code: BlockingFailureCode;
  severity: "blocking";
  caseId: string;
  truthItem?: string;
  message: string;
  pattern?: string;
};

export type AuditWarning = {
  code: string;
  caseId: string;
  message: string;
  truthItem?: string;
};

export type AuditMetrics = {
  totalCases: number;
  totalEvidenceItems: number;
  matchedItems: number;
  unmatchedItems: number;
  falseServedCount: number;
  falseServedRate: number;
  referredOnlyAccuracy: number | null;
  missingAccuracy: number | null;
  incompleteAccuracy: number | null;
  notSafelyConfirmedAccuracy: number | null;
  unsafeRelianceCount: number;
  unsafeRelianceRate: number;
  wrongDefendantBleedCount: number;
  wrongDefendantBleedRate: number;
  wrongFamilyBleedCount: number;
  wrongFamilyBleedRate: number | null;
  chaseAccuracy: number | null;
  overCautiousCount: number;
  overCautiousRate: number;
  /** Placeholder until court/client copy scoring is wired. */
  courtNoteSafetyRate: number | null;
  clientSummarySafetyRate: number | null;
};

export type CaseAuditResult = {
  caseId: string;
  title?: string;
  fixtureKind: "proof_pack" | "internal" | "simulator_v2";
  itemComparisons: ItemComparison[];
  blockingFailures: BlockingFailure[];
  warnings: AuditWarning[];
  chaseDetail?: import("./chase-mapping").ChaseAccuracyDetail;
  metrics: Omit<
    AuditMetrics,
    "totalCases" | "totalEvidenceItems" | "matchedItems" | "unmatchedItems"
  > & {
    evidenceItemCount: number;
    matchedItems: number;
    unmatchedItems: number;
  };
};

export type AuditRunResult = {
  disclaimer: string;
  generatedAt: string;
  harnessVersion: string;
  fixtureIds: string[];
  metrics: AuditMetrics;
  blockingFailures: BlockingFailure[];
  warnings: AuditWarning[];
  cases: CaseAuditResult[];
};
