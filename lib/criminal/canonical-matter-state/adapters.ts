/**
 * Legacy adapters → CanonicalMatterStateV1.
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  buildCanonicalMatterStateV1,
  type BuildCanonicalMatterInput,
} from "./build";
import type { CanonicalMatterStateV1 } from "./schema";
import {
  buildSolicitorMatterStateVmFromCanonical,
  type SolicitorMatterStateVm,
} from "@/lib/criminal/solicitor-matter-state";

export type LegacyFiveAnswersChaseInput = {
  caseId?: string | null;
  allegation?: string | null;
  chargeWording?: string | null;
  bundleHay?: string | null;
  provisional?: boolean;
  evidenceRows: FiveAnswersEvidenceRow[];
  chase: {
    items?: Array<{
      id?: string;
      label: string;
      baseStatus?: string;
      whyItMatters?: string | null;
    }>;
    primaryItems?: Array<{
      id?: string;
      label: string;
      baseStatus?: string;
      whyItMatters?: string | null;
    }>;
  } | null;
  hearing?: BuildCanonicalMatterInput["hearing"];
};

/** Adapter: five-answers evidence rows + disclosure chase brief → canonical v1. */
export function adaptFiveAnswersAndChaseToCanonical(
  input: LegacyFiveAnswersChaseInput,
): CanonicalMatterStateV1 {
  const chaseItems = [
    ...(input.chase?.primaryItems ?? []),
    ...(input.chase?.items ?? []),
  ];
  // Dedupe by id/label
  const seen = new Set<string>();
  const unique = [];
  for (const item of chaseItems) {
    const key = item.id || item.label;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      id: item.id,
      label: item.label,
      baseStatus: item.baseStatus,
      whyItMatters: item.whyItMatters ?? null,
    });
  }

  return buildCanonicalMatterStateV1({
    caseId: input.caseId,
    allegation: input.allegation,
    chargeWording: input.chargeWording,
    bundleHay: input.bundleHay,
    provisional: input.provisional,
    evidenceRows: input.evidenceRows,
    chaseItems: unique,
    hearing: input.hearing,
  });
}

/** Adapter: project canonical → legacy SolicitorMatterStateVm (compat). */
export function projectCanonicalToLegacyMatterVm(
  canonical: CanonicalMatterStateV1,
  evidenceRows: FiveAnswersEvidenceRow[],
): SolicitorMatterStateVm {
  return buildSolicitorMatterStateVmFromCanonical(canonical, evidenceRows);
}

/** Truth-key shaped legacy → evidence rows for canonical build. */
export function adaptTruthKeyEvidenceToRows(
  items: Array<{ label?: string; existence?: string; note?: string }>,
): FiveAnswersEvidenceRow[] {
  return items
    .filter((i) => i.label?.trim())
    .map((i) => ({
      label: i.label!.trim(),
      existence: (i.existence as FiveAnswersEvidenceRow["existence"]) || "unknown",
      reliability: "needs_review",
      note: i.note,
    }));
}
