import { filterCasesForPilotUser } from "@/lib/pilot-mode";
import {
  buildSupervisorQueueRows,
  filterSupervisorQueueRows,
  latestByCaseId,
  type SupervisorQueueCaseMeta,
  type SupervisorQueuePersistenceBundle,
} from "@/lib/criminal/supervisor-queue/build-supervisor-queue";
import {
  lintSupervisorQueueOutput,
  sanitizeSupervisorQueueLabelArray,
  supervisorQueueRowIsSafe,
} from "@/lib/criminal/supervisor-queue/supervisor-queue-sanitize";
import type {
  SupervisorQueueFilter,
  SupervisorQueueRow,
} from "@/lib/criminal/supervisor-queue/supervisor-queue-types";
import { getSupabaseAdminClient } from "@/lib/supabase";

const VALID_FILTERS = new Set<SupervisorQueueFilter>([
  "all",
  "escalated",
  "red_readiness",
  "new_material",
  "exports_need_review",
  "feedback_concerns",
  "reviewed",
]);

function parseFilter(raw: string | null): SupervisorQueueFilter {
  if (raw && VALID_FILTERS.has(raw as SupervisorQueueFilter)) {
    return raw as SupervisorQueueFilter;
  }
  return "all";
}

function sanitizeRow(row: SupervisorQueueRow): SupervisorQueueRow | null {
  const safe = {
    ...row,
    reviewReasonLabels: sanitizeSupervisorQueueLabelArray(row.reviewReasonLabels),
  };
  if (!supervisorQueueRowIsSafe(safe as unknown as Record<string, unknown>)) return null;
  if (lintSupervisorQueueOutput(JSON.stringify(safe)).length) return null;
  return safe;
}

export async function fetchSupervisorQueueForOrg(
  orgId: string,
  userId: string,
  filter: SupervisorQueueFilter = "all",
): Promise<{ ok: true; rows: SupervisorQueueRow[]; filter: SupervisorQueueFilter }> {
  const supabase = getSupabaseAdminClient();

  const { data: casesRaw, error: casesError } = await supabase
    .from("cases")
    .select("id, title, practice_area, eval_pack_id, eval_pack_name")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .limit(120);

  if (casesError) throw casesError;

  const visibleCases = filterCasesForPilotUser(casesRaw ?? [], userId);
  const caseIds = visibleCases.map((c) => c.id);
  if (!caseIds.length) {
    return { ok: true, rows: [], filter };
  }

  const { data: criminalRows } = await supabase
    .from("criminal_cases")
    .select("case_id, next_hearing_date")
    .in("case_id", caseIds);

  const hearingByCase = new Map<string, string | null>();
  for (const row of criminalRows ?? []) {
    hearingByCase.set(row.case_id, row.next_hearing_date ?? null);
  }

  const [
    signoffsRes,
    snapshotsRes,
    feedbackRes,
    exportsRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from("supervisor_signoffs")
      .select(
        "case_id, status, qa_status, reason_labels, readiness_level, evidence_change_status, created_at",
      )
      .eq("org_id", orgId)
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("evidence_change_snapshots")
      .select("case_id, readiness_level, human_review_required, route_label, created_at")
      .eq("org_id", orgId)
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("reasoning_feedback")
      .select("case_id, feedback_option, route_label, created_at")
      .eq("org_id", orgId)
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("export_reviews")
      .select(
        "case_id, export_type, review_status, solicitor_review_required, route_label, created_at",
      )
      .eq("org_id", orgId)
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("case_review_audit_events")
      .select("case_id, event_type, safe_label, created_at")
      .eq("org_id", orgId)
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(800),
  ]);

  const signoffByCase = latestByCaseId(signoffsRes.data ?? []);
  const snapshotByCase = latestByCaseId(snapshotsRes.data ?? []);
  const feedbackByCase = latestByCaseId(feedbackRes.data ?? []);
  const exportByCase = latestByCaseId(exportsRes.data ?? []);

  const auditByCase = new Map<string, Array<{ event_type: string; safe_label: string; created_at: string }>>();
  for (const row of auditRes.data ?? []) {
    const list = auditByCase.get(row.case_id) ?? [];
    if (list.length < 5) list.push(row);
    auditByCase.set(row.case_id, list);
  }

  const caseMetas: SupervisorQueueCaseMeta[] = visibleCases.map((c) => ({
    caseId: c.id,
    title: c.title ?? "Matter",
    hearingDate: hearingByCase.get(c.id) ?? null,
  }));

  const persistenceByCase = new Map<string, SupervisorQueuePersistenceBundle>();

  for (const caseId of caseIds) {
    const signoffRow = signoffByCase.get(caseId);
    const snapshotRow = snapshotByCase.get(caseId);
    const feedbackRow = feedbackByCase.get(caseId);
    const exportRow = exportByCase.get(caseId);
    const audits = auditByCase.get(caseId) ?? [];

    const bundle: SupervisorQueuePersistenceBundle = {
      signoff: signoffRow
        ? {
            status: signoffRow.status,
            qaStatus: signoffRow.qa_status,
            reasonLabels: Array.isArray(signoffRow.reason_labels)
              ? signoffRow.reason_labels
              : [],
            readinessLevel: signoffRow.readiness_level,
            evidenceChangeStatus: signoffRow.evidence_change_status,
            createdAt: signoffRow.created_at,
          }
        : null,
      snapshot: snapshotRow
        ? {
            readinessLevel: snapshotRow.readiness_level,
            humanReviewRequired: snapshotRow.human_review_required,
            routeLabel: snapshotRow.route_label,
            createdAt: snapshotRow.created_at,
          }
        : null,
      feedback: feedbackRow
        ? {
            feedbackOption: feedbackRow.feedback_option,
            routeLabel: feedbackRow.route_label,
            createdAt: feedbackRow.created_at,
          }
        : null,
      exportReview: exportRow
        ? {
            exportType: exportRow.export_type,
            reviewStatus: exportRow.review_status,
            solicitorReviewRequired: exportRow.solicitor_review_required,
            routeLabel: exportRow.route_label,
            createdAt: exportRow.created_at,
          }
        : null,
      auditEvents: audits.map((a) => ({
        eventType: a.event_type,
        safeLabel: a.safe_label,
        createdAt: a.created_at,
      })),
    };

    const hasData =
      bundle.signoff ||
      bundle.snapshot ||
      bundle.feedback ||
      bundle.exportReview ||
      bundle.auditEvents.length;
    if (hasData) persistenceByCase.set(caseId, bundle);
  }

  const built = buildSupervisorQueueRows(caseMetas, persistenceByCase, { limit: 50 });
  const filtered = filterSupervisorQueueRows(built, filter);
  const rows = filtered
    .map(sanitizeRow)
    .filter((r): r is SupervisorQueueRow => r !== null);

  return { ok: true, rows, filter: parseFilter(filter) };
}

export { parseFilter as parseSupervisorQueueFilter };
