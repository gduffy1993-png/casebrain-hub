import { filterCasesForPilotUser } from "@/lib/pilot-mode";
import {
  mapTrustFeedbackRowToRecord,
  type TrustFeedbackRow,
} from "@/lib/criminal/trust/feedback/trust-feedback-validate";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildAuditLogEntry, filterAuditLogEntries } from "./build-audit-log-entry";
import type { AuditLogEntry, AuditLogFilters } from "./audit-log-types";

const MAX_ROWS = 250;

export async function fetchAuditLogForOrg(
  orgId: string,
  userId: string,
  filters: AuditLogFilters,
): Promise<{ ok: true; entries: AuditLogEntry[]; filters: AuditLogFilters }> {
  const supabase = getSupabaseAdminClient();

  let feedbackQuery = supabase
    .from("trust_feedback")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (filters.caseId) {
    feedbackQuery = feedbackQuery.eq("case_id", filters.caseId);
  }
  if (filters.tab !== "all") {
    feedbackQuery = feedbackQuery.eq("tab", filters.tab);
  }
  if (filters.feedbackKind !== "all") {
    feedbackQuery = feedbackQuery.eq("feedback_kind", filters.feedbackKind);
  }
  if (filters.exportType !== "all") {
    feedbackQuery = feedbackQuery.eq("export_type", filters.exportType);
  }
  if (filters.severity !== "all") {
    feedbackQuery = feedbackQuery.eq("severity", filters.severity);
  }

  const { data: feedbackRows, error: feedbackError } = await feedbackQuery;
  if (feedbackError) throw feedbackError;

  const rows = (feedbackRows ?? []) as TrustFeedbackRow[];
  if (!rows.length) {
    return { ok: true, entries: [], filters };
  }

  const caseIds = [...new Set(rows.map((r) => r.case_id))];
  const { data: casesRaw, error: casesError } = await supabase
    .from("cases")
    .select("id, title, practice_area, eval_pack_id, eval_pack_name")
    .eq("org_id", orgId)
    .in("id", caseIds);

  if (casesError) throw casesError;

  const visibleCases = filterCasesForPilotUser(casesRaw ?? [], userId);
  const titleByCaseId = new Map(visibleCases.map((c) => [c.id as string, (c.title as string) ?? null]));
  const visibleCaseIds = new Set(visibleCases.map((c) => c.id as string));

  const entries: AuditLogEntry[] = [];
  for (const row of rows) {
    if (!visibleCaseIds.has(row.case_id)) continue;
    const record = mapTrustFeedbackRowToRecord(row);
    entries.push(
      buildAuditLogEntry(record, {
        caseTitle: titleByCaseId.get(row.case_id) ?? null,
        userId: row.user_id,
      }),
    );
  }

  return {
    ok: true,
    entries: filterAuditLogEntries(entries, filters),
    filters,
  };
}
