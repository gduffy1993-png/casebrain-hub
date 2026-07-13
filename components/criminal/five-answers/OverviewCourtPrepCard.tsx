"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { displayCopyBody } from "@/lib/criminal/five-answers/display-labels";
import { SOURCE_BACKED_COURT_NOTE_LABEL } from "@/lib/criminal/trust/firm-facing-labels";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { polishPresentationLine } from "@/lib/criminal/demo-presentation-polish";

export function OverviewCourtPrepCard({
  courtLine,
  courtFooter,
  sendabilityLabel,
  topChaseLabels,
  courtHref,
  chaseHref,
}: {
  courtLine: string;
  courtFooter?: string | null;
  sendabilityLabel?: string | null;
  topChaseLabels: string[];
  courtHref: string;
  chaseHref: string;
}) {
  const courtBody = displayCopyBody(courtLine, courtFooter ?? undefined);

  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-3 border-amber-500/20 bg-amber-950/10`}
      data-testid="hearing-mode-panel"
      id="overview-prepare"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-400/90 shrink-0" />
        <h2 className={workflowSectionTitle}>Court prep</h2>
      </div>

      <div
        className="space-y-1.5 rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
        data-testid="hearing-mode-court-line"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Court line — {SOURCE_BACKED_COURT_NOTE_LABEL}
        </p>
        {sendabilityLabel ? <p className="text-[11px] text-slate-500">{sendabilityLabel}</p> : null}
        <p className="text-sm text-slate-200 leading-relaxed">{courtBody}</p>
      </div>

      {topChaseLabels.length ? (
        <div className="space-y-1.5" data-testid="hearing-mode-top-chase">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Top chase points</p>
          <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-300">
            {topChaseLabels.slice(0, 3).map((label, i) => (
              <li key={i}>{polishPresentationLine(label)}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-[11px]">
        <Link href={courtHref} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
          Open Court tab <ExternalLink className="h-3 w-3" />
        </Link>
        <Link href={chaseHref} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
          CPS chase drafts <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
