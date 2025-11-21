export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type RiskFlagRecord = {
  id: string;
  org_id: string;
  case_id: string;
  source_type: string;
  source_id: string | null;
  flag_type: string;
  severity: RiskSeverity;
  description: string;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  detected_at: string;
  created_at: string;
};

