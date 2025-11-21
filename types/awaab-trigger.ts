export type AwaabTriggerRiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type AwaabTriggerRecord = {
  id: string;
  case_id: string;
  org_id: string;
  first_report_date: string | null;
  investigation_date: string | null;
  work_start_date: string | null;
  work_complete_date: string | null;
  is_social_landlord: boolean;
  days_until_investigation_deadline: number | null;
  days_until_work_start_deadline: number | null;
  days_until_completion_deadline: number | null;
  investigation_deadline_breached: boolean;
  work_start_deadline_breached: boolean;
  completion_deadline_breached: boolean;
  overall_risk: AwaabTriggerRiskLevel;
  risk_category: number | null;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
};

