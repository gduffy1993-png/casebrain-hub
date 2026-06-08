"use client";

/**
 * Phase 5.1: Suggests relevant law slices for this case (offence + phase).
 * Renders as pills above the Defence Plan chat so the user can ask about these topics.
 */

import { getSuggestedLawSlices, type LawSliceLabel } from "@/lib/criminal/law-slice-suggestions";

type LawSliceSuggestionsProps = {
  offenceType?: string | null;
  currentPhase?: number;
  /** Optional: when plan exists, show suggestions; when no plan, can hide or show generic */
  hasPlan?: boolean;
};

export function LawSliceSuggestions({
  offenceType,
  currentPhase = 2,
  hasPlan = true,
}: LawSliceSuggestionsProps) {
  const slices = getSuggestedLawSlices(offenceType ?? null, currentPhase);
  if (slices.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        Suggested law for this case
      </p>
      <div className="flex flex-wrap gap-1.5">
        {slices.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground border border-primary/20"
          >
            {label}
          </span>
        ))}
      </div>
      {hasPlan && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Ask about these in the chat below for answers grounded in your plan and the corpus.
        </p>
      )}
    </div>
  );
}
