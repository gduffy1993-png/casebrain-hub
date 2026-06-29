import type { TrustFeedbackKind, TrustFeedbackTab } from "@/lib/criminal/trust/feedback/trust-feedback-types";
import type { AuditActionCategory } from "./audit-log-types";
import { AUDIT_ACTION_CATEGORY_LABELS } from "./audit-log-types";

export const AUDIT_LOG_TAB_LABELS: Readonly<Record<TrustFeedbackTab, string>> = {
  today: "Today",
  chase: "Chase",
  summary: "Summary",
  five_answers: "Five Answers",
  hearing_mode: "Hearing mode",
  export_pack: "Export Pack",
  evidence_trace: "Evidence trace",
  decision_board: "Decision board",
  advice_change_radar: "Advice change radar",
};

export const AUDIT_LOG_KIND_LABELS: Partial<Record<TrustFeedbackKind, string>> = {
  wrong: "Wrong",
  unclear: "Unclear",
  unsafe: "Unsafe",
  useful: "Useful",
  missing_issue: "Missing issue",
  bad_source: "Bad source",
  missing_evidence: "Missing evidence",
  overstated: "Overstated",
  needs_rewrite: "Needs rewrite",
  good_for_court: "Good for court",
  good_for_cps_chase: "Good for CPS chase",
  good_for_client_explanation: "Good for client explanation",
};

export function formatAuditTab(tab: TrustFeedbackTab): string {
  return AUDIT_LOG_TAB_LABELS[tab] ?? tab;
}

export function formatAuditKind(kind: TrustFeedbackKind): string {
  return AUDIT_LOG_KIND_LABELS[kind] ?? kind.replace(/_/g, " ");
}

export function formatActionCategory(cat: AuditActionCategory): string {
  return AUDIT_ACTION_CATEGORY_LABELS[cat];
}

export function maskActorUserRef(userId: string): string {
  const trimmed = userId.trim();
  if (!trimmed) return "unknown";
  if (trimmed.length <= 10) return trimmed;
  return `${trimmed.slice(0, 8)}…`;
}
