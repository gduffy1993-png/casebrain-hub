"use client";

import type { ReactNode } from "react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

function SnapshotBox({
  title,
  testId,
  children,
}: {
  title: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 min-w-0"
      data-testid={testId}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-1.5 text-sm text-slate-200 leading-snug">{children}</div>
    </div>
  );
}

export function OverviewSnapshotBoxes({
  servedCount,
  referredCount,
  missingCount,
  topChaseLabels,
  riskFlags,
}: {
  servedCount: number;
  referredCount: number;
  missingCount: number;
  topChaseLabels: string[];
  riskFlags: string[];
}) {
  return (
    <section className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2`} data-testid="overview-snapshot-boxes">
      <h2 className={workflowSectionTitle}>Case snapshot</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <SnapshotBox title="Evidence state" testId="five-answers-evidence-state">
          <p>
            <span className="text-emerald-300/90">{servedCount}</span> served
            {" · "}
            <span className="text-amber-300/90">{referredCount}</span> referred
            {" · "}
            <span className="text-rose-300/90">{missingCount}</span> missing
          </p>
        </SnapshotBox>
        <SnapshotBox title="Disclosure gaps" testId="five-answers-chase">
          {topChaseLabels.length ? (
            <ul className="space-y-1 text-xs text-slate-300">
              {topChaseLabels.slice(0, 3).map((label, i) => (
                <li key={i} className="line-clamp-2">
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No chase items listed yet.</p>
          )}
        </SnapshotBox>
        <SnapshotBox title="Risk flags" testId="five-answers-must-not">
          {riskFlags.length ? (
            <ul className="space-y-1 text-xs text-amber-100/90">
              {riskFlags.slice(0, 3).map((flag, i) => (
                <li key={i} className="line-clamp-2">
                  {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No overstatement flags on this preview.</p>
          )}
        </SnapshotBox>
      </div>
    </section>
  );
}
