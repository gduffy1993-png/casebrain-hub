import type {
  LatestEvidenceSnapshot,
  LatestExportReview,
  LatestReasoningFeedback,
  LatestSupervisorSignoff,
  SupervisorQueuePersistenceBundle,
} from "./build-supervisor-queue";

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function readinessRank(level: string | null | undefined): number {
  if (level === "red") return 3;
  if (level === "amber") return 2;
  if (level === "green") return 1;
  return 0;
}

function signoffUrgency(signoff: LatestSupervisorSignoff): number {
  if (signoff.status === "escalated") return 5;
  if (signoff.qaStatus === "required" || signoff.status === "pending") return 4;
  if (signoff.qaStatus === "suggested") return 3;
  if (signoff.status === "reviewed") return 2;
  if (signoff.status === "no_issue") return 1;
  return 0;
}

function mergeSignoffs(
  a: LatestSupervisorSignoff | null,
  b: LatestSupervisorSignoff | null,
): LatestSupervisorSignoff | null {
  if (!a) return b;
  if (!b) return a;
  const urgencyDiff = signoffUrgency(a) - signoffUrgency(b);
  if (urgencyDiff !== 0) return urgencyDiff > 0 ? a : b;
  return parseTime(a.createdAt) >= parseTime(b.createdAt) ? a : b;
}

function mergeSnapshots(
  a: LatestEvidenceSnapshot | null,
  b: LatestEvidenceSnapshot | null,
): LatestEvidenceSnapshot | null {
  if (!a) return b;
  if (!b) return a;
  const rankA = readinessRank(a.readinessLevel);
  const rankB = readinessRank(b.readinessLevel);
  const base = rankA >= rankB ? a : b;
  const other = rankA >= rankB ? b : a;
  return {
    ...base,
    humanReviewRequired: base.humanReviewRequired || other.humanReviewRequired,
    routeLabel: base.routeLabel || other.routeLabel,
    createdAt:
      parseTime(base.createdAt) >= parseTime(other.createdAt)
        ? base.createdAt
        : other.createdAt,
  };
}

function mergeFeedback(
  a: LatestReasoningFeedback | null,
  b: LatestReasoningFeedback | null,
): LatestReasoningFeedback | null {
  if (!a) return b;
  if (!b) return a;
  return parseTime(a.createdAt) >= parseTime(b.createdAt) ? a : b;
}

function mergeExportReview(
  a: LatestExportReview | null,
  b: LatestExportReview | null,
): LatestExportReview | null {
  if (!a) return b;
  if (!b) return a;
  const aNeeds =
    a.reviewStatus === "needs_review" ||
    (a.solicitorReviewRequired && a.reviewStatus !== "reviewed");
  const bNeeds =
    b.reviewStatus === "needs_review" ||
    (b.solicitorReviewRequired && b.reviewStatus !== "reviewed");
  if (aNeeds && !bNeeds) return a;
  if (bNeeds && !aNeeds) return b;
  return parseTime(a.createdAt) >= parseTime(b.createdAt) ? a : b;
}

export function emptySupervisorQueuePersistenceBundle(): SupervisorQueuePersistenceBundle {
  return {
    signoff: null,
    snapshot: null,
    feedback: null,
    exportReview: null,
    auditEvents: [],
  };
}

export function supervisorQueuePersistenceBundleHasSignals(
  bundle: SupervisorQueuePersistenceBundle,
): boolean {
  return Boolean(
    bundle.signoff ||
      bundle.snapshot ||
      bundle.feedback ||
      bundle.exportReview ||
      bundle.auditEvents.length,
  );
}

/** Merge persisted supervisor queue signals with computed current-case signals. */
export function mergeSupervisorQueuePersistenceBundles(
  persisted: SupervisorQueuePersistenceBundle | null | undefined,
  computed: SupervisorQueuePersistenceBundle | null | undefined,
): SupervisorQueuePersistenceBundle {
  const p = persisted ?? emptySupervisorQueuePersistenceBundle();
  const c = computed ?? emptySupervisorQueuePersistenceBundle();
  const auditEvents = [...p.auditEvents];
  for (const event of c.auditEvents) {
    if (!auditEvents.some((e) => e.eventType === event.eventType && e.createdAt === event.createdAt)) {
      auditEvents.push(event);
    }
  }
  auditEvents.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));

  return {
    signoff: mergeSignoffs(p.signoff, c.signoff),
    snapshot: mergeSnapshots(p.snapshot, c.snapshot),
    feedback: mergeFeedback(p.feedback, c.feedback),
    exportReview: mergeExportReview(p.exportReview, c.exportReview),
    auditEvents: auditEvents.slice(0, 5),
  };
}
