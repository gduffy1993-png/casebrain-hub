import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import type { BuildTrustFeedbackInput, TrustFeedbackTab } from "@/lib/criminal/trust/feedback/trust-feedback-types";
import { inferFeedbackSeverity } from "./infer-feedback-severity";
import type { H5FeedbackKind } from "./types";

export type H5FeedbackCaptureContext = {
  caseId: string;
  surface: TrustFeedbackTab;
  section?: string | null;
  feedbackKind: H5FeedbackKind;
  lineSnippet?: string | null;
  sourceState?: SourceStateKind | null;
  sendability?: SendabilityLevel | null;
  note?: string | null;
  exportId?: string | null;
  exportType?: string | null;
  outputVersion?: string | null;
};

export function buildH5FeedbackInput(ctx: H5FeedbackCaptureContext): BuildTrustFeedbackInput {
  const section = ctx.section?.trim() || null;
  const exportLabel =
    ctx.exportId?.trim() && ctx.exportType?.trim()
      ? `${ctx.exportType}:${ctx.exportId.trim()}`
      : ctx.exportId?.trim() || null;

  const contextParts = [ctx.surface, section, exportLabel].filter(Boolean);

  return {
    caseId: ctx.caseId,
    tab: ctx.surface,
    feedbackKind: ctx.feedbackKind,
    lineSnippet: ctx.lineSnippet ?? null,
    contextLabel: contextParts.length ? contextParts.join(" · ") : ctx.surface,
    sourceState: ctx.sourceState ?? null,
    sendability: ctx.sendability ?? null,
    note: ctx.note ?? null,
    outputVersion: ctx.outputVersion ?? undefined,
    section,
    severity: inferFeedbackSeverity(ctx.feedbackKind),
    exportId: ctx.exportId?.trim() || null,
    exportType: ctx.exportType?.trim() || null,
  };
}
