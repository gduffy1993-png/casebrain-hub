import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";

/** Auditor-only family (violence not in pilot-workflow WorkflowProfile). */
export type AuditorFamilyProfile =
  | "fraud_account_control"
  | "pwits_phone_attribution"
  | "robbery_identification"
  | "violence_domestic_assault";

export type ManifestCertainty = "confirmed" | "uncertain";

export type AuditorMode = "standard" | "discovery";

export type AuditorCorpus = "fictional" | "real";

export type CorpusBucket = "A" | "B" | "C";

export type FixImpactCategory =
  | "global_filter"
  | "profile_rule"
  | "screen_display"
  | "truth_manifest"
  | "source_grounding"
  | "strategy_ranking"
  | "ui_permission"
  | "documents_navigation"
  | "court_today_date";

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

export type FixType =
  | "exact_truth_fix"
  | "source_grounded_fix"
  | "profile_rule_fix"
  | "wording_cleanup"
  | "ui_permission_fix"
  | "documents_navigation_fix"
  | "court_today_date_fix"
  | "uncertain_needs_review";

export type CaseTruthManifest = {
  caseId: string;
  caseTitle: string;
  profile: WorkflowProfile;
  /** Auditor family (may differ from workflow profile for violence). */
  auditorFamily?: AuditorFamilyProfile;
  manifestCertainty?: ManifestCertainty;
  sourceRef?: string;
  offenceTag?: string;
  certaintyNote?: string;
  /** Real corpus: A=firm work, B=pilot-visible, C=lab/eval (excluded from production gate). */
  corpusBucket?: CorpusBucket;
  bundleFound?: boolean;
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
  /** False for uncertain manifests / discovery-only findings. */
  manifestConfirmed: boolean;
  corpusBucket?: CorpusBucket;
  /** Lab/eval bucket — excluded from production release gate. */
  productionExcluded?: boolean;
};

export type Family40CaseManifest = CaseTruthManifest & {
  auditorFamily: AuditorFamilyProfile;
  manifestCertainty: ManifestCertainty;
  sourceRef: string;
  offenceTag: string;
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
  fixImpactCategory?: FixImpactCategory;
  blastRadius?: string;
  likelyFiles?: string[];
  regressionTestName?: string;
  badOutputSnippet?: string;
  whyItIsWrong?: string;
  correctFixPrinciple?: string;
  suggestedBetterOutput?: string;
  fixType?: FixType;
  confidence?: "high" | "medium" | "low";
  needsHumanReview?: boolean;
};

export type AuditorRunOptions = {
  pack: AuditorPackId;
  mode: AuditorMode;
  strict: boolean;
  failOnMedium: boolean;
  includeSynthetic: boolean;
  outDir: string;
  userRole: UserRoleMode;
  pilotUserId: string;
  baselinePath?: string;
  /** Reserved for future DOM checks against a running app — not used in MVP. */
  baseUrl?: string;
  limit?: number;
  offset?: number;
  familyFilter?: AuditorFamilyProfile;
  exportTrainingData?: boolean;
  /** full-960 discovery: fictional catalog (default) or read-only real cases via EVAL_ORG_ID */
  corpus?: AuditorCorpus;
  exportCaseList?: boolean;
  /** When false, only writes runs/{runId}/ (batch chunks). Default true. */
  writeLatest?: boolean;
  quietConsole?: boolean;
  batch?: boolean;
  batchChunkSize?: number;
  batchMaxCases?: number;
  /** Continue from last ok chunk in latest rollup (read-only resume). */
  batchResume?: boolean;
  /** Per-case collect timeout — default 120s. */
  batchCaseTimeoutMs?: number;
};

export type AuditorRunSummary = {
  runId: string;
  pack: AuditorPackId;
  mode: AuditorMode;
  ranAt: string;
  userRole: UserRoleMode;
  pilotUserId: string;
  dataSource: string;
  totalCases: number;
  totalSurfaces: number;
  confirmedCases: number;
  uncertainCases: number;
  passCount: number;
  weakCount: number;
  failCount: number;
  confirmedFailCount: number;
  criticalCount: number;
  highCount: number;
  confirmedHighCount: number;
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
  improvedFailures: string[];
};

export type CaseAuditResult = {
  caseId: string;
  caseTitle: string;
  profile: WorkflowProfile;
  auditorFamily?: AuditorFamilyProfile;
  manifestCertainty?: ManifestCertainty;
  sourceRef?: string;
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
