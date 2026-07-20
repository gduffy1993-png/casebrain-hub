"use client";

import { Badge } from "@/components/ui/badge";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { humanizeEvidenceLabel } from "./evidence-display";

export function OverviewEvidenceGapsCard({ gaps }: { gaps: FiveAnswersEvidenceRow[] }) {
  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2.5`}
      data-testid="five-answers-evidence-gaps"
    >
      <h2 className={workflowSectionTitle}>Evidence gaps</h2>
      {gaps.length ? (
        <ul className="space-y-2">
          {gaps.slice(0, 8).map((row, i) => (
            <li key={`${row.label}-${i}`} className="text-sm text-slate-300 flex flex-wrap items-center gap-2">
              <span className="min-w-0">{humanizeEvidenceLabel(row.label, row.existence)}</span>
              <Badge variant="secondary" size="sm" className="text-[9px] shrink-0">
                {displayExistenceLabel(row.existence)}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No additional gaps shown here — still check papers before reliance.</p>
      )}
    </section>
  );
}
