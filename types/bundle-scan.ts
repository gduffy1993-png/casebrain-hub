export type BundleScanRiskSeverity = "low" | "medium" | "high" | "critical";

export type BundleScanItemType =
  | "missing_surveyor_report"
  | "missing_hazard_grading"
  | "no_medical_evidence"
  | "no_disclosure"
  | "no_lba"
  | "late_response"
  | "expired_limitation"
  | "pi_overlap"
  | "missing_schedule"
  | "outdated_report"
  | "missing_tenant_evidence"
  | "incomplete_timeline";

export type BundleScanRecord = {
  id: string;
  case_id: string;
  org_id: string;
  scanned_at: string;
  scanned_by: string;
  overall_risk: BundleScanRiskSeverity;
  total_issues: number;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type BundleScanItemRecord = {
  id: string;
  scan_id: string;
  item_type: BundleScanItemType;
  severity: BundleScanRiskSeverity;
  title: string;
  description: string | null;
  recommendation: string | null;
  document_reference: string | null;
  created_at: string;
};

export type BundleScanResult = {
  scan: BundleScanRecord;
  items: BundleScanItemRecord[];
};

