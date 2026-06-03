import type { AuditorFamilyProfile, CorpusBucket } from "./types";
import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";

export const CORPUS_PLAYBACK_SLUG = "corpus-playback";

export type PlaybackSection =
  | "routing_mismatch"
  | "court_and_hearing"
  | "disclosure_chase"
  | "thin_bundle_honesty"
  | "profile_leakage";

export type PlaybackSeverity = "unsafe" | "needs_review";

export type PlaybackFinding = {
  section: PlaybackSection;
  checkId: string;
  severity: PlaybackSeverity;
  snippet: string;
  message: string;
};

export type CorpusCasePlayback = {
  caseId: string;
  caseTitle: string;
  corpusBucket: CorpusBucket;
  documentCount: number;
  allegedOffence: string | null;
  charges: string[];
  inferenceText: string;
  inferredChargeFamily: AuditorFamilyProfile | null;
  workflowProfile: WorkflowProfile;
  auditorFamily: AuditorFamilyProfile | null;
  primaryRouteTitle: string | null;
  routeFamily: AuditorFamilyProfile | null;
  courtLines: string[];
  hearingLines: string[];
  policeStationAdjacentLines: string[];
  disclosureChaseLabels: string[];
  collapseRisks: string[];
  evidenceAnchors: string[];
  malformedLineCandidates: string[];
  thinBundleStatus: boolean;
  overallStatus: string | null;
  solicitorSafeSummary: string | null;
  findings: PlaybackFinding[];
};

export type SectionCounts = Record<PlaybackSection, number>;

export type PlaybackSummary = {
  generatedAt: string;
  orgId: string;
  totalCases: number;
  corpusBucketCounts: Record<CorpusBucket, number>;
  rosterCounts: Record<CorpusBucket, number>;
  sectionCounts: SectionCounts;
  sectionCountsRoster: SectionCounts;
  checkCounts: Record<string, number>;
  unsafeCount: number;
  needsReviewCount: number;
  previousRunAt: string | null;
  deltaChecks: Record<string, number>;
};
