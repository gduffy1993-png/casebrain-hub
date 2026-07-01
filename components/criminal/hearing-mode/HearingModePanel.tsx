"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import { SOURCE_BACKED_COURT_NOTE_LABEL } from "@/lib/criminal/trust/firm-facing-labels";
import { displayCopyBody } from "@/lib/criminal/five-answers/display-labels";
import type { HearingModeModel } from "@/lib/criminal/hearing-mode/types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { softenPilotReviewCopy } from "@/components/criminal/workflow/pilotReviewCopy";

export function HearingModePanel({
  model,
  todayHref,
  chaseHref,
  caseId,
  suppressDoNotOverstate = false,
}: {
  model: HearingModeModel;
  todayHref: string;
  chaseHref: string;
  caseId: string;
  suppressDoNotOverstate?: boolean;
}) {
  const { caseInOneMinute: c } = model;
  const courtBody = displayCopyBody(model.safeCourtLine.text, model.safeCourtLine.footer);

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3 border-amber-500/25 bg-amber-950/10`}
      data-testid="hearing-mode-panel"
      id="overview-prepare"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400/90 shrink-0" />
            <h2 className={workflowSectionTitle}>Prepare for court</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{softenPilotReviewCopy(model.reviewNotice)}</p>
        </div>
        <H5FeedbackFlag
          caseId={caseId}
          surface="hearing_mode"
          section="overview"
          lineSnippet={courtBody.slice(0, 120)}
        />
      </div>

      <div className="space-y-1.5" data-testid="hearing-mode-case-minute">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
          Case in one minute
        </p>
        <p className="text-sm text-slate-200 leading-relaxed">
          {c.chargeLabel}. {c.mainIssue}
        </p>
      </div>

      <div className="space-y-1.5 rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5" data-testid="hearing-mode-court-line">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Source-backed court note — {SOURCE_BACKED_COURT_NOTE_LABEL}
        </p>
        <p className="text-[11px] text-slate-500">{model.safeCourtLine.sendabilityLabel}</p>
        <p className="text-sm text-slate-200 leading-relaxed italic">{courtBody}</p>
      </div>

      {model.topChaseItems.length ? (
        <div className="space-y-1.5" data-testid="hearing-mode-top-chase">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Top chase points (court prep — not CPS draft)
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-300">
            {model.topChaseItems.map((item, i) => (
              <li key={i}>{item.label}</li>
            ))}
          </ol>
          <Link
            href={chaseHref}
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
          >
            Full chase list <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      {model.doNotOverstate.length && !suppressDoNotOverstate ? (
        <div data-testid="hearing-mode-do-not-overstate">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 mb-1.5">
            Do not overstate
          </p>
          <DontSaySafetyBox items={model.doNotOverstate.slice(0, 3)} compact />
        </div>
      ) : null}
    </section>
  );
}
