"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";
import type { SolicitorIntegrityResult } from "@/lib/criminal/solicitor-output-integrity";
import { SolicitorDeepDetailGate } from "@/components/criminal/trust/SolicitorDeepDetailGate";

export function OverviewAdvancedPanel({
  children,
  defaultOpen = false,
  integrity = null,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  integrity?: SolicitorIntegrityResult | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const blocked = integrity != null && !integrity.deepDetailAvailable;

  return (
    <section className={`${workflowPilotCard} overflow-hidden`} data-testid="overview-advanced-panel">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-900/40 disabled:opacity-70"
        aria-expanded={open && !blocked}
        disabled={blocked}
        onClick={() => {
          if (blocked) return;
          setOpen((v) => !v);
        }}
        data-testid="overview-advanced-toggle"
      >
        <div>
          <p className="text-sm font-medium text-slate-200">Advanced review</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {blocked
              ? "Advanced tools unavailable until integrity checks pass."
              : "Confidence dashboard · Decision options · Advice change radar · Re-run diff · Feedback"}
          </p>
        </div>
        {open && !blocked ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>
      {blocked ? (
        <div className="px-4 pb-3 border-t border-slate-800/80 pt-3">
          <SolicitorDeepDetailGate integrity={integrity} label="Advanced review">
            {null}
          </SolicitorDeepDetailGate>
        </div>
      ) : open ? (
        <div className="px-1 pb-3 space-y-3 border-t border-slate-800/80">{children}</div>
      ) : null}
    </section>
  );
}
