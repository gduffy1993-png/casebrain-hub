import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

/** Review-confidence status — not a legal guarantee. */
export type ConfidenceDashboardStatus =
  | "ready_for_solicitor_review"
  | "provisional"
  | "needs_source_review"
  | "blocked_pending_material"
  | "insufficient_information";

export const CONFIDENCE_DASHBOARD_STATUS_LABELS: Readonly<Record<ConfidenceDashboardStatus, string>> = {
  ready_for_solicitor_review: "Ready for solicitor review",
  provisional: "Provisional",
  needs_source_review: "Needs source review",
  blocked_pending_material: "Blocked pending material",
  insufficient_information: "Insufficient information",
};

export type EvidenceStateCounts = {
  available: boolean;
  served: number;
  referred_only: number;
  missing: number;
  incomplete: number;
  not_safely_confirmed: number;
  provisional_or_needs_review: number;
};

export type OutputSendabilityRow = {
  outputId: string;
  label: string;
  sendability: SendabilityLevel;
  sendabilityLabel: string;
  sourceStateSupport: "present" | "partial" | "missing";
  warningCount: number | null;
  exportId: string | null;
};

export type FeedbackSummary = {
  hasFeedback: boolean;
  blocking: number;
  warning: number;
  polish: number;
  exportRelated: number;
  unsafeOrOverstated: number;
  latestTimestamp: string | null;
};

export type SourceStateCoverage = {
  labelledOutputs: number;
  totalOutputs: number;
  complete: boolean;
  missingLabelOutputs: string[];
  sendableWithoutSourceSupport: boolean;
};

export type ConfidenceDashboardModel = {
  status: ConfidenceDashboardStatus;
  statusLabel: string;
  reviewDisclaimer: string;
  evidenceCounts: EvidenceStateCounts;
  /** CanonicalMatterStateV1.fingerprint echoed for cross-surface proof. */
  canonicalFingerprint: string | null;
  outputSendability: OutputSendabilityRow[];
  unresolvedWork: string[];
  riskWarnings: string[];
  recentChanges: string[];
  recommendedAction: string;
  feedbackSummary: FeedbackSummary;
  sourceCoverage: SourceStateCoverage;
};

export type DashboardRiskKind =
  | "possible_false_served"
  | "wrong_defendant_bleed"
  | "wrong_family_bleed"
  | "attribution_issue"
  | "court_cps_separation"
  | "unsafe_outcome_wording"
  | "new_material_position"
  | "not_safely_confirmed";

export type DashboardFeedbackInput = {
  blocking: number;
  warning: number;
  polish: number;
  exportRelated: number;
  unsafeOrOverstated: number;
  latestTimestamp: string | null;
};

export type DashboardRecentChangesInput = {
  rerunDiffHeadline: string | null;
  rerunDiffLines: string[];
  rerunHasBaseline: boolean;
  adviceChangeSummary: string | null;
  adviceChangeItemCount: number;
  adviceHasBaseline: boolean;
  exportId: string | null;
  exportGeneratedAt: string | null;
  auditConcernCount: number;
};

export type BuildConfidenceDashboardInput = {
  documentCount: number;
  evidenceRows: Array<{ existence: string; reliability?: string; sourceAnchor?: string | null }>;
  chaseItems: Array<{ label: string; baseStatus?: string | null; source?: string | null }>;
  matterLevel: string | null;
  missingMaterialLabels: string[];
  contradictions: Array<{ kind: string; label: string }>;
  mustNotOverstate: string[];
  outstandingChaseLabels: string[];
  exportSections: Array<{
    id: string;
    title: string;
    sendability: SendabilityLevel;
    sendabilityLabel: string;
    blockedReason: string | null;
  }>;
  exportVersion: { exportId: string; generatedAt: string; warningCount: number } | null;
  courtNoteSendability: SendabilityLevel | null;
  courtNoteSendabilityLabel: string | null;
  sourceBadges: SourceStateKind[];
  feedback: DashboardFeedbackInput;
  recent: DashboardRecentChangesInput;
};
