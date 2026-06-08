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

export type CriminalMeta = {
  charges?: Array<{
    offence: string;
    section?: string | null;
    date?: string | null;
    location?: string | null;
    value?: number | null;
    details?: string | null;
  }> | null;
  court?: "Crown Court" | "Magistrates Court" | null;
  courtName?: string | null;
  nextHearing?: string | null;
  hearingType?: "Plea Hearing" | "Trial" | "Sentencing" | "First Hearing" | null;
  bailStatus?: "bailed" | "remanded" | "police_bail" | null;
  bailConditions?: string[] | null;
  plea?: string | null;
  prosecutionEvidence?: Array<{
    type: "witness_statement" | "CCTV" | "forensic" | "police_statement" | "confession" | "other";
    witness?: string | null;
    date?: string | null;
    credibility?: "high" | "medium" | "low" | null;
    content?: string | null;
    issues?: string[] | null;
  }> | null;
  defenseEvidence?: Array<{
    type: "alibi" | "character" | "expert" | "other";
    witness?: string | null;
    statement?: string | null;
    date?: string | null;
    credibility?: "high" | "medium" | "low" | null;
  }> | null;
  paceCompliance?: {
    cautionGiven?: boolean | null;
    cautionGivenBeforeQuestioning?: boolean | null;
    interviewRecorded?: boolean | null;
    rightToSolicitor?: boolean | null;
    detentionTime?: number | null;
  } | null;
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
  criminalMeta?: CriminalMeta;
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

