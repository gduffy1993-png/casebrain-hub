import type {
  SupervisorQueueCaseMeta,
  SupervisorQueuePersistenceBundle,
} from "./build-supervisor-queue";
import {
  buildControlRoomComputedSupervisorSignals,
  computedSupervisorSignalsQualifyForQueue,
} from "./build-control-room-computed-signals";
import { emptySupervisorQueuePersistenceBundle } from "./merge-supervisor-queue-bundles";

type DocumentRow = Record<string, unknown>;

/**
 * Derive supervisor queue buckets from the same computed signals as Control Room
 * (reasoning v2 + pre-hearing readiness + supervisor QA), without requiring DB rows.
 */
export function buildComputedSupervisorQueueBundle(
  meta: SupervisorQueueCaseMeta,
  docs: DocumentRow[],
  options?: { now?: Date; exportsEnabled?: boolean },
): SupervisorQueuePersistenceBundle | null {
  const signals = buildControlRoomComputedSupervisorSignals(meta, docs, options);
  if (!signals || !computedSupervisorSignalsQualifyForQueue(signals)) return null;

  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const { reasoning, readiness, qa } = signals;
  const readinessLevel = readiness.available ? readiness.level : null;

  const bundle = emptySupervisorQueuePersistenceBundle();

  if (qa.status !== "none") {
    bundle.signoff = {
      status: "pending",
      qaStatus: qa.status,
      reasonLabels: qa.reasonsForReview,
      readinessLevel,
      evidenceChangeStatus: qa.evidenceChangeStatus,
      createdAt: nowIso,
    };
  } else if (readinessLevel === "red" || (readiness.available && readiness.solicitorReviewRequired)) {
    bundle.signoff = {
      status: "pending",
      qaStatus: "required",
      reasonLabels: qa.reasonsForReview.length
        ? qa.reasonsForReview
        : readiness.available
          ? [readiness.label]
          : ["Supervisor review required on current papers."],
      readinessLevel,
      evidenceChangeStatus: qa.evidenceChangeStatus,
      createdAt: nowIso,
    };
  }

  if (
    readinessLevel === "red" ||
    readinessLevel === "amber" ||
    (readiness.available && readiness.solicitorReviewRequired)
  ) {
    bundle.snapshot = {
      readinessLevel: readinessLevel ?? "red",
      humanReviewRequired: true,
      routeLabel: reasoning.primaryRoute ?? "Current route",
      createdAt: nowIso,
    };
  }

  return bundle;
}

export {
  buildControlRoomComputedSupervisorSignals,
  computedSupervisorSignalsQualifyForQueue,
} from "./build-control-room-computed-signals";
