import { buildBundleSourcePayload } from "@/lib/bundle/parse-bundle-display";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import { buildReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildSupervisorQAResult } from "@/lib/criminal/supervisor-qa/build-supervisor-qa-result";
import type {
  SupervisorQueueCaseMeta,
  SupervisorQueuePersistenceBundle,
} from "./build-supervisor-queue";
import { emptySupervisorQueuePersistenceBundle } from "./merge-supervisor-queue-bundles";

type DocumentRow = Record<string, unknown>;

function computedBundleQualifies(
  qaStatus: "none" | "suggested" | "required",
  readinessLevel: "green" | "amber" | "red" | null,
  solicitorReviewRequired: boolean,
  humanReviewRequired: boolean,
): boolean {
  if (qaStatus === "required" || qaStatus === "suggested") return true;
  if (readinessLevel === "red") return true;
  if (readinessLevel === "amber" && solicitorReviewRequired) return true;
  if (humanReviewRequired && qaStatus !== "none") return true;
  return false;
}

/**
 * Derive supervisor queue buckets from the same computed signals as Control Room
 * (reasoning v2 + pre-hearing readiness + supervisor QA), without requiring DB rows.
 */
export function buildComputedSupervisorQueueBundle(
  meta: SupervisorQueueCaseMeta,
  docs: DocumentRow[],
  options?: { now?: Date; exportsEnabled?: boolean },
): SupervisorQueuePersistenceBundle | null {
  if (!docs.length) return null;

  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const payload = buildBundleSourcePayload(docs);

  const reasoningResult = buildReasoningV2ViewModel({
    frontMatterScan: payload.frontMatterScan,
    snippets: payload.snippets,
    combinedTextLength: payload.combinedText.length,
    matterLabel: meta.title,
  });
  if (!reasoningResult.available) return null;

  const readinessInput: PreHearingReadinessInput = {
    bundleMeta: {
      documentCount: payload.documentRows.length,
      combinedTextLength: payload.combinedText.length,
      thinBundleHint: payload.combinedText.length > 0 && payload.combinedText.length < 12_000,
    },
    hearingMeta: {
      hearingDateIso: meta.hearingDate,
      stage: payload.header?.stage ?? null,
    },
    workflowProfileHint: payload.header?.primaryEvalHook ?? null,
  };

  const readiness = buildPreHearingReadiness(reasoningResult, null, readinessInput);
  const readinessLevel = readiness.available ? readiness.level : null;

  const qa = buildSupervisorQAResult(reasoningResult, {
    readinessInput,
    workflowProfileHint: payload.header?.primaryEvalHook ?? null,
    exportsEnabled: options?.exportsEnabled ?? true,
  });
  if (!qa.available) return null;

  const qualifies = computedBundleQualifies(
    qa.status,
    readinessLevel,
    readiness.available ? readiness.solicitorReviewRequired : false,
    reasoningResult.humanReviewRequired,
  );
  if (!qualifies) return null;

  const bundle = emptySupervisorQueuePersistenceBundle();

  if (qa.status !== "none") {
    bundle.signoff = {
      status: qa.status === "required" ? "pending" : "pending",
      qaStatus: qa.status,
      reasonLabels: qa.reasonsForReview,
      readinessLevel,
      evidenceChangeStatus: qa.evidenceChangeStatus,
      createdAt: nowIso,
    };
  }

  if (
    readinessLevel === "red" ||
    (readiness.available && readiness.solicitorReviewRequired)
  ) {
    bundle.snapshot = {
      readinessLevel: readinessLevel ?? "red",
      humanReviewRequired: true,
      routeLabel: reasoningResult.primaryRoute ?? "Current route",
      createdAt: nowIso,
    };
  }

  return bundle;
}
