import { buildBundleSourcePayload } from "@/lib/bundle/parse-bundle-display";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type {
  PreHearingReadinessInput,
  PreHearingReadinessOutcome,
} from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import { buildReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { buildSupervisorQAResult } from "@/lib/criminal/supervisor-qa/build-supervisor-qa-result";
import type { SupervisorQAOutcome } from "@/lib/criminal/supervisor-qa/supervisor-qa-types";
import type { SupervisorQueueCaseMeta } from "./build-supervisor-queue";

type DocumentRow = Record<string, unknown>;

export type ControlRoomComputedSupervisorSignals = {
  payload: ReturnType<typeof buildBundleSourcePayload>;
  reasoning: ReasoningV2Result & { available: true };
  readiness: PreHearingReadinessOutcome;
  qa: SupervisorQAOutcome & { available: true };
  readinessInput: PreHearingReadinessInput;
};

/** Same bundle → reasoning → readiness → supervisor QA stack as Control Room / bundle-source API. */
export function buildControlRoomComputedSupervisorSignals(
  meta: SupervisorQueueCaseMeta,
  docs: DocumentRow[],
  options?: { exportsEnabled?: boolean },
): ControlRoomComputedSupervisorSignals | null {
  if (!docs.length) return null;

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
      hearingDateIso: meta.hearingDate ?? payload.caseMetadata?.nextHearingIso ?? null,
      stage: payload.header?.stage ?? payload.caseMetadata?.stage ?? null,
    },
    workflowProfileHint: payload.header?.primaryEvalHook ?? null,
  };

  const readiness = buildPreHearingReadiness(reasoningResult, null, readinessInput);

  const qa = buildSupervisorQAResult(reasoningResult, {
    readinessInput,
    workflowProfileHint: payload.header?.primaryEvalHook ?? null,
    exportsEnabled: options?.exportsEnabled ?? true,
  });
  if (!qa.available) return null;

  return {
    payload,
    reasoning: reasoningResult,
    readiness,
    qa,
    readinessInput,
  };
}

export function computedSupervisorSignalsQualifyForQueue(
  signals: ControlRoomComputedSupervisorSignals,
): boolean {
  const { reasoning, readiness, qa } = signals;
  const readinessLevel = readiness.available ? readiness.level : null;

  if (qa.status === "required" || qa.status === "suggested") return true;
  if (readinessLevel === "red" || readinessLevel === "amber") return true;
  if (readiness.available && readiness.solicitorReviewRequired) return true;
  if (reasoning.humanReviewRequired) return true;
  if (reasoning.warRoom.solicitorReviewRequired) return true;
  return false;
}
