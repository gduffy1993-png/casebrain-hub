"use client";

import { FIVE_ANSWERS_HARD_RULES } from "@/lib/criminal/five-answers/evidence-trace";

/** Compact trust strip — first four hard rules (presentation only). */
const COMPACT_TRUTH_RULES = FIVE_ANSWERS_HARD_RULES.slice(0, 4);

export function EvidenceTruthRulesStrip() {
  return (
    <div
      className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2"
      data-testid="evidence-truth-rules-strip"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        Evidence truth rules
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 list-none p-0 m-0">
        {COMPACT_TRUTH_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
