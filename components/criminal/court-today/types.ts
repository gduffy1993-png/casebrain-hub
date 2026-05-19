import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

export type CourtReadiness = "green" | "amber" | "red" | "review";

export type HearingBucket = "today" | "tomorrow" | "this_week" | "no_hearing";

export type CourtCasesApiRow = {
  id: string;
  title: string;
  updated_at?: string | null;
  next_hearing_date?: string | null;
  next_hearing_type?: string | null;
  offence_label?: string | null;
  strategy_recorded?: boolean;
  strategy_preview?: string | null;
  disclosure_outstanding?: number | null;
};

export type CourtCaseBrief = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingLabel: string;
  hearingTimeLabel: string | null;
  hearingBucket: HearingBucket;
  bundleHealth: string;
  positionStatus: string;
  readiness: CourtReadiness;
  primaryRouteTitle: string;
  biggestRisk: string;
  nextAction: string;
  chaseItems: string[];
  chaseSummary: string;
  safeCourtLine: string;
  controlRoomHref: string;
  disclosureChaseHref: string;
  strategyHref: string;
};

export type CourtTodayEnrichment = {
  battleboard?: BattleboardOutput | null;
};
