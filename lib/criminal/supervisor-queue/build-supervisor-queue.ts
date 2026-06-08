import {
  sanitizeSupervisorQueueLabel,
  sanitizeSupervisorQueueLabelArray,
} from "./supervisor-queue-sanitize";
import { buildSupervisorQueueCaseHref } from "./supervisor-queue-links";
import type {
  SupervisorQueueBucket,
  SupervisorQueueFilter,
  SupervisorQueueRow,
} from "./supervisor-queue-types";
import {
  CONCERN_FEEDBACK_OPTIONS,
  SUPERVISOR_QUEUE_FILTER_BUCKETS,
} from "./supervisor-queue-types";

export type SupervisorQueueCaseMeta = {
  caseId: string;
  title: string;
  hearingDate: string | null;
};

export type LatestSupervisorSignoff = {
  status: string;
  qaStatus: string;
  reasonLabels: string[];
  readinessLevel: string | null;
  evidenceChangeStatus: string | null;
  createdAt: string;
};

export type LatestEvidenceSnapshot = {
  readinessLevel: string;
  humanReviewRequired: boolean;
  routeLabel: string;
  createdAt: string;
};

export type LatestReasoningFeedback = {
  feedbackOption: string;
  routeLabel: string | null;
  createdAt: string;
};

export type LatestExportReview = {
  exportType: string;
  reviewStatus: string;
  solicitorReviewRequired: boolean;
  routeLabel: string | null;
  createdAt: string;
};

export type RecentAuditEvent = {
  eventType: string;
  safeLabel: string;
  createdAt: string;
};

export type SupervisorQueuePersistenceBundle = {
  signoff: LatestSupervisorSignoff | null;
  snapshot: LatestEvidenceSnapshot | null;
  feedback: LatestReasoningFeedback | null;
  exportReview: LatestExportReview | null;
  auditEvents: RecentAuditEvent[];
};

const HEARING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function isHearingSoon(hearingDate: string | null, nowMs: number): boolean {
  if (!hearingDate) return false;
  const t = parseTime(hearingDate);
  if (!t) return false;
  return t >= nowMs && t - nowMs <= HEARING_SOON_MS;
}

function readinessLevel(
  snapshot: LatestEvidenceSnapshot | null,
  signoff: LatestSupervisorSignoff | null,
): "green" | "amber" | "red" | null {
  const snap = snapshot?.readinessLevel;
  if (snap === "green" || snap === "amber" || snap === "red") return snap;
  const sign = signoff?.readinessLevel;
  if (sign === "green" || sign === "amber" || sign === "red") return sign;
  return null;
}

function hasMaterialChangeSignal(
  signoff: LatestSupervisorSignoff | null,
  auditEvents: RecentAuditEvent[],
): boolean {
  const status = signoff?.evidenceChangeStatus?.toLowerCase() ?? "";
  if (/material|source change|changed/i.test(status)) return true;
  return auditEvents.some(
    (e) =>
      e.eventType === "evidence_snapshot_saved" &&
      /material|source|changed/i.test(e.safeLabel),
  );
}

function computePriority(buckets: SupervisorQueueBucket[]): number {
  if (buckets.includes("escalated")) return 1;
  if (buckets.includes("review_required")) return 2;
  if (buckets.includes("hearing_soon_red")) return 3;
  if (buckets.includes("new_material")) return 4;
  if (buckets.includes("export_needs_review")) return 5;
  if (buckets.includes("feedback_concerns")) return 6;
  if (buckets.includes("reviewed")) return 8;
  return 7;
}

function suggestedActionFor(buckets: SupervisorQueueBucket[]): string {
  if (buckets.includes("escalated")) return "Open case — escalated supervisor review";
  if (buckets.includes("review_required")) return "Open case — supervisor review required";
  if (buckets.includes("hearing_soon_red")) return "Open case — hearing soon with red readiness";
  if (buckets.includes("new_material")) return "Compare material change before relying on position";
  if (buckets.includes("export_needs_review")) return "Review export draft before use";
  if (buckets.includes("feedback_concerns")) return "Check reasoning feedback concern";
  if (buckets.includes("reviewed")) return "Recently reviewed — spot-check if needed";
  return "Open case for supervisor review";
}

