/**
 * Enforce Phase 7 extraction / provenance boundary rules.
 */

import { createHash } from "node:crypto";
import { dedupeEvidenceAliases } from "@/lib/criminal/evidence-alias-dedupe";
import { assessStructuredField } from "@/lib/criminal/structured-solicitor-output";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
  type ExtractionBoundaryRejection,
  type ExtractionBoundaryResult,
  type ExtractionProvenanceBlockV1,
} from "./schema";

const RAW_MARKER_RE = /\|\s*\d+(?:\s*-\s*\d+)?\s*\||\|\s*\*\*|#{2,}|^\s*\d+\s*\|\s*$/m;

const TRUNCATED_RE =
  /\b(?:and|or|that|which|the|to|of|for|with|from|including|including:)\s*$/i;

const LEGIT_ABBREV_END_RE =
  /\b(?:cps|mg11|mg6c?|ptph|bwv|cctv|dna|anpr|vrm|pfha|pwits|s\.?\s*18|s\.?\s*20|e\.g|i\.e|etc|ltd|plc|uk|id)\.?\s*$/i;

/** Incomplete quotation: opens with quote and never closes / ends mid-thought. */
export function detectIncompleteQuotation(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  const opens = (t.match(/["']/g) ?? []).length;
  if (opens % 2 === 1) return true;
  if (/^["'].+/.test(t) && !/[.!?]"?\s*$/.test(t) && t.length < 80) return true;
  const assessed = assessStructuredField(t, "sourceQuotation");
  return assessed.rejections.some(
    (r) => r.code === "field.speculative_quotation" || r.code === "field.truncated_fragment",
  );
}

/** True when a candidate title looks like a truncated excerpt rather than a label. */
export function isTruncatedExcerptUsedAsTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  if (!t) return false;
  if (t.length > 80 && /^["']/.test(t)) return true;
  if ((TRUNCATED_RE.test(t) || /[-–—:]\s*$/.test(t)) && !LEGIT_ABBREV_END_RE.test(t)) return true;
  const assessed = assessStructuredField(t, "subject");
  return assessed.rejections.some(
    (r) =>
      r.code === "field.truncated_fragment" ||
      r.code === "field.source_excerpt_as_heading" ||
      r.code === "field.speculative_quotation",
  );
}

export function containsRawExtractionSyntax(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return RAW_MARKER_RE.test(t);
}

/** Stable evidence id from label + status (matches canonical style prefix). */
export function stableEvidenceId(label: string, existence = "unknown"): string {
  return `ev_${createHash("sha256").update(`${label.trim()}|${existence}`).digest("hex").slice(0, 16)}`;
}

/** Deduplicate alias labels before display (string list). */
export function dedupeDisplayLabels(labels: string[]): string[] {
  const rows: FiveAnswersEvidenceRow[] = labels
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => ({ label, existence: "unknown" as const, reliability: "unknown" as const }));
  return dedupeEvidenceAliases(rows).map((r) => r.label);
}

export type BuildBoundaryInput = {
  evidenceTitle?: string | null;
  evidenceStatus?: string | null;
  sourceExcerpt?: string | null;
  generatedExplanation?: string | null;
  requestedAction?: string | null;
  sourceEvidenceId?: string | null;
  /** Alias labels to dedupe for display (e.g. chase mergedFrom). */
  displayLabels?: string[];
  /** When true, require sourceEvidenceId for non-empty title. */
  requireEvidenceId?: boolean;
};

/**
 * Build a boundary block: keep fields separate; omit incomplete quotations;
 * reject truncated excerpts as titles; block raw extraction syntax.
 */
export function buildExtractionProvenanceBlock(input: BuildBoundaryInput): ExtractionBoundaryResult {
  const rejections: ExtractionBoundaryRejection[] = [];

  let evidenceTitle = (input.evidenceTitle ?? "").trim() || null;
  let sourceExcerpt = (input.sourceExcerpt ?? "").trim() || null;
  const evidenceStatus = (input.evidenceStatus ?? "").trim() || null;
  const generatedExplanation = (input.generatedExplanation ?? "").trim() || null;
  const requestedAction = (input.requestedAction ?? "").trim() || null;
  let sourceEvidenceId = (input.sourceEvidenceId ?? "").trim() || null;

  if (evidenceTitle && isTruncatedExcerptUsedAsTitle(evidenceTitle)) {
    rejections.push({
      code: "boundary.truncated_excerpt_as_title",
      detail: "Truncated source excerpt must not be used as evidence title",
      field: "evidenceTitle",
    });
    evidenceTitle = null;
  }

  if (sourceExcerpt && detectIncompleteQuotation(sourceExcerpt)) {
    rejections.push({
      code: "boundary.incomplete_quotation",
      detail: "Incomplete quotation omitted rather than completed",
      field: "sourceExcerpt",
    });
    sourceExcerpt = null;
  }

  if (sourceExcerpt && evidenceTitle && sourceExcerpt === evidenceTitle && sourceExcerpt.length > 40) {
    rejections.push({
      code: "boundary.truncated_excerpt_as_title",
      detail: "Source excerpt duplicated as title — title cleared",
      field: "evidenceTitle",
    });
    evidenceTitle = null;
  }

  for (const [field, value] of [
    ["evidenceTitle", evidenceTitle],
    ["sourceExcerpt", sourceExcerpt],
    ["generatedExplanation", generatedExplanation],
    ["requestedAction", requestedAction],
  ] as const) {
    if (value && containsRawExtractionSyntax(value)) {
      rejections.push({
        code: "boundary.raw_extraction_syntax",
        detail: `Raw extraction syntax in ${field}`,
        field,
      });
    }
  }

  if (evidenceTitle && !sourceEvidenceId) {
    sourceEvidenceId = stableEvidenceId(evidenceTitle, evidenceStatus ?? "unknown");
  }
  if (input.requireEvidenceId && evidenceTitle && !sourceEvidenceId) {
    rejections.push({
      code: "boundary.missing_evidence_id",
      detail: "Evidence title present without sourceEvidenceId",
      field: "sourceEvidenceId",
    });
  }

  const dedupedDisplayLabels = dedupeDisplayLabels(input.displayLabels ?? []);
  if (
    (input.displayLabels?.length ?? 0) > 1 &&
    dedupedDisplayLabels.length === input.displayLabels!.filter((l) => l.trim()).length &&
    new Set(input.displayLabels!.map((l) => l.trim().toLowerCase())).size < input.displayLabels!.length
  ) {
    // exact dupes should shrink; if not, flag
    rejections.push({
      code: "boundary.alias_not_deduped",
      detail: "Display labels were not reduced after exact-dupe pass",
    });
  }

  const block: ExtractionProvenanceBlockV1 = {
    schemaVersion: EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
    evidenceTitle,
    evidenceStatus,
    sourceExcerpt,
    generatedExplanation,
    requestedAction,
    sourceEvidenceId,
  };

  // Hard-fail when raw syntax remains on any kept field
  const rawHard = rejections.some((r) => r.code === "boundary.raw_extraction_syntax");
  const titleHard = rejections.some((r) => r.code === "boundary.truncated_excerpt_as_title");
  const ok = !rawHard && !titleHard && !rejections.some((r) => r.code === "boundary.missing_evidence_id");

  return { ok, block, rejections, dedupedDisplayLabels };
}

/**
 * Assert a candidate UI title is display-safe (not truncated excerpt, not raw).
 */
export function assertSafeEvidenceTitle(title: string): {
  ok: boolean;
  safeTitle: string | null;
  rejections: ExtractionBoundaryRejection[];
} {
  const r = buildExtractionProvenanceBlock({ evidenceTitle: title });
  return {
    ok: Boolean(r.block.evidenceTitle) && !r.rejections.some((x) => x.code === "boundary.truncated_excerpt_as_title" || x.code === "boundary.raw_extraction_syntax"),
    safeTitle: r.block.evidenceTitle,
    rejections: r.rejections,
  };
}
