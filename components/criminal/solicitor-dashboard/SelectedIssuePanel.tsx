"use client";

import { useState } from "react";
import type { DashboardAttentionIssue } from "@/lib/criminal/solicitor-dashboard/types";
import { dashboardStatusDisplay } from "@/lib/criminal/solicitor-dashboard/build-solicitor-dashboard-vm";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function SelectedIssuePanel({
  issue,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  issue: DashboardAttentionIssue | null;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!issue) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500" data-testid="selected-issue-panel">
        Select an issue to review status, sources, and recommended action.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" data-testid="selected-issue-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Selected issue</p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrev}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[16px] font-semibold text-slate-900">{issue.title}</h3>
        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
          {dashboardStatusDisplay(issue.status)}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-[13px]">
        <Block title="Why CaseBrain says this" body={issue.why} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sources</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
            {issue.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Impact</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {issue.impact.map((tag) => (
              <span key={tag} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Block title="Recommended action" body={issue.recommendedAction} />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"
          onClick={async () => {
            const ok = await copyText(issue.chaseCopy);
            setCopied(ok ? "chase" : null);
          }}
        >
          {copied === "chase" ? "Copied chase request" : "Copy chase request"}
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-blue-300 bg-white px-3 py-2.5 text-[13px] font-semibold text-blue-700 hover:bg-blue-50"
          onClick={async () => {
            const ok = await copyText(issue.courtCopy);
            setCopied(ok ? "court" : null);
          }}
        >
          {copied === "court" ? "Copied court wording" : "Copy court wording"}
        </button>
      </div>
    </section>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-1 leading-relaxed text-slate-700">{body}</p>
    </div>
  );
}
