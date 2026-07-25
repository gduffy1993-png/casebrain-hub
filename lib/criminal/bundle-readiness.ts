/**
 * Shared bundle readiness — single-PDF / large-text packs are not "thin (0 docs)".
 * Never branches on fixture names or case-specific wording.
 */

import {
  LARGE_BUNDLE_PAGE_THRESHOLD,
  LARGE_BUNDLE_TEXT_CHARS,
  THIN_BUNDLE_TEXT_CHARS,
  buildBundleSizeProfile,
} from "@/lib/bundle/bundle-display-profile";

export type BundleReadinessInput = {
  documentCount: number;
  combinedTextLength: number;
  pageCount?: number | null;
  docs?: Array<{ name?: string | null; extracted_json?: unknown }>;
  bundleTextHint?: string | null;
};

export type BundleReadiness = {
  /** True when extraction has enough material for strategy confidence (not gated as empty/thin). */
  extractionOk: boolean;
  /** True when the pack is genuinely thin on extracted text / coverage. */
  isThinPack: boolean;
  /** True when one or more large PDFs / substantial text are on file. */
  isLargeBundle: boolean;
  effectiveDocumentCount: number;
  pageCount: number | null;
  combinedTextLength: number;
};

/**
 * One uploaded PDF with substantial text or page metadata is a real document,
 * not an empty / thin pack.
 */
export function assessBundleReadiness(input: BundleReadinessInput): BundleReadiness {
  const docCount = Math.max(0, Math.floor(input.documentCount || 0));
  const textLen = Math.max(0, Math.floor(input.combinedTextLength || 0));
  const profile = buildBundleSizeProfile(
    docCount,
    textLen,
    input.docs ?? [],
    undefined,
    input.bundleTextHint ?? undefined,
  );
  const pageCount =
    input.pageCount != null && Number.isFinite(input.pageCount) && input.pageCount > 0
      ? Math.round(input.pageCount)
      : profile.pageCount;

  const isLargeBundle =
    profile.isLargeByText ||
    profile.isLargeByPages ||
    (pageCount != null && pageCount >= LARGE_BUNDLE_PAGE_THRESHOLD) ||
    textLen >= LARGE_BUNDLE_TEXT_CHARS;

  const effectiveDocumentCount =
    docCount > 0 ? docCount : textLen > 0 || (pageCount != null && pageCount > 0) ? 1 : 0;

  // Extraction OK: multi-doc with text, OR single substantial PDF/text pack.
  const extractionOk =
    (effectiveDocumentCount >= 2 && textLen >= 1000) ||
    (effectiveDocumentCount >= 1 && textLen >= THIN_BUNDLE_TEXT_CHARS) ||
    (effectiveDocumentCount >= 1 && isLargeBundle) ||
    (effectiveDocumentCount >= 1 && pageCount != null && pageCount >= 20 && textLen >= 1000);

  const isThinPack =
    !isLargeBundle &&
    (effectiveDocumentCount === 0 ||
      (textLen > 0 && textLen < THIN_BUNDLE_TEXT_CHARS && !extractionOk) ||
      (effectiveDocumentCount > 0 && textLen === 0));

  return {
    extractionOk,
    isThinPack,
    isLargeBundle,
    effectiveDocumentCount,
    pageCount,
    combinedTextLength: textLen,
  };
}

/**
 * Analysis badge must not read as Complete/"safe" while the same strip says gated thin pack.
 */
export function resolveAnalysisStatusLabel(input: {
  canShowStrategyOutputs: boolean;
  analysisMode: "none" | "preview" | "complete";
  hasVersion: boolean;
  hasRenderableStrategy: boolean;
  readiness: BundleReadiness;
}): { label: string; contradiction: boolean } {
  const { readiness } = input;
  if (input.canShowStrategyOutputs) {
    if (readiness.isThinPack && !readiness.isLargeBundle) {
      return {
        label: input.analysisMode === "complete" ? "Preview (thin pack)" : "Preview",
        contradiction: true,
      };
    }
    return {
      label: input.analysisMode === "complete" ? "Complete" : "Preview",
      contradiction: false,
    };
  }
  if (!input.hasVersion && !input.hasRenderableStrategy) {
    return { label: "Not run", contradiction: false };
  }
  if (readiness.isLargeBundle || readiness.extractionOk) {
    return { label: "Needs review", contradiction: false };
  }
  return { label: "Gated (thin pack)", contradiction: false };
}
