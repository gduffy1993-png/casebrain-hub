"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Clock3, FileWarning, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";
import type { OverviewWorkspaceVm } from "@/lib/criminal/overview-workspace";

export function OverviewWorkspaceHeader({ vm }: { vm: OverviewWorkspaceVm }) {
  return (
    <header
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-3`}
      data-testid="overview-workspace-header"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-50 truncate">
              {vm.clientLabel}
            </h1>
            {vm.provisional ? (
              <Badge variant="secondary" size="sm" className="shrink-0 text-[10px]">
                Provisional
              </Badge>
            ) : null}
            <Badge
              variant={vm.readinessCategory === "paper_backed" ? "success" : vm.readinessCategory === "blocked" ? "danger" : "secondary"}
              size="sm"
              className="shrink-0 text-[10px]"
            >
              {vm.statusBadge}
            </Badge>
          </div>
          <p className="text-sm text-slate-300">
            <span className="font-medium text-slate-100">{vm.chargeLabel}</span>
            <span className="text-slate-600"> · </span>
            <span>{vm.stageLabel}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {vm.courtLabel}
            <span className="text-slate-700"> · </span>
            {vm.hearingLabel}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-2xl lg:items-end">
          {vm.readinessBanner ? (
            <div
              className="w-full rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2"
              data-testid="overview-readiness-banner"
            >
              <p className="text-[13px] font-semibold text-slate-100">{vm.readinessBanner}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">{vm.readinessDetail}</p>
            </div>
          ) : null}

          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 w-full"
            data-testid="overview-top-counters"
          >
            <StatChip
              icon={<FileWarning className="h-3.5 w-3.5 text-rose-400" />}
              title={`${vm.counts.missingOutstanding}`}
              label="Missing / Outstanding"
              testId="overview-counter-missing"
            />
            <StatChip
              icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
              title={`${vm.counts.incomplete}`}
              label="Incomplete"
              testId="overview-counter-incomplete"
            />
            <StatChip
              icon={<Clock3 className="h-3.5 w-3.5 text-sky-400" />}
              title={`${vm.counts.activeChases}`}
              label="Active chases"
              testId="overview-counter-chases"
            />
            {vm.counts.notSafelyConfirmed > 0 ? (
              <StatChip
                icon={<HelpCircle className="h-3.5 w-3.5 text-slate-400" />}
                title={`${vm.counts.notSafelyConfirmed}`}
                label="Not safely confirmed"
                testId="overview-counter-nsc"
              />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function StatChip({
  icon,
  title,
  label,
  testId,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-md border border-slate-700/70 bg-slate-950/50 px-2.5 py-2 min-w-0"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-base font-semibold tabular-nums text-slate-100">{title}</p>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">{label}</p>
    </div>
  );
}
