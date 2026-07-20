"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

/**
 * Collapsed-by-default drawer for proof receipts, proof packet, truth map, and family review.
 * Smoke can expand via data-testid="overview-proof-depth-toggle".
 */
export function OverviewProofDepthDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`${workflowPilotCard} px-3 py-2.5 sm:px-4 space-y-0`}
      data-testid="overview-proof-depth-drawer"
      id="overview-trust"
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 py-1.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="overview-proof-depth-toggle"
      >
        <Shield className="h-4 w-4 text-blue-300/90 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className={workflowSectionTitle}>Proof / audit depth</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Proof receipts, proof packet, truth map, and family review — expand when you need source depth.
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open ? <div className="pb-2 pt-1 space-y-3">{children}</div> : null}
    </section>
  );
}
