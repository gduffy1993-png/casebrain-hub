"use client";

import { Camera, Mic, FileWarning, ShieldAlert, CircleHelp } from "lucide-react";
import type { DashboardAttentionIssue, DashboardIssueStatus } from "@/lib/criminal/solicitor-dashboard/types";
import { dashboardStatusDisplay } from "@/lib/criminal/solicitor-dashboard/build-solicitor-dashboard-vm";

function statusStyles(status: DashboardIssueStatus): string {
  switch (status) {
    case "missing":
      return "bg-rose-100 text-rose-700";
    case "incomplete":
      return "bg-blue-100 text-blue-700";
    case "referred":
    case "outstanding":
      return "bg-amber-100 text-amber-800";
    case "not_established":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function iconFor(issue: DashboardAttentionIssue) {
  const t = issue.title.toLowerCase();
  if (/cctv|camera|stills|footage/.test(t)) return Camera;
  if (/interview|audio|999|cad|recording/.test(t)) return Mic;
  if (/wording|guardrail|overstate/.test(t)) return ShieldAlert;
  if (/unclear|unknown/.test(t)) return CircleHelp;
  return FileWarning;
}

export function WhatNeedsAttentionList({
  issues,
  selectedId,
  onSelect,
  counts,
}: {
  issues: DashboardAttentionIssue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  counts: { missing: number; incomplete: number; notEstablished: number };
}) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white"
      data-testid="what-needs-attention"
    >
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">What Needs Attention</h2>
          <p className="text-[12px] text-slate-500">
            {counts.missing} missing · {counts.incomplete} incomplete · {counts.notEstablished} not established
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-md border border-slate-200 px-2 py-1">Filters</span>
          <span className="rounded-md border border-slate-200 px-2 py-1">Sort: Impact (High)</span>
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {issues.length ? (
          issues.map((issue) => {
            const Icon = iconFor(issue);
            const selected = issue.id === selectedId;
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => onSelect(issue.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    selected
                      ? "border-blue-300 bg-blue-50/60 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{issue.title}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusStyles(issue.status)}`}>
                        {dashboardStatusDisplay(issue.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-500">{issue.summary}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {issue.impact.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            );
          })
        ) : (
          <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            No outstanding attention items on the current papers — still solicitor review before reliance.
          </li>
        )}
      </ul>

      {issues.length > 8 ? (
        <div className="border-t border-slate-100 px-4 py-2.5 text-[12px] text-blue-700">
          Showing attention items from current papers ({issues.length})
        </div>
      ) : null}
    </section>
  );
}
