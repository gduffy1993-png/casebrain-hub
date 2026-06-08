"use client";

/**
 * Phase 5: Playbooks per offence
 * Shows key disclosure that matters and common defence angles for the resolved offence.
 */

import { Card } from "@/components/ui/card";
import { getPlaybookForOffence } from "@/lib/criminal/playbooks-by-offence";
import { normaliseOffenceType } from "@/lib/criminal/strategy-suggest/constants";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type OffencePlaybookCardProps = {
  snapshot: CaseSnapshot | null;
};

export function OffencePlaybookCard({ snapshot }: OffencePlaybookCardProps) {
  const raw = snapshot?.resolvedOffence?.offenceType;
  if (!raw || typeof raw !== "string" || raw === "unknown") return null;

  const offenceType = normaliseOffenceType(raw);
  const playbook = getPlaybookForOffence(offenceType);
  const label = snapshot?.resolvedOffence?.label ?? offenceType.replace(/_/g, " ");

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Playbook: {label}</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Key disclosure and common defence angles for this offence type.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Key disclosure that matters</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {playbook.keyDisclosure.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Common defence angles</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {playbook.commonAngleLabels.slice(0, 8).map((angle, i) => (
              <li key={i}>{angle}</li>
            ))}
            {playbook.commonAngleLabels.length > 8 && (
              <li className="text-xs">+{playbook.commonAngleLabels.length - 8} more</li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
