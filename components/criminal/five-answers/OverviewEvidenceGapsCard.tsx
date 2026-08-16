"use client";

import { Badge } from "@/components/ui/badge";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { dedupePresentationLines } from "@/lib/criminal/overview-presentation";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { humanizeEvidenceLabel } from "./evidence-display";

export function OverviewEvidenceGapsCard({ gaps }: { gaps: FiveAnswersEvidenceRow[] }) {
  const displayGaps = dedupePresentationLines(
    gaps.map((row) => humanizeEvidenceLabel(row.label, row.existence)).filter(Boolean),
  ).slice(0, 8);

  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2.5`}
      data-testid="five-answers-evidence-gaps"
    >
      <h2 className={workflowSectionTitle}>Evidence gaps</h2>
      {displayGaps.length ? (
        <ul className="space-y-2">
          {displayGaps.map((label, i) => {
            const source = gaps.find((row) => humanizeEvidenceLabel(row.label, row.existence) === label);
            return (
              <li key={`${label}-${i}`} className="text-sm text-slate-300 flex flex-wrap items-center gap-2">
                <span className="min-w-0">{label}</span>
                {source ? (
                  <Badge variant="secondary" size="sm" className="text-[9px] shrink-0">
                    {displayExistenceLabel(source.existence)}
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No additional gaps shown here — still check papers before reliance.</p>
      )}
    </section>
  );
}
