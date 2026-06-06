"use client";

import { FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EvidenceChangeCompareResult } from "@/lib/criminal/evidence-change-detector/evidence-change-types";

export type EvidenceChangeMaterialBadgeProps = {
  comparison: EvidenceChangeCompareResult | null;
  evidenceChangesEnabled: boolean;
  reasoningV2Enabled: boolean;
};

/** Compact flag-gated notice near readiness when source metadata changed. */
export function EvidenceChangeMaterialBadge({
  comparison,
  evidenceChangesEnabled,
  reasoningV2Enabled,
}: EvidenceChangeMaterialBadgeProps) {
  if (!reasoningV2Enabled || !evidenceChangesEnabled || !comparison?.available) return null;
  if (!comparison.hasPreviousSnapshot || !comparison.sourceMaterialChanged) return null;

  return (
    <div
      className="rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-2 flex flex-wrap items-center gap-2 min-w-0"
      data-testid="evidence-change-material-badge"
    >
      <FileWarning className="h-3.5 w-3.5 text-indigo-800 shrink-0" aria-hidden />
      <span className="text-xs font-medium text-indigo-950 break-words">
        Source material changed
      </span>
      <Badge variant="secondary" size="sm" className="text-[10px] bg-white/80 text-indigo-900 shrink-0">
        Compare
      </Badge>
      {comparison.topChanges[0] ? (
        <span className="text-[11px] text-slate-700 w-full break-words">{comparison.topChanges[0]}</span>
      ) : null}
    </div>
  );
}
