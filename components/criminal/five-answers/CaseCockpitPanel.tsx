"use client";

import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

function CockpitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800/80 bg-slate-950/35 px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200 leading-snug line-clamp-3">{value}</p>
    </div>
  );
}

export function CaseCockpitPanel({
  mainIssue,
  sourcePosition,
  nextAction,
}: {
  mainIssue: string;
  sourcePosition: string;
  nextAction: string;
}) {
  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3`}
      data-testid="case-snapshot-panel"
    >
      <h2 className={workflowSectionTitle}>Case cockpit</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <CockpitRow label="Main issue" value={mainIssue} />
        <CockpitRow label="Source position" value={sourcePosition} />
        <CockpitRow label="Next action" value={nextAction} />
      </div>
    </section>
  );
}
