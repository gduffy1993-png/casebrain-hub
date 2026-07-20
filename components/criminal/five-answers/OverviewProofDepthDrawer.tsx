"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { SolicitorIntegrityResult } from "@/lib/criminal/solicitor-output-integrity";
import { SolicitorDeepDetailGate } from "@/components/criminal/trust/SolicitorDeepDetailGate";

/**
 * Collapsed-by-default drawer for proof receipts, proof packet, truth map, and family review.
 * Smoke can expand via data-testid="overview-proof-depth-toggle".
 */
export function OverviewProofDepthDrawer({
  children,
  integrity = null,
}: {
  children: ReactNode;
  integrity?: SolicitorIntegrityResult | null;
}) {
  const [open, setOpen] = useState(false);
  const deepBlocked = integrity != null && !integrity.deepDetailAvailable;

  return (
    <section
      className={`${workflowPilotCard} px-3 py-2.5 sm:px-4 space-y-0`}
      data-testid="overview-proof-depth-drawer"
      id="overview-trust"
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 py-1.5 text-left disabled:opacity-70"
        aria-expanded={open && !deepBlocked}
        onClick={() => {
          if (deepBlocked) return;
          setOpen((v) => !v);
        }}
        disabled={deepBlocked}
        data-testid="overview-proof-depth-toggle"
      >
        <Shield className="h-4 w-4 text-blue-300/90 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className={workflowSectionTitle}>Proof / audit depth</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {deepBlocked
              ? "Deep audit output unavailable until integrity checks pass."
              : "Proof receipts and truth map — expand when you need source depth."}
          </p>
        </div>
        {open && !deepBlocked ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>
      {deepBlocked ? (
        <div className="pb-2 pt-1">
          <SolicitorDeepDetailGate integrity={integrity} label="Proof / audit depth">
            {null}
          </SolicitorDeepDetailGate>
        </div>
      ) : open ? (
        <div className="pb-2 pt-1 space-y-3">{children}</div>
      ) : null}
    </section>
  );
}
