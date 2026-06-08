"use client";

import { workflowMuted } from "./workflowUi";

/** Compact trust line — replaces large safety banners on workflow surfaces. */
export function WorkflowSafetyLine({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[10px] text-center ${workflowMuted} ${className}`.trim()}>
      Evidence-linked · Conditional · Solicitor review required
    </p>
  );
}
