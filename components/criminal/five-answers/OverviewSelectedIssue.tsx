"use client";

import { useState } from "react";
import type { OverviewAttentionIssue } from "@/lib/criminal/overview-workspace";
import {
  canCopyChaseRequest,
  canCopyCourtWording,
  overviewIssueStatusTone,
} from "@/lib/criminal/overview-workspace";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function statusChipClass(status: OverviewAttentionIssue["status"]): string {
  const tone = overviewIssueStatusTone(status);
  switch (tone) {
    case "rose":
      return "bg-rose-950/50 text-rose-300 border-rose-800/50";
    case "amber":
      return "bg-amber-950/40 text-amber-300 border-amber-800/40";
    case "orange":
      return "bg-orange-950/40 text-orange-300 border-orange-800/40";
    case "violet":
      return "bg-violet-950/40 text-violet-300 border-violet-800/40";
    default:
      return "bg-slate-800/60 text-slate-300 border-slate-700/50";
  }
}

export function OverviewSelectedIssue({
  issue,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  issue: OverviewAttentionIssue | null;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const showChase = canCopyChaseRequest(issue);
  const showCourt = canCopyCourtWording(issue);

  if (!issue) {
    return (
      <section
        className={`${workflowPilotCard} p-4 text-sm text-slate-500`}
        data-testid="overview-selected-issue"
      >
        Select an issue to review status, sources, and recommended action.
      </section>
    );
  }

  return (
    <section
      className={`${workflowPilotCard} flex min-h-0 flex-col px-3 py-3 sm:px-4`}
      data-testid="overview-selected-issue"
    >
      <div className="flex items-center justify-between gap-2">
        <p className={workflowSectionTitle}>Selected issue</p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrev}
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 disabled:opacity-40 hover:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 disabled:opacity-40 hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-semibold text-slate-50 leading-snug">{issue.title}</h3>
        <span
          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusChipClass(issue.status)}`}
          data-testid="overview-selected-status"
        >
          {issue.statusLabel}
        </span>
      </div>

      <div className="mt-3 space-y-3 text-[13px] flex-1 min-h-0">
        <Block title="Why CaseBrain says this" body={issue.whySaysThis} />
        <div>
          <p className={workflowSectionTitle}>Sources</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-400 text-[12px]" data-testid="overview-selected-sources">
            {issue.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <Block title="Why it matters" body={issue.whyItMatters} />
        {issue.consider ? (
          <div data-testid="overview-selected-consider">
            <p className={workflowSectionTitle}>Consider</p>
            <p className="mt-1 leading-relaxed text-violet-200/90 text-[12px]">{issue.consider}</p>
            <p className="mt-1 text-[10px] text-slate-500">Advisory — not a chase trigger on its own.</p>
          </div>
        ) : null}
        {issue.recommendedAction ? (
          <Block title="Recommended action" body={issue.recommendedAction} />
        ) : null}
      </div>

      {showChase || showCourt ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {showChase ? (
            <button
              type="button"
              className="flex-1 rounded-md bg-sky-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-sky-600"
              data-testid="overview-copy-chase"
              onClick={async () => {
                const ok = await copyText(issue.chaseCopy!);
                setCopied(ok ? "chase" : null);
              }}
            >
              {copied === "chase" ? "Copied chase request" : "Copy chase request"}
            </button>
          ) : null}
          {showCourt ? (
            <button
              type="button"
              className="flex-1 rounded-md border border-sky-700/60 bg-slate-950/50 px-3 py-2 text-[12px] font-semibold text-sky-300 hover:bg-slate-900"
              data-testid="overview-copy-court"
              onClick={async () => {
                const ok = await copyText(issue.courtCopy!);
                setCopied(ok ? "court" : null);
              }}
            >
              {copied === "court" ? "Copied court wording" : "Copy court wording"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-slate-500" data-testid="overview-no-chase-court-actions">
          No chase or court-copy action on this issue — considerations stay advisory until source-backed.
        </p>
      )}
    </section>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className={workflowSectionTitle}>{title}</p>
      <p className="mt-1 leading-relaxed text-slate-300 text-[12px]">{body}</p>
    </div>
  );
}
