import type {
  TrustFeedbackKind,
  TrustFeedbackRecord,
  TrustFeedbackSeverity,
  TrustFeedbackTab,
} from "@/lib/criminal/trust/feedback/trust-feedback-types";

/** Read-only review queue row — trust feedback + safe case context. */
export type AuditLogEntry = TrustFeedbackRecord & {
  caseTitle: string | null;
  /** Truncated user id — no PII beyond org membership. */
  actorUserRef: string;
  effectiveSeverity: TrustFeedbackSeverity;
  suggestedActionCategories: AuditActionCategory[];
};

export type AuditLogSeverityFilter = TrustFeedbackSeverity | "all";

export type AuditLogFilters = {
  severity: AuditLogSeverityFilter;
  tab: TrustFeedbackTab | "all";
  feedbackKind: TrustFeedbackKind | "all";
  exportType: string | "all";
  caseId: string | null;
  concernsOnly: boolean;
};

export type AuditLogFilterQuery = {
  severity?: string | null;
  tab?: string | null;
  kind?: string | null;
  exportType?: string | null;
  caseId?: string | null;
  concernsOnly?: string | null;
};

/** Suggested triage tags — display only; not persisted this slice. */
export type AuditActionCategory =
  | "no_action"
  | "wording_polish"
  | "source_state_issue"
  | "export_issue"
  | "possible_false_served"
  | "wrong_defendant_bleed"
  | "wrong_family_bleed"
  | "add_to_bad_output_memory"
  | "add_to_simulator_or_golden_pack";

export const AUDIT_ACTION_CATEGORY_LABELS: Readonly<Record<AuditActionCategory, string>> = {
  no_action: "No action",
  wording_polish: "Wording polish",
  source_state_issue: "Source-state issue",
  export_issue: "Export issue",
  possible_false_served: "Possible false-served",
  wrong_defendant_bleed: "Wrong-defendant bleed",
  wrong_family_bleed: "Wrong-family bleed",
  add_to_bad_output_memory: "Bad Output Memory candidate",
  add_to_simulator_or_golden_pack: "Simulator / golden pack candidate",
};
