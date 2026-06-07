import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import type { BuildExportReviewInput, ExportReviewType } from "./export-review-types";

export type ExportReviewMetadataContext = {
  reasoning: ReasoningV2ViewModel;
  clientStress?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput | null;
  solicitorReviewRequired?: boolean;
  exportHash?: string | null;
};

export function buildExportReviewMetadata(
  caseId: string,
  exportType: ExportReviewType,
  reviewStatus: BuildExportReviewInput["reviewStatus"],
  ctx: ExportReviewMetadataContext,
  note?: string | null,
): BuildExportReviewInput {
  const readiness = buildPreHearingReadiness(
    ctx.reasoning,
    ctx.clientStress ?? null,
    ctx.readinessInput ?? undefined,
  );

  return {
    caseId,
    exportType,
    reviewStatus,
    routeLabel: ctx.reasoning.primaryRoute?.trim() || null,
    readinessLevel: readiness.available ? readiness.level : null,
    humanReviewRequired: Boolean(ctx.reasoning.humanReviewRequired),
    solicitorReviewRequired: ctx.solicitorReviewRequired !== false,
    exportHash: ctx.exportHash ?? null,
    note: note ?? null,
  };
}

import type { SolicitorExportResult } from "./export-types";

export function solicitorReviewRequiredFromExport(
  exportDraft: SolicitorExportResult | null | undefined,
): boolean {
  if (!exportDraft) return true;
  if ("solicitorReviewRequired" in exportDraft) {
    return exportDraft.solicitorReviewRequired !== false;
  }
  return true;
}
