/**
 * Presentation-only view-model for the solicitor dashboard shell.
 * Does not change evidence/chase/extraction truth — maps existing fields for display.
 */

export type DashboardIssueStatus =
  | "missing"
  | "incomplete"
  | "unclear"
  | "not_established"
  | "referred"
  | "outstanding";

export type DashboardImpactTag =
  | "Identification"
  | "Reliability"
  | "Completeness"
  | "Court"
  | "Disclosure"
  | "Instructions";

export type DashboardAttentionIssue = {
  id: string;
  title: string;
  summary: string;
  status: DashboardIssueStatus;
  impact: DashboardImpactTag[];
  why: string;
  sources: string[];
  recommendedAction: string;
  chaseCopy: string;
  courtCopy: string;
};

export type DashboardRecentCase = {
  id: string;
  label: string;
  chargeLine: string;
  readinessPercent: number | null;
  href: string;
};

export type SolicitorDashboardVm = {
  caseId: string;
  clientLabel: string;
  chargeLabel: string;
  stageLabel: string;
  courtLabel: string;
  hearingLabel: string;
  provisional: boolean;
  readinessLabel: string;
  readinessDetail: string;
  counts: {
    missing: number;
    incomplete: number;
    notEstablished: number;
    activeChases: number;
  };
  issues: DashboardAttentionIssue[];
  safeCourtLine: string;
  clientUpdate: string;
  readinessPercent: number | null;
  readinessBreakdown: {
    evidenceGatheredPercent: number | null;
    issuesResolvedPercent: number | null;
    toBeChasedPercent: number | null;
  };
  recentCases: DashboardRecentCase[];
};
