export type PartyRole = "claimant" | "defendant" | "client" | "opponent" | "other";

export type CaseParty = {
  name: string;
  role: PartyRole;
  reference?: string | null;
};

export type CaseAmount = {
  label: string;
  value: number;
  currency: string;
};

export type CaseDate = {
  label: string;
  isoDate: string;
  description?: string;
};

export type TimelineEventSource = "document" | "user" | "system" | "ai" | "email";

export type TimelineEvent = {
  id: string;
  date: string;
  label: string;
  description: string;
  source: TimelineEventSource;
  metadata?: Record<string, unknown>;
};

export type PiMeta = {
  oicTrack?: "OIC" | "MOJ" | "Litigated" | "Unknown" | null;
  injurySummary?: string | null;
  whiplashTariffBand?: string | null;
  prognosisMonthsMin?: number | null;
  prognosisMonthsMax?: number | null;
  psychInjury?: boolean | null;
  treatmentRecommended?: string | null;
  medcoReference?: string | null;
  liabilityStance?: "admitted" | "denied" | "partial" | "unknown" | null;
};

export type HousingMeta = {
  tenantVulnerability?: string[] | null;
  propertyDefects?: Array<{
    type: string;
    location?: string | null;
    severity?: string | null;
    firstReported?: string | null;
  }> | null;
  landlordResponses?: Array<{
    date: string;
    type: string;
    text?: string | null;
  }> | null;
  hhsrsHazards?: string[] | null;
  unfitForHabitation?: boolean | null;
  noAccessDays?: number | null;
  repairAttempts?: number | null;
};

export type ExtractedCaseFacts = {
  parties: CaseParty[];
  dates: CaseDate[];
  amounts: CaseAmount[];
  claimType: string;
  summary: string;
  keyIssues: string[];
  timeline: TimelineEvent[];
  piMeta?: PiMeta;
  housingMeta?: HousingMeta;
};

export type LetterTemplateVariables =
  | "client"
  | "opponent"
  | "ref"
  | "deadline"
  | "facts";

export type LetterTemplate = {
  id: string;
  name: string;
  bodyTemplate: string;
  variables: LetterTemplateVariables[];
};

export type LetterDraftInput = {
  template: LetterTemplate;
  facts: ExtractedCaseFacts;
  notes?: string;
  actingFor: "claimant" | "defendant";
};

export type LetterDraftOutput = {
  body: string;
  reasoning: string;
  risks: string[];
};

export type CaseSummary = {
  summary: string;
  bulletPoints: string[];
};

