import type {
  TrustFeedbackKind,
  TrustFeedbackTab,
} from "@/lib/criminal/trust/feedback/trust-feedback-types";
import type { AuditLogFilterQuery, AuditLogFilters, AuditLogSeverityFilter } from "./audit-log-types";

const TABS: ReadonlySet<TrustFeedbackTab> = new Set([
  "today",
  "chase",
  "summary",
  "five_answers",
  "hearing_mode",
  "export_pack",
  "evidence_trace",
  "decision_board",
  "advice_change_radar",
]);

const KINDS: ReadonlySet<TrustFeedbackKind> = new Set([
  "wrong",
  "unclear",
  "unsafe",
  "useful",
  "missing_issue",
  "bad_source",
  "missing_evidence",
  "overstated",
  "needs_rewrite",
  "good_for_court",
  "good_for_cps_chase",
  "good_for_client_explanation",
]);

const SEVERITIES: ReadonlySet<AuditLogSeverityFilter> = new Set(["all", "polish", "warning", "blocking"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAuditLogFilters(query: AuditLogFilterQuery): AuditLogFilters {
  const severityRaw = query.severity?.trim().toLowerCase() ?? "all";
  const severity: AuditLogSeverityFilter = SEVERITIES.has(severityRaw as AuditLogSeverityFilter)
    ? (severityRaw as AuditLogSeverityFilter)
    : "all";

  const tabRaw = query.tab?.trim() ?? "all";
  const tab: TrustFeedbackTab | "all" =
    tabRaw === "all" || !tabRaw ? "all" : TABS.has(tabRaw as TrustFeedbackTab) ? (tabRaw as TrustFeedbackTab) : "all";

  const kindRaw = query.kind?.trim() ?? "all";
  const feedbackKind: TrustFeedbackKind | "all" =
    kindRaw === "all" || !kindRaw
      ? "all"
      : KINDS.has(kindRaw as TrustFeedbackKind)
        ? (kindRaw as TrustFeedbackKind)
        : "all";

  const exportTypeRaw = query.exportType?.trim() ?? "";
  const exportType = exportTypeRaw && exportTypeRaw !== "all" ? exportTypeRaw.slice(0, 64) : "all";

  const caseIdRaw = query.caseId?.trim() ?? "";
  const caseId = caseIdRaw && UUID_RE.test(caseIdRaw) ? caseIdRaw : null;

  const concernsOnly =
    query.concernsOnly === "1" ||
    query.concernsOnly === "true" ||
    query.concernsOnly === "yes";

  return { severity, tab, feedbackKind, exportType, caseId, concernsOnly };
}

export function auditLogFiltersToSearchParams(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.severity !== "all") params.set("severity", filters.severity);
  if (filters.tab !== "all") params.set("tab", filters.tab);
  if (filters.feedbackKind !== "all") params.set("kind", filters.feedbackKind);
  if (filters.exportType !== "all") params.set("exportType", filters.exportType);
  if (filters.caseId) params.set("caseId", filters.caseId);
  if (filters.concernsOnly) params.set("concernsOnly", "1");
  return params;
}
