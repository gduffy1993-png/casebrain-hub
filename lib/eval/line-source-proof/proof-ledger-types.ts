import type { ChaseGateFamily } from "@/lib/criminal/chase-source-gate";
import type { ExtendedSuppressionFamily } from "./suppression-families";
import type {
  CaseProofChainAppendix,
  LineSourceProofRecord,
  ProofChainStatus,
  ReviewTier,
} from "./types";

export type SuppressedProofStatus =
  | "correctly_suppressed_no_source"
  | "correctly_suppressed_wrong_surface"
  | "correctly_suppressed_overclaim"
  | "needs_review_possible_false_suppression";

export type RewriteChangeType =
  | "overclaim_softened"
  | "confirm_none"
  | "provisional_wording"
  | "human_label"
  | "mg6_label"
  | "attribution_guard"
  | "other";

export type EntityRole =
  | "defendant"
  | "co_defendant"
  | "complainant"
  | "officer"
  | "witness"
  | "phone_subscriber"
  | "phone_user"
  | "vehicle_owner"
  | "driver"
  | "encro_handle";

export type EntityRiskType =
  | "co_def_bleed"
  | "subscriber_treated_as_user"
  | "owner_treated_as_driver"
  | "handle_treated_as_defendant"
  | "attribution_unsupported"
  | "other_defendant_material";

export type SurfaceDestination =
  | "cps_chase"
  | "court_note"
  | "client_summary"
  | "internal_review"
  | "proof_report"
  | "war_room"
  | "export_pack"
  | "other";

export type EmittedLineLedgerEntry = {
  outputLine: string;
  surface: string;
  category: string;
  sourceSnippet: string | null;
  evidenceState: string | null;
  proofChainStatus: ProofChainStatus;
  verdict: string;
  reviewTier: ReviewTier;
  plainEnglishExplanation: string;
};

export type SuppressedCandidateLedgerEntry = {
  candidateText: string;
  sourceFamily: ExtendedSuppressionFamily;
  surface: string;
  reasonSuppressed: string;
  searchedTerms: string[];
  matchedTerms: string[];
  supportingSourceFound: boolean;
  proofStatus: SuppressedProofStatus;
  plainEnglishNote: string;
  unknownReason?: string;
};

export type RewriteDowngradeLedgerEntry = {
  originalCandidate: string;
  finalOutput: string;
  changeType: RewriteChangeType;
  reason: string;
  sourceSupport: string;
  beforeAfterWording: string;
  solicitorFriendlyExplanation: string;
  surface: string;
};

export type MissingExpectedOutputLedgerEntry = {
  expectedItem: string;
  sourceBasis: string;
  reasonMissing: string;
  severity: "info" | "warning";
  plainEnglishNote: string;
};

export type SourceConflictLedgerEntry = {
  sourceA: string;
  sourceB: string;
  conflictType: string;
  safeResolution: string;
  solicitorReviewRequired: boolean;
};

export type EntityPersonLedgerEntry = {
  entityLabel: string;
  role: EntityRole;
  riskType: EntityRiskType;
  outputReference: string | null;
  sourceReference: string | null;
  plainEnglishNote: string;
  solicitorReviewRequired: boolean;
};

export type SurfaceSafetyLedgerEntry = {
  surface: SurfaceDestination;
  outputLine: string;
  issue: string;
  safeAlternative: string;
  severity: "info" | "warning";
};

export type PdfTextProofChainEntry = {
  outputLine: string;
  surface: string;
  pdfPageAvailable: boolean;
  extractedSnippet: string | null;
  pageNumber: string | null;
  proofChainStatus: ProofChainStatus;
  extractionIssue: string;
  plainEnglishNote: string;
};

export type ProofLedgerSolicitorSummary = {
  verdict: "pass" | "pass_with_warnings" | "blocked";
  caseShape: string;
  whatCaseIsAbout: string;
  mainEvidenceGaps: string[];
  whatCaseBrainGotRight: string[];
  whatCaseBrainRefusedToSay: string[];
  whatWasRewrittenSafely: string[];
  whatMayBeMissing: string[];
  whatStillNeedsSolicitorReview: string[];
  keySourceAnchors: string[];
  groupedWarnings: Record<string, string[]>;
  proofMode: "pdf_backed" | "text_only";
};

export type ProofLedgerPackCounts = {
  emittedLines: number;
  suppressedCandidates: number;
  rewritesDowngrades: number;
  missingExpectedOutputs: number;
  sourceConflicts: number;
  entityRisks: number;
  surfaceSafetyIssues: number;
  positiveCorrect: number;
  cleanSourceBacked: number;
  possibleFalseSuppressions: number;
  pdfAndTextSupported: number;
  textOnlySupported: number;
  emittedUnsupported: number;
  suppressedUnsupported: number;
  outputUnsupportedAfterGate: number;
};

export type ProofLedger = {
  solicitorSummary: ProofLedgerSolicitorSummary;
  hotReviewQueue: Array<{
    tier: ReviewTier;
    surface: string;
    outputLine: string;
    reason: string;
  }>;
  emittedLines: EmittedLineLedgerEntry[];
  suppressedCandidates: SuppressedCandidateLedgerEntry[];
  rewritesDowngrades: RewriteDowngradeLedgerEntry[];
  missingExpectedOutputs: MissingExpectedOutputLedgerEntry[];
  sourceConflicts: SourceConflictLedgerEntry[];
  entityRisks: EntityPersonLedgerEntry[];
  surfaceSafety: SurfaceSafetyLedgerEntry[];
  pdfTextProofChain: PdfTextProofChainEntry[];
  counts: ProofLedgerPackCounts;
};

export type ProofLedgerRawModels = {
  chase: import("@/components/criminal/disclosure-chase/buildDisclosureChaseBrief").DisclosureChaseBrief;
  warRoom: import("@/components/criminal/hearing-war-room/buildHearingWarRoomBrief").HearingWarRoomBrief;
  doNotOverstate: string[];
};

export type ProofLedgerBuildInput = {
  caseId: string;
  caseTitle: string;
  defendant: string;
  allegation: string;
  bundleText: string;
  truthKey: import("../evidence-state-audit/types").EvidenceStateTruthKey;
  emittedLines: LineSourceProofRecord[];
  proofChainAppendix: CaseProofChainAppendix;
  sessionSuppressions: import("./proof-ledger-session").RecordedSuppression[];
  sessionRewrites: import("./proof-ledger-session").RecordedRewrite[];
};
