"use client";

import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { ReasoningV2WarRoomSection } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { ExpandableStringList, REASONING_V2_SOURCE_BASIS_MAX, truncateSourceBasis } from "./reasoningV2Ui";

export type WarRoomReasoningBridgeProps = {
  warRoom: ReasoningV2WarRoomSection | null;
};

export function WarRoomReasoningBridge({ warRoom }: WarRoomReasoningBridgeProps) {
  if (!warRoom) return null;

  return (
    <section
      className={`${workflowCard} border-indigo-100/80`}
      aria-label="Hearing reasoning bridge"
      data-testid="war-room-reasoning-bridge"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-indigo-50/50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Hearing reasoning bridge</h2>
          <p className="text-[11px] text-slate-500">Source-backed hearing lines · read-only</p>
        </div>
        {warRoom.solicitorReviewRequired ? (
          <Badge variant="secondary" size="sm" className="bg-amber-50 text-amber-900 shrink-0">
            Solicitor review required
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-3 min-w-0">
        {warRoom.solicitorReviewRequired && warRoom.solicitorReviewReasons.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={`${workflowSectionTitle} text-amber-950`}>Solicitor review reasons</p>
              <ExpandableStringList items={warRoom.solicitorReviewReasons} previewCount={3} />
            </div>
          </div>
        ) : null}

        <div className="min-w-0">
          <p className={workflowSectionTitle}>Safe hearing line</p>
          <p className="mt-1 text-xs text-slate-800 leading-relaxed break-words">{warRoom.safeHearingLine}</p>
        </div>

        <div className="min-w-0">
          <p className={workflowSectionTitle}>Court record requests</p>
          <ExpandableStringList items={warRoom.courtRecordRequests} previewCount={4} />
          {!warRoom.courtRecordRequests.length ? (
            <p className={`text-xs ${workflowMuted}`}>None flagged on current papers.</p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className={workflowSectionTitle}>Disclosure timetable requests</p>
          <ExpandableStringList items={warRoom.disclosureTimetableRequests} previewCount={4} />
          {!warRoom.disclosureTimetableRequests.length ? (
            <p className={`text-xs ${workflowMuted}`}>None flagged on current papers.</p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className={workflowSectionTitle}>Do not concede</p>
          <ExpandableStringList items={warRoom.doNotConcede} previewCount={4} />
        </div>

        <div className="min-w-0">
          <p className={workflowSectionTitle}>Do not overstate</p>
          <p className="mt-1 text-xs text-amber-900/90 leading-relaxed break-words">
            {truncateSourceBasis(warRoom.doNotOverstate, REASONING_V2_SOURCE_BASIS_MAX * 2)}
          </p>
        </div>
      </div>
    </section>
  );
}
