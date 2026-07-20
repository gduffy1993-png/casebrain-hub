"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import type { SolicitorIntegrityResult } from "@/lib/criminal/solicitor-output-integrity";
import { SOLICITOR_DEEP_UNAVAILABLE_MESSAGE } from "@/lib/criminal/solicitor-output-integrity";

/**
 * Gate for expandable / deep solicitor surfaces.
 * When integrity fails, do not render copyable children — show unavailable instead.
 */
export function SolicitorDeepDetailGate({
  integrity,
  children,
  label = "More detail",
}: {
  integrity: SolicitorIntegrityResult | null | undefined;
  children: ReactNode;
  label?: string;
}) {
  if (integrity != null && !integrity.deepDetailAvailable) {
    return (
      <div
        className="rounded-md border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 space-y-1"
        data-testid="solicitor-deep-detail-unavailable"
        role="status"
      >
        <div className="flex items-center gap-2 text-amber-300">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-wider">{label} unavailable</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {integrity.banner ?? SOLICITOR_DEEP_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
