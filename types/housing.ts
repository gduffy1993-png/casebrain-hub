export type HousingCaseStage =
  | "intake"
  | "investigation"
  | "pre_action"
  | "litigation"
  | "settlement"
  | "closed";

export type DefectType =
  | "damp"
  | "mould"
  | "leak"
  | "structural"
  | "heating"
  | "electrical"
  | "infestation"
  | "other";

export type DefectSeverity = "minor" | "moderate" | "severe" | "critical";

export type LandlordResponseType =
  | "acknowledgement"
  | "repair_scheduled"
  | "no_access"
  | "denial"
  | "partial_admission";

export type HousingCaseRecord = {
  id: string;
  org_id: string;
  tenant_name: string | null;
  tenant_dob: string | null;
  tenant_vulnerability: string[];
  property_address: string | null;
  landlord_name: string | null;
  landlord_type: string | null;
  first_report_date: string | null;
  repair_attempts_count: number;
  no_access_count: number;
  no_access_days_total: number;
  unfit_for_habitation: boolean;
  hhsrs_category_1_hazards: string[];
  hhsrs_category_2_hazards: string[];
  limitation_risk: string | null;
  limitation_date: string | null;
  stage: HousingCaseStage;
  created_at: string;
  updated_at: string;
};

export type HousingDefect = {
  id: string;
  case_id: string;
  org_id: string;
  defect_type: DefectType;
  location: string | null;
  severity: DefectSeverity | null;
  first_reported_date: string | null;
  last_reported_date: string | null;
  repair_attempted: boolean;
  repair_date: string | null;
  repair_successful: boolean | null;
  hhsrs_category: string | null;
  photos_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HousingTimelineEvent = {
  id: string;
  case_id: string;
  org_id: string;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  source_document_id: string | null;
  source_type: string;
  parties_involved: string[];
  created_at: string;
  updated_at: string;
};

export type HousingLandlordResponse = {
  id: string;
  case_id: string;
  org_id: string;
  response_date: string;
  response_type: LandlordResponseType;
  response_text: string | null;
  repair_scheduled_date: string | null;
  contractor_name: string | null;
  no_access_reason: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
};

export type HousingLetterTemplate = {
  id: string;
  org_id: string | null;
  code: string;
  name: string;
  description: string | null;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
};

