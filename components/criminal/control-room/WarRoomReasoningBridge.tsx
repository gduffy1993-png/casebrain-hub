"use client";

import { Gavel, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { ReasoningV2WarRoomSection } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";

export type WarRoomReasoningBridgeProps = {
  warRoom: ReasoningV2WarRoomSection | null;
};

function BulletList({ items, cap = 6 }: { items: string[]; cap?: number }) {
  const visible = items.filter(Boolean).slice(0, cap);
  if (!visible.length) return null;
  return (
    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-800 leading-relaxed">
      {visible.map((item, i) => (
        <li key={`${i}-${item.slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  );
}

export function WarRoomReasoningBridge({ warRoom }: WarRoomReasoningBridgeProps) {
  if (!warRoom) return null;

  return (
    <section
      className={`${workflowCard} border-indigo-100/80`}
      aria-label="War room reasoning bridge"
      data-testid="war-room-reasoning-bridge"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-indigo-50/50 px-4 py-3">
        <Gavel className="h-4 w-4 text-indigo-700 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Hearing reasoning bridge</h2>
          <p className="text-[11px] text-slate-500">War Room lines from proof map · read-only</p>
        </div>
        {warRoom.solicitorReviewRequired ? (
          <Badge variant="secondary" size="sm" className="ml-auto bg-amber-50 text-amber-900">
            Solicitor review
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-3">
        {warRoom.solicitorReviewRequired && warRoom.solicitorReviewReasons.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={`${workflowSectionTitle} text-amber-950`}>Solicitor review reasons</p>
              <BulletList items={warRoom.solicitorReviewReasons} cap={4} />
            </div>
          </div>
        ) : null}

        <div>
          <p className={workflowSectionTitle}>Safe hearing line</p>
          <p className="mt-1 text-xs text-slate-800 leading-relaxed">{warRoom.safeHearingLine}</p>
        </div>

        <div>
          <p className={workflowSectionTitle}>Court record requests</p>
          <BulletList items={warRoom.courtRecordRequests} />
          {!warRoom.courtRecordRequests.length ? (
            <p className={`text-xs ${workflowMuted}`}>None flagged on current papers.</p>
          ) : null}
        </div>

        <div>
          <p className={workflowSectionTitle}>Disclosure timetable requests</p>
          <BulletList items={warRoom.disclosureTimetableRequests} />
          {!warRoom.disclosureTimetableRequests.length ? (
            <p className={`text-xs ${workflowMuted}`}>None flagged on current papers.</p>
          ) : null}
        </div>

        <div>
          <p className={workflowSectionTitle}>Do not concede</p>
          <BulletList items={warRoom.doNotConcede} />
        </div>

        <div>
          <p className={workflowSectionTitle}>Do not overstate</p>
          <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">{warRoom.doNotOverstate}</p>
        </div>
      </div>
    </section>
  );
}
