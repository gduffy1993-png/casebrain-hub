"use client";

import { useState } from "react";
import type { OverviewWorkspaceVm } from "@/lib/criminal/overview-workspace";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function OverviewSummaryCards({ vm }: { vm: OverviewWorkspaceVm }) {
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <section className="grid gap-2 sm:gap-3 lg:grid-cols-3" data-testid="overview-summary-cards">
      <article className={`${workflowPilotCard} px-3 py-3 space-y-2`}>
        <h3 className={workflowSectionTitle}>Safe Court Line</h3>
        <p className="text-[12px] leading-relaxed text-slate-300 line-clamp-5">{vm.safeCourtLine}</p>
        {vm.safeCourtLineCanCopy ? (
          <button
            type="button"
            className="rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-700"
            data-testid="overview-copy-safe-court-line"
            onClick={async () => setCopied((await copyText(vm.safeCourtLine)) ? "court" : null)}
          >
            {copied === "court" ? "Copied" : "Copy safe court line"}
          </button>
        ) : (
          <p className="text-[10px] text-slate-500">Copy available when court-safe wording is source-backed.</p>
        )}
      </article>

      <article className={`${workflowPilotCard} px-3 py-3 space-y-2`}>
        <h3 className={workflowSectionTitle}>Client Update</h3>
        <p className="text-[12px] leading-relaxed text-slate-300 line-clamp-5">{vm.clientUpdate}</p>
        {vm.clientUpdateAvailable ? (
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
            data-testid="overview-copy-client-update"
            onClick={async () => setCopied((await copyText(vm.clientUpdate)) ? "client" : null)}
          >
            {copied === "client" ? "Copied" : "Copy client update"}
          </button>
        ) : (
          <p className="text-[10px] text-slate-500">Review Summary tab once papers are processed.</p>
        )}
      </article>

      <article className={`${workflowPilotCard} px-3 py-3 space-y-2`} data-testid="overview-case-readiness">
        <h3 className={workflowSectionTitle}>Case Readiness</h3>
        <p className="text-[13px] font-semibold text-slate-100">
          {vm.readinessBanner ?? (vm.readinessCategory === "paper_backed" ? "Ready for solicitor review" : vm.statusBadge)}
        </p>
        <p className="text-[12px] leading-relaxed text-slate-400">{vm.readinessDetail}</p>
        <ul className="mt-1 space-y-1 text-[11px] text-slate-500">
          <li>
            <span className="text-rose-400/90 tabular-nums">{vm.counts.missingOutstanding}</span> missing / outstanding
          </li>
          <li>
            <span className="text-amber-400/90 tabular-nums">{vm.counts.incomplete}</span> incomplete
          </li>
          <li>
            <span className="text-sky-400/90 tabular-nums">{vm.counts.activeChases}</span> active chases
          </li>
        </ul>
        <p className="text-[10px] text-slate-600">
          Categorical readiness from matter confidence — no invented percentage.
        </p>
      </article>
    </section>
  );
}