export function buildSupervisorQueueRow(
  meta: SupervisorQueueCaseMeta,
  bundle: SupervisorQueuePersistenceBundle,
  now: Date = new Date(),
): SupervisorQueueRow | null {
  const buckets: SupervisorQueueBucket[] = [];
  const nowMs = now.getTime();

  const { signoff, snapshot, feedback, exportReview, auditEvents } = bundle;
  const level = readinessLevel(snapshot, signoff);

  if (signoff?.status === "escalated") buckets.push("escalated");
  if (
    signoff?.status === "pending" ||
    signoff?.qaStatus === "required" ||
    signoff?.qaStatus === "suggested"
  ) {
    buckets.push("review_required");
  }

  if (level === "red" || snapshot?.humanReviewRequired) {
    if (level === "red") {
      buckets.push("hearing_soon_red");
    } else if (snapshot?.humanReviewRequired && signoff?.qaStatus !== "none") {
      buckets.push("hearing_soon_red");
    }
  }

  if (hasMaterialChangeSignal(signoff, auditEvents)) {
    buckets.push("new_material");
  }

  if (
    exportReview?.reviewStatus === "needs_review" ||
    (exportReview?.solicitorReviewRequired &&
      exportReview.reviewStatus !== "reviewed" &&
      exportReview.reviewStatus !== "superseded")
  ) {
    buckets.push("export_needs_review");
  }

  if (feedback && CONCERN_FEEDBACK_OPTIONS.has(feedback.feedbackOption)) {
    buckets.push("feedback_concerns");
  }

  if (
    auditEvents.some(
      (e) =>
        e.eventType === "supervisor_escalated" ||
        e.eventType === "export_marked_needs_review",
    ) &&
    !buckets.includes("escalated")
  ) {
    if (auditEvents.some((e) => e.eventType === "supervisor_escalated")) {
      buckets.push("escalated");
    }
    if (auditEvents.some((e) => e.eventType === "export_marked_needs_review")) {
      buckets.push("export_needs_review");
    }
  }

  if (signoff?.status === "reviewed" || signoff?.status === "no_issue") {
    buckets.push("reviewed");
  }

  const uniqueBuckets = [...new Set(buckets)];

  const onlyReviewed =
    uniqueBuckets.length === 1 && uniqueBuckets[0] === "reviewed";
  const hasActiveSignal = uniqueBuckets.some((b) => b !== "reviewed");
  if (onlyReviewed && !hasActiveSignal) {
    // Keep reviewed-only rows for reviewed filter but lower visibility
  }
  if (uniqueBuckets.length === 0) return null;

  const activityTimes = [
    signoff?.createdAt,
    snapshot?.createdAt,
    feedback?.createdAt,
    exportReview?.createdAt,
    ...auditEvents.map((e) => e.createdAt),
  ].map(parseTime);
  const lastActivityMs = Math.max(0, ...activityTimes);
  if (!lastActivityMs) return null;

  const caseLabel =
    sanitizeSupervisorQueueLabel(meta.title) ?? "Matter — review required";
  const reviewReasonLabels = sanitizeSupervisorQueueLabelArray(signoff?.reasonLabels ?? []);

  let materialChangeLabel: string | null = null;
  if (hasMaterialChangeSignal(signoff, auditEvents)) {
    materialChangeLabel =
      sanitizeSupervisorQueueLabel(signoff?.evidenceChangeStatus) ??
      sanitizeSupervisorQueueLabel(
        auditEvents.find((e) => e.eventType === "evidence_snapshot_saved")?.safeLabel,
      ) ??
      "Source material change flagged — compare before relying on position";
  }

  let unsafeFeedbackLabel: string | null = null;
  if (feedback && CONCERN_FEEDBACK_OPTIONS.has(feedback.feedbackOption)) {
    unsafeFeedbackLabel =
      sanitizeSupervisorQueueLabel(feedback.routeLabel) ??
      sanitizeSupervisorQueueLabel(
        feedback.feedbackOption.replace(/_/g, " "),
      );
  }

  return {
    caseId: meta.caseId,
    caseLabel,
    hearingDate: meta.hearingDate,
    readinessLevel: level,
    supervisorStatus: signoff?.status ?? null,
    reviewReasonLabels,
    materialChangeLabel,
    exportReviewStatus: exportReview?.reviewStatus ?? null,
    unsafeFeedbackLabel,
    lastActivityAt: new Date(lastActivityMs).toISOString(),
    suggestedAction: suggestedActionFor(uniqueBuckets),
    buckets: uniqueBuckets,
    priority: computePriority(uniqueBuckets),
    openCaseHref: buildSupervisorQueueCaseHref(meta.caseId),
  };
}

export function buildSupervisorQueueRows(
  cases: SupervisorQueueCaseMeta[],
  persistenceByCase: Map<string, SupervisorQueuePersistenceBundle>,
  options?: { now?: Date; limit?: number },
): SupervisorQueueRow[] {
  const now = options?.now ?? new Date();
  const limit = options?.limit ?? 50;
  const rows: SupervisorQueueRow[] = [];

  for (const meta of cases) {
    const bundle = persistenceByCase.get(meta.caseId);
    if (!bundle) continue;
    const row = buildSupervisorQueueRow(meta, bundle, now);
    if (row) rows.push(row);
  }

  rows.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return parseTime(b.lastActivityAt) - parseTime(a.lastActivityAt);
  });

  return rows.slice(0, limit);
}

export function filterSupervisorQueueRows(
  rows: SupervisorQueueRow[],
  filter: SupervisorQueueFilter,
): SupervisorQueueRow[] {
  if (filter === "all") {
    return rows.filter((r) => !r.buckets.every((b) => b === "reviewed"));
  }
  const bucket = SUPERVISOR_QUEUE_FILTER_BUCKETS[filter];
  return rows.filter((r) => r.buckets.includes(bucket));
}

/** Latest row per case_id from ordered desc rows. */
export function latestByCaseId<T extends { case_id: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.case_id)) map.set(row.case_id, row);
  }
  return map;
}
