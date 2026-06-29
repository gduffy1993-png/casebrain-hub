"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";

export function OverviewAdvancedPanel({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`${workflowPilotCard} overflow-hidden`} data-testid="overview-advanced-panel">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-900/40"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="text-sm font-medium text-slate-200">Advanced review</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Confidence dashboard · Decision options · Advice change radar · Re-run diff · Feedback
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open ? <div className="px-1 pb-3 space-y-3 border-t border-slate-800/80">{children}</div> : null}
    </section>
  );
}
