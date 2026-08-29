"use client";

import type { RenderedSolicitorFacts } from "@/lib/criminal/solicitor-fact-renderer";
import { workflowPilotCard, workflowSectionTitle } from "./workflowUi";

export function SolicitorFactStrip({
  facts,
  fingerprint = null,
}: {
  facts: RenderedSolicitorFacts;
  fingerprint?: string | null;
}) {
  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2`}
      data-testid="solicitor-fact-strip"
      data-canonical-fingerprint={fingerprint ?? undefined}
    >
      <h2 className={workflowSectionTitle}>On the file</h2>
      <p className="text-[11px] text-slate-500">
        Locked facts only. If a line says not confirmed, no tab or chat may fill it in.
      </p>
      <ul className="space-y-1 text-sm text-slate-200">
        {facts.displayLines.map((line) => (
          <li key={line} className="leading-snug" data-testid="solicitor-fact-line">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
