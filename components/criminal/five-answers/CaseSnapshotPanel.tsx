"use client";

import { Badge } from "@/components/ui/badge";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { SourceStateBadge } from "@/components/criminal/trust/SourceStateBadge";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

const LEVEL_VARIANTS: Record<
  MatterConfidenceResult["level"],
  "success" | "warning" | "secondary" | "danger"
> = {
  safe: "success",
  provisional: "secondary",
  needs_review: "warning",
  blocked: "danger",
};

export function CaseSnapshotPanel({
  clientLabel,
  allegation,
  courtLine,
  hearingLine,
  confidence,
}: {
  clientLabel: string | null;
  allegation: string | null;
  courtLine: string | null;
  hearingLine: string | null;
  confidence: MatterConfidenceResult;
}) {
  const visible = confidence.sourceBadgesVisible ?? confidence.sourceBadges.slice(0, 4);
  const overflow = confidence.sourceBadgesOverflow ?? confidence.sourceBadges.slice(4);

  const defendant = clientLabel?.trim() || "Defendant not on papers";
  const offence = allegation?.trim() || "Offence not on papers";
  const court = courtLine?.trim() || "Court not on papers";
  const hearing = hearingLine?.trim() || "Hearing date not on papers";

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3`}
      data-testid="case-snapshot-panel"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Case snapshot</p>
      <div className="space-y-1">
        <h2 className={`${workflowSectionTitle} text-base`}>{defendant}</h2>
        <p className="text-sm text-slate-300">{offence}</p>
        <p className="text-xs text-slate-400">
          {court}
          <span className="text-slate-600 mx-1.5">·</span>
          {hearing}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={LEVEL_VARIANTS[confidence.level]} size="sm">
          {confidence.label}
        </Badge>
        {visible.map((state) => (
          <SourceStateBadge key={state} state={state} />
        ))}
        {overflow.length > 0 ? (
          <span className="text-[10px] text-slate-500" title={overflow.join(", ")}>
            +{overflow.length} more
          </span>
        ) : null}
      </div>

      {confidence.doNotRelyYetReason ? (
        <p className="text-xs text-amber-400/90 leading-snug">{confidence.doNotRelyYetReason}</p>
      ) : null}

      <div className="grid gap-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-2">
        <p>
          <span className="font-medium text-slate-500">Main issue: </span>
          {confidence.mainIssue}
        </p>
        <p>
          <span className="font-medium text-slate-500">Next best action: </span>
          {confidence.nextBestAction}
        </p>
      </div>
    </section>
  );
}
