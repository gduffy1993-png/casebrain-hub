import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";

export type AuditorPackId =
  | "pilot-3"
  | "family-40"
  | "profile-clash"
  | "full-960"
  | "documents-nav"
  | "court-today-date"
  | "upload-reality-later";

export type AuditorScreen =
  | "court_today"
  | "control_room"
  | "hearing_war_room"
  | "disclosure_chase"
  | "documents"
  | "pilot_ui"
  | "strategy"
  | "source_grounding";

export type SurfaceSource = "live-builder" | "api-output" | "dom-snapshot" | "synthetic";

export type CollectionStatus = "collected" | "partial" | "missing" | "synthetic";

export type AuditorSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type IssueStatus = "pass" | "weak" | "fail" | "warn";

export type UserRoleMode = "pilot-non-admin" | "admin" | "normal";

export type ReleaseGate = "GREEN" | "AMBER" | "RED";

export type CaseTruthManifest = {
  caseId: string;
  caseTitle: string;
  profile: WorkflowProfile;
  expectedDefendant: string;
  expectedAllegation: string;
  expectedCourt: string;
  expectedHearingDate: string;
  expectedHearingTime: string;
  expectedRouteTitle: string;
  requiredConcepts: string[];
  forbiddenConcepts: RegExp[];
  forbiddenMalformedAnchors: RegExp[];
  expectedDisclosureItemCount: number;
  expectedDocumentCount: number;
  requiredNextActionConcepts?: string[];
};

export type ScreenCollection = {
  screen: AuditorScreen;
  collectionStatus: CollectionStatus;
  surfaceSource: SurfaceSource;
  payload: Record<string, unknown>;
  allText: string;
  missingSections?: string[];
};

export type AuditorIssue = {
  runId: string;
  pack: AuditorPackId;
  caseId: string;
  caseTitle: string;
  screen: AuditorScreen;
  status: IssueStatus;
  severity: AuditorSeverity;
  fingerprint: string;
  issueFamily: string;
  badText: string;
  expected: string;
  surfaceSource: SurfaceSource;
  collectionStatus: CollectionStatus;
  suggestedSharedFix: string;
  demoBlocker: boolean;
  message: string;
  releaseBlocking: boolean;
};

export type GroupedFailure = {
  fingerprint: string;
  issueFamily: string;
  severity: AuditorSeverity;
  demoBlocker: boolean;
  affectedCount: number;
  affectedCases: string[];
  affectedScreens: string[];
  examples: Array<{ caseTitle: string; screen: AuditorScreen; badText: string }>;
  expectedBehaviour: string;
  likelySharedCause: string;
  suggestedCursorFix: string;
  releaseBlocking: boolean;
};

export type AuditorRunOptions = {
  pack: AuditorPackId;
  strict: boolean;
  failOnMedium: boolean;
  includeSynthetic: boolean;
  outDir: string;
  userRole: UserRoleMode;
  pilotUserId: string;
  baselinePath?: string;
  /** Reserved for future DOM checks against a running app — not used in MVP. */
  baseUrl?: string;
};

export type AuditorRunSummary = {
  runId: string;
  pack: AuditorPackId;
  ranAt: string;
  userRole: UserRoleMode;
  pilotUserId: string;
  dataSource: string;
  totalCases: number;
  totalSurfaces: number;
  passCount: number;
  weakCount: number;
  failCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  demoBlockerCount: number;
  releaseGate: ReleaseGate;
  topFingerprints: Array<{ fingerprint: string; count: number }>;
};

export type BaselineComparison = {
  baselineRunId: string | null;
  newFailures: string[];
  fixedFailures: string[];
  repeatedFailures: string[];
  worsenedFailures: string[];
};

export type CaseAuditResult = {
  caseId: string;
  caseTitle: string;
  profile: WorkflowProfile;
  screens: ScreenCollection[];
  issues: AuditorIssue[];
  pass: boolean;
  failCount: number;
  weakCount: number;
};

export type AuditorRunResult = {
  summary: AuditorRunSummary;
  aggregate: Record<string, unknown>;
  cases: CaseAuditResult[];
  issues: AuditorIssue[];
  groups: GroupedFailure[];
  baseline?: BaselineComparison;
};
