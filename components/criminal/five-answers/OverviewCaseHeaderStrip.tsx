"use client";

import { Badge } from "@/components/ui/badge";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";

export function OverviewCaseHeaderStrip({
  defendant,
  offence,
  court,
  hearing,
  statusLabel,
  statusVariant = "secondary",
}: {
  defendant: string;
  offence: string;
  court: string;
  hearing: string;
  statusLabel: string;
  statusVariant?: "success" | "warning" | "secondary" | "danger";
}) {
  return (
    <section
      className={`${workflowPilotCard} px-3 py-2.5 sm:px-4`}
      data-testid="case-snapshot-panel"
      aria-label="Case header"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold text-slate-100 truncate">{defendant || "Client"}</p>
          <p className="text-xs text-slate-300 leading-snug line-clamp-2">{offence || "Offence not confirmed on papers"}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {[court || "Court not confirmed", hearing || "Hearing not confirmed"].join(" · ")}
          </p>
        </div>
        <Badge variant={statusVariant} size="sm" className="shrink-0 text-[10px]">
          {statusLabel}
        </Badge>
      </div>
    </section>
  );
}
