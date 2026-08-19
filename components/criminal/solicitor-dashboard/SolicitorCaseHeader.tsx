"use client";

import type { ReactNode } from "react";
import type { SolicitorDashboardVm } from "@/lib/criminal/solicitor-dashboard/types";
import { AlertTriangle, Clock3, FileWarning } from "lucide-react";

export function SolicitorCaseHeader({ vm }: { vm: SolicitorDashboardVm }) {
  return (
    <header
      className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-start lg:justify-between"
      data-testid="solicitor-case-header"
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{vm.clientLabel}</h1>
          {vm.provisional ? (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Provisional
            </span>
          ) : null}
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{vm.chargeLabel}</span>
          <span className="text-slate-400"> · </span>
          <span>{vm.stageLabel}</span>
        </p>
        <p className="text-xs text-slate-500">
          {vm.courtLabel}
          <span className="text-slate-300"> · </span>
          {vm.hearingLabel}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-3xl lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl bg-slate-900 px-3.5 py-3 text-white">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-snug">{vm.readinessLabel}</p>
            <p className="mt-0.5 text-[12px] text-slate-300 leading-snug">{vm.readinessDetail}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:w-[340px]">
          <StatChip
            icon={<FileWarning className="h-3.5 w-3.5 text-rose-600" />}
            tone="rose"
            title={`${vm.counts.missing} Missing`}
            subtitle="High impact items"
          />
          <StatChip
            icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
            tone="amber"
            title={`${vm.counts.incomplete} Incomplete`}
            subtitle="Requires completion"
          />
          <StatChip
            icon={<Clock3 className="h-3.5 w-3.5 text-blue-600" />}
            tone="blue"
            title={`${vm.counts.activeChases} Active chases`}
            subtitle="Awaiting response"
          />
        </div>
      </div>
    </header>
  );
}

function StatChip({
  icon,
  title,
  subtitle,
  tone,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: "rose" | "amber" | "blue";
}) {
  const border =
    tone === "rose"
      ? "border-rose-200 bg-rose-50/70"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/70"
        : "border-blue-200 bg-blue-50/70";
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${border}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="truncate text-[11px] font-semibold text-slate-800">{title}</p>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{subtitle}</p>
    </div>
  );
}
