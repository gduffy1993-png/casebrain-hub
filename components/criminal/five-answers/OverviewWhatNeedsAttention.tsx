"use client";

import type { OverviewAttentionIssue } from "@/lib/criminal/overview-workspace";
import { overviewIssueStatusTone, OVERVIEW_TOP_ISSUE_LIMIT } from "@/lib/criminal/overview-workspace";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

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

export function OverviewWhatNeedsAttention({
  issues,
  selectedId,
  onSelect,
  showAll,
  onToggleShowAll,
}: {
  issues: OverviewAttentionIssue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const visible = showAll ? issues : issues.slice(0, OVERVIEW_TOP_ISSUE_LIMIT);
  const remainder = Math.max(0, issues.length - OVERVIEW_TOP_ISSUE_LIMIT);

  return (
    <section
      className={`${workflowPilotCard} flex min-h-0 min-w-0 flex-col`}
      data-testid="overview-what-needs-attention"
    >
      <div className="border-b border-slate-800/80 px-3 py-2.5 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-100">What Needs Attention</h2>
        <p className={`${workflowSectionTitle} mt-0.5 normal-case tracking-normal`}>
          Ranked from canonical evidence and legal intelligence
        </p>
      </div>

      <ul className="space-y-1.5 p-2.5 sm:p-3" data-testid="overview-attention-list">
        {visible.length ? (
          visible.map((issue) => {
            const selected = issue.id === selectedId;
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => onSelect(issue.id)}
                  className={`flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition ${
                    selected
                      ? "border-sky-600/60 bg-sky-950/35 shadow-sm"
                      : "border-slate-800/80 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/50"
                  }`}
                  data-testid={`overview-attention-item-${issue.kind}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13px] font-semibold text-slate-100">{issue.title}</p>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusChipClass(issue.status)}`}
                      >
                        {issue.statusLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400 leading-snug">{issue.summary}</p>
                    {issue.impact.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {issue.impact.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })
        ) : (
          <li className="rounded-md border border-dashed border-slate-700/70 px-3 py-8 text-center text-sm text-slate-500">
            No outstanding attention items on the current papers — still solicitor review before reliance.
          </li>
        )}
      </ul>

      {remainder > 0 ? (
        <div className="border-t border-slate-800/80 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-[12px] font-medium text-sky-400 hover:text-sky-300"
            data-testid="overview-view-all-issues"
          >
            {showAll ? "Show top issues only" : `View all ${issues.length} items`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
