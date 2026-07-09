"use client";

import type { EvidenceExistence } from "@/lib/criminal/five-answers/types";
import { STATE_COLOUR_CLASSES, stateColourKey } from "@/lib/criminal/proof-receipt";

export function EvidenceStateBadge({ existence }: { existence: EvidenceExistence }) {
  const key = stateColourKey(existence);
  const style = STATE_COLOUR_CLASSES[key];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${style.badge}`}
      data-testid={`evidence-state-badge-${key}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}

export function EvidenceStateLegend() {
  const keys = ["served", "partial", "referred", "missing"] as const;
  return (
    <div className="flex flex-wrap gap-2 text-[10px]" data-testid="evidence-state-legend">
      {keys.map((key) => (
        <span key={key} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${STATE_COLOUR_CLASSES[key].badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATE_COLOUR_CLASSES[key].dot}`} />
          {STATE_COLOUR_CLASSES[key].label}
        </span>
      ))}
    </div>
  );
}
