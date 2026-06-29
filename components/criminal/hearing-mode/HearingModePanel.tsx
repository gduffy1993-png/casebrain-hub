"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import { SOURCE_BACKED_COURT_NOTE_LABEL } from "@/lib/criminal/trust/firm-facing-labels";
import type { HearingModeModel } from "@/lib/criminal/hearing-mode/types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

export function HearingModePanel({
  model,
  todayHref,
  chaseHref,
  caseId,
}: {
  model: HearingModeModel;
  todayHref: string;
  chaseHref: string;
  caseId: string;
}) {
  const { caseInOneMinute: c } = model;

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-4 border-amber-500/25 bg-amber-950/10`}
      data-testid="hearing-mode-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400/90 shrink-0" />
            <h2 className={workflowSectionTitle}>20-minute hearing mode</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{model.reviewNotice}</p>
        </div>
        <Badge variant="outline" size="sm" className="text-[10px] shrink-0">
          {c.confidenceLabel}
        </Badge>
        <H5FeedbackFlag
          caseId={caseId}
          surface="hearing_mode"
          section="overview"
          lineSnippet={model.safeCourtLine.text.slice(0, 120)}
        />
      </div>

      <div className="space-y-2" data-testid="hearing-mode-case-minute">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
          Case in one minute
        </p>
        <p className="text-sm font-medium text-slate-100">{c.chargeLabel}</p>
        <p className="text-xs text-slate-400">
          <span className="text-slate-500">Offence family: </span>
          {c.offenceFamily}
        </p>
        <p className="text-xs text-slate-300">
          <span className="font-medium text-slate-400">Prosecution theory: </span>
          {c.prosecutionTheory}
        </p>
        <p className="text-xs text-slate-300">
          <span className="font-medium text-slate-400">Main issue: </span>
          {c.mainIssue}
        </p>
      </div>

      <div className="space-y-1.5 rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5" data-testid="hearing-mode-court-line">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Safe court line — {SOURCE_BACKED_COURT_NOTE_LABEL}
        </p>
        <p className="text-[11px] text-slate-500">{model.safeCourtLine.sendabilityLabel}</p>
        <p className="text-sm text-slate-200 leading-relaxed italic">{model.safeCourtLine.text}</p>
        <p className="text-[10px] text-slate-600">{model.safeCourtLine.footer}</p>
      </div>

      {model.evidenceSnapshot.length ? (
        <div className="space-y-2" data-testid="hearing-mode-evidence-snapshot">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Evidence state snapshot
          </p>
          <ul className="space-y-1.5">
            {model.evidenceSnapshot.map((row, i) => (
              <li key={i} className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-slate-200 line-clamp-1">{row.label}</span>
                <Badge variant="secondary" size="sm" className="text-[9px]">
                  {row.existenceLabel}
                </Badge>
                <Badge variant="outline" size="sm" className="text-[9px]">
                  {row.reliabilityLabel}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {model.topChaseItems.length ? (
        <div className="space-y-2" data-testid="hearing-mode-top-chase">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Top chase items (CPS wording — not court line)
          </p>
          <ul className="space-y-2">
            {model.topChaseItems.map((item, i) => (
              <li key={i} className="text-xs border-b border-slate-800/60 pb-2 last:border-0">
                <p className="font-medium text-slate-200">{item.label}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" size="sm" className="text-[9px]">
                    {item.existenceLabel}
                  </Badge>
                  <Badge variant="outline" size="sm" className="text-[9px]">
                    {item.sendabilityLabel}
                  </Badge>
                </div>
                <p className="text-slate-500 mt-1 line-clamp-3">{item.cpsChaseWording}</p>
              </li>
            ))}
          </ul>
          <Link
            href={chaseHref}
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
          >
            Full chase list <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      {model.doNotOverstate.length ? (
        <div data-testid="hearing-mode-do-not-overstate">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 mb-1.5">
            Do not overstate
          </p>
          <DontSaySafetyBox items={model.doNotOverstate} compact />
        </div>
      ) : null}

      {model.reviewPrompts.length ? (
        <div className="space-y-1.5" data-testid="hearing-mode-review-prompts">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            What changed / review needed
          </p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            {model.reviewPrompts.map((p) => (
              <li key={p.id}>
                <span className="text-slate-300">{p.summary}</span>
                <span className="block text-amber-400/90 mt-0.5">{p.reviewNeeded}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        className="rounded-md border border-blue-500/20 bg-blue-950/20 px-3 py-2"
        data-testid="hearing-mode-next-action"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/90">Next action</p>
        <p className="text-sm font-medium text-slate-100 mt-0.5">{model.nextAction.label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{model.nextAction.detail}</p>
        <Link
          href={todayHref}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-2"
        >
          Today tab <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
