import type { KeyFactsKeyDate, PracticeArea, Severity } from "@/lib/types/casebrain";

export type CaseSolicitorRole =
  | "family_solicitor"
  | "housing_solicitor"
  | "pi_solicitor"
  | "clinical_neg_solicitor"
  | "criminal_solicitor"
  | "general_litigation_solicitor";

export const CASE_SOLICITOR_ROLES: CaseSolicitorRole[] = [
  "family_solicitor",
  "housing_solicitor",
  "pi_solicitor",
  "clinical_neg_solicitor",
  "criminal_solicitor",
  "general_litigation_solicitor",
];

export type DomainKey =
  | "incident_accident"
  | "hospital_medical"
  | "police_procedural"
  | "disclosure_integrity"
  | "expert_opinion"
  | "damages_impact";

export const DOMAIN_ORDER: DomainKey[] = [
  "incident_accident",
  "hospital_medical",
  "police_procedural",
  "disclosure_integrity",
  "expert_opinion",
  "damages_impact",
];

export type DomainTimelineHighlight = {
  dateISO: string;
  label: string;
  sourceDocIds?: string[];
};

export type DomainSummary = {
  domain: DomainKey;
  title: string;
  sourceDocIds: string[];
  relevanceScore: number; // for default expanded selection
  keyFacts: string[];
  timelineHighlights: DomainTimelineHighlight[];
  contradictionsOrUncertainties: string[];
  missingEvidence: Array<{ label: string; priority?: Severity; notes?: string }>;
  helpsHurts: string[];
};

export type RoleLens = {
  role: CaseSolicitorRole;
  title: string;
  whatMattersMost: string[];
  primaryRisk: string;
  recommendedNextMove: string;
  topDomains: DomainKey[];
  supervisorAddendum: {
    topRisks: string[];
    upcomingDeadlines: string[];
    spendGuardrails: string[];
    escalationTriggers: string[];
  };
};

export type LayeredSummary = {
  version: 1;
  computedAt: string;
  practiceArea: PracticeArea;
  source: {
    documentIds: string[];
    totalPages?: number;
    latestAnalysisVersion?: number | null;
    keyFactsHash: string;
  };
  isLargeBundleMode: boolean;
  domainSummaries: DomainSummary[];
  roleLenses: Record<CaseSolicitorRole, RoleLens>;
};

export type LayeredSummaryBuildInput = {
  practiceArea: PracticeArea;
  documents: Array<{
    id: string;
    name?: string | null;
    type?: string | null;
    extracted_json?: unknown;
    created_at?: string;
  }>;
  totalPages?: number;
  latestAnalysisVersion?: number | null;
  keyDates: KeyFactsKeyDate[];
  mainRisks: string[];
  // canonical (version) missing evidence items; keep loose & non-fatal
  versionMissingEvidence?: Array<{
    area?: string;
    label: string;
    priority?: string;
    notes?: string;
  }>;
};


