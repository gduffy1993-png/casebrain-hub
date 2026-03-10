"use client";

/**
 * Phase 4: Hearing-Ready Strategy (HRS)
 * Per-hearing-type checklist: what to do/say at the next hearing.
 */

import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { getChecklistForHearingType } from "@/lib/criminal/hearing-ready-checklists";

type HearingReadyStrategyProps = {
  snapshot: CaseSnapshot | null;
};

export function HearingReadyStrategy({ snapshot }: HearingReadyStrategyProps) {
  const nextType = snapshot?.caseMeta?.hearingNextType ?? null;
  const nextDate = snapshot?.caseMeta?.hearingNextAt ?? null;
  const stage = snapshot?.caseMeta?.caseStage ?? "unknown";

  const checklist = getChecklistForHearingType(nextType);
  const hearingLabel = nextType ? `${nextType}${nextDate ? ` – ${new Date(nextDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}` : "Next hearing";

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-1">For your next hearing</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {hearingLabel}
        {stage !== "unknown" && (
          <span className="ml-2 text-muted-foreground">· Stage: {stage.replace(/_/g, " ")}</span>
        )}
      </p>
      <ul className="space-y-2">
        {checklist.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
            <span className="text-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
