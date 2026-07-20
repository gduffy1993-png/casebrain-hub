"use client";

import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

export function OverviewSafeWordingCard({
  safeToSay,
  notSafeToSay,
}: {
  safeToSay: string[];
  notSafeToSay: string[];
}) {
  const blocked = notSafeToSay.slice(0, 2);

  return (
    <section className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2.5`} data-testid="overview-safe-wording-card">
      <h2 className={workflowSectionTitle}>Safe wording</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-emerald-900/35 bg-emerald-950/15 px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">Safe to say</p>
          {safeToSay.length ? (
            <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
              {safeToSay.slice(0, 3).map((line, i) => (
                <li key={i} className="leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">Keep wording provisional and source-linked.</p>
          )}
        </div>
        <div className="rounded-md border border-amber-900/40 bg-amber-950/15 px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">Not safe to say</p>
          {blocked.length ? (
            <DontSaySafetyBox items={blocked} compact />
          ) : (
            <p className="text-xs text-slate-400">No blocked examples on this preview.</p>
          )}
        </div>
      </div>
    </section>
  );
}
