export type PracticeArea = "general" | "pi" | "clinical_negligence";

export type PiCaseStage =
  | "intake"
  | "investigation"
  | "liability"
  | "quantum"
  | "settlement"
  | "closed";

export type PiCaseType = "pi" | "clinical_negligence";

export type PiCaseRecord = {
  id: string;
  org_id: string;
  case_type: PiCaseType;
  accident_date: string | null;
  date_of_knowledge: string | null;
  limitation_date: string | null;
  client_dob: string | null;
  liability_stance: string | null;
  injury_description: string | null;
  injury_severity: string | null;
  employment_status: string | null;
  loss_of_earnings_estimate: number | null;
  special_damages_estimate: number | null;
  general_damages_band: string | null;
  stage: PiCaseStage;
  oic_track: string | null;
  injury_summary: string | null;
  whiplash_tariff_band: string | null;
  prognosis_months_min: number | null;
  prognosis_months_max: number | null;
  psych_injury: boolean | null;
  treatment_recommended: string | null;
  medco_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type PiMedicalReport = {
  id: string;
  case_id: string;
  org_id: string;
  expert_name: string | null;
  specialism: string | null;
  report_type: string | null;
  instruction_date: string | null;
  report_due_date: string | null;
  report_received_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PiOfferStatus = "open" | "accepted" | "rejected" | "lapsed";

export type PiOffer = {
  id: string;
  case_id: string;
  org_id: string;
  party: "claimant" | "defendant";
  amount: number;
  date_made: string;
  deadline_to_respond: string | null;
  status: PiOfferStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PiHearing = {
  id: string;
  case_id: string;
  org_id: string;
  hearing_type: string | null;
  date: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PiDisbursement = {
  id: string;
  case_id: string;
  org_id: string;
  category: string | null;
  amount: number;
  incurred_date: string | null;
  paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PiLetterTemplate = {
  id: string;
  org_id: string | null;
  code: string;
  name: string;
  description: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};


