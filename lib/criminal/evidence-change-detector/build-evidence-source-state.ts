import {
  assessBundleAvailability,
  type BundleAvailabilityInput,
} from "@/lib/criminal/reasoning-v2/bundle-availability";
import type { EvidenceChangeSourceState } from "./evidence-change-types";

export type BuildEvidenceSourceStateInput = {
  documentCount?: number;
  combinedTextLength?: number;
  snippets?: {
    mg5?: string | null;
    mg6?: string | null;
    exhibits?: string | null;
  } | null;
  documentRows?: Array<{ updatedAt?: string | null }> | null;
  frontMatterScan?: string | null;
};

function snippetCount(snippets: BuildEvidenceSourceStateInput["snippets"]): number {
  if (!snippets) return 0;
  return [snippets.mg5, snippets.mg6, snippets.exhibits].filter((s) => Boolean(s?.trim())).length;
}

function matterUpdatedMarker(documentRows: BuildEvidenceSourceStateInput["documentRows"]): string | null {
  if (!documentRows?.length) return null;
  const stamps = documentRows
    .map((r) => r.updatedAt?.trim())
    .filter((s): s is string => Boolean(s));
  if (!stamps.length) return null;
  return stamps.sort().at(-1) ?? null;
}

function bundleAvailabilityReason(input: BuildEvidenceSourceStateInput): string {
  const availabilityInput: BundleAvailabilityInput = {
    frontMatterScan: input.frontMatterScan ?? undefined,
    snippets: input.snippets ?? undefined,
    combinedTextLength: input.combinedTextLength,
  };
  const assessment = assessBundleAvailability(availabilityInput);
  if (assessment.unavailableReason === "no_bundle_text") return "no_bundle_text";
  if (assessment.unavailableReason === "no_source_snippets") return "no_source_snippets";
  if (assessment.unavailableReason === "insufficient_source") return "insufficient_source";
  if ((input.documentCount ?? 0) === 0 && (input.combinedTextLength ?? 0) === 0) {
    return "no_documents";
  }
  return "papers_on_file";
}

/** Safe source-state metadata only — no paths, names, or raw text. */
export function buildEvidenceSourceState(
  input: BuildEvidenceSourceStateInput,
): EvidenceChangeSourceState {
  return {
    documentCount: Math.max(0, input.documentCount ?? 0),
    combinedTextLength: Math.max(0, input.combinedTextLength ?? 0),
    sourceSnippetCount: snippetCount(input.snippets),
    bundleAvailabilityReason: bundleAvailabilityReason(input),
    matterUpdatedMarker: matterUpdatedMarker(input.documentRows),
  };
}
