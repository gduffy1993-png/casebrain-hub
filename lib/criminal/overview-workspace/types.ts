/**
 * Overview solicitor workspace — presentation-only types.
 * Does not alter canonical evidence, LI generation, or Chase truth.
 */

export type OverviewIssueStatus =
  | "missing_outstanding"
  | "incomplete"
  | "not_safely_confirmed"
  | "contradiction"
  | "check"
  | "consider";

export type OverviewImpactTag =
  | "Identification"
  | "Sequence"
  | "Completeness"
  | "Reliability"
  | "Timing"
  | "Disclosure"
  | "Defence consideration"
  | "Court"
  | "Instructions";

export type OverviewAttentionIssue = {
  id: string;
  title: string;
  summary: string;
  status: OverviewIssueStatus;
  /** Solicitor-facing status chip (never raw SOURCE_FACT / PRACTITIONER_CONSIDERATION). */
  statusLabel: string;
  impact: OverviewImpactTag[];
  whySaysThis: string;
  sources: string[];
  whyItMatters: string;
  consider: string | null;
  recommendedAction: string | null;
  /** Set only when a source-supported Chase item backs this issue. */
  chaseCopy: string | null;
  /** Set only when court-safe wording already exists for this issue. */
  courtCopy: string | null;
  kind: "evidence_gap" | "contradiction" | "not_established" | "consideration" | "check";
  rankScore: number;
};

export type OverviewWorkspaceCounts = {
  /** Authoritative: missing + referred_only (Missing / Outstanding). */
  missingOutstanding: number;
  incomplete: number;
  activeChases: number;
  /** Optional 4th counter — only shown when > 0. */
  notSafelyConfirmed: number;
  /** Full authoritative row counts (must not change with ranking/filter). */
  evidence: {
    served: number;
    referred: number;
    missing: number;
    incomplete: number;
    notSafelyConfirmed: number;
  };
};

export type OverviewWorkspaceVm = {
  caseId: string;
  clientLabel: string;
  chargeLabel: string;
  stageLabel: string;
  courtLabel: string;
  hearingLabel: string;
  provisional: boolean;
  statusBadge: string;
  readinessBanner: string | null;
  readinessDetail: string;
  readinessCategory: "paper_backed" | "provisional" | "blocked";
  counts: OverviewWorkspaceCounts;
  /** Ranked full list (projection). UI shows top N + "View all". */
  issues: OverviewAttentionIssue[];
  safeCourtLine: string;
  /** True when court line may be copied (already court-safe). */
  safeCourtLineCanCopy: boolean;
  clientUpdate: string;
  clientUpdateAvailable: boolean;
};
