import { inferFeedbackSeverity } from "@/lib/criminal/feedback-console/infer-feedback-severity";
import type { TrustFeedbackRecord } from "@/lib/criminal/trust/feedback/trust-feedback-types";
import { maskActorUserRef } from "./audit-log-labels";
import type { AuditLogEntry } from "./audit-log-types";
import { suggestAuditActionCategories } from "./suggest-action-category";

export function buildAuditLogEntry(
  record: TrustFeedbackRecord,
  context: { caseTitle: string | null; userId: string },
): AuditLogEntry {
  const effectiveSeverity = record.severity ?? inferFeedbackSeverity(record.feedbackKind);
  return {
    ...record,
    caseTitle: context.caseTitle,
    actorUserRef: maskActorUserRef(context.userId),
    effectiveSeverity,
    suggestedActionCategories: suggestAuditActionCategories({ ...record, severity: effectiveSeverity }),
  };
}

export function filterAuditLogEntries(
  entries: AuditLogEntry[],
  filters: import("./audit-log-types").AuditLogFilters,
): AuditLogEntry[] {
  return entries.filter((entry) => {
    if (filters.caseId && entry.caseId !== filters.caseId) return false;
    if (filters.tab !== "all" && entry.tab !== filters.tab) return false;
    if (filters.feedbackKind !== "all" && entry.feedbackKind !== filters.feedbackKind) return false;
    if (filters.exportType !== "all") {
      const et = entry.exportType ?? "";
      if (et !== filters.exportType) return false;
    }
    if (filters.severity !== "all" && entry.effectiveSeverity !== filters.severity) return false;
    if (filters.concernsOnly) {
      if (entry.effectiveSeverity === "polish" && entry.feedbackKind === "useful") return false;
    }
    return true;
  });
}
