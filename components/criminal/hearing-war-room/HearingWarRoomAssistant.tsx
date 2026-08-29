"use client";

import { ControlRoomAssistantDock } from "@/components/criminal/control-room/ControlRoomAssistant";
import type { ControlRoomAssistantContext } from "@/components/criminal/control-room/assistantBattleboardFallback";
import type { SolicitorFactRecord } from "@/lib/criminal/solicitor-fact-record";

export function HearingWarRoomAssistant({
  caseId,
  planSummary,
  evidenceSummary,
  timelineSummary,
  solicitorFactRecord,
  assistantContext,
}: {
  caseId: string;
  planSummary: string;
  evidenceSummary?: string;
  timelineSummary?: string;
  solicitorFactRecord?: SolicitorFactRecord | null;
  assistantContext: ControlRoomAssistantContext;
}) {
  return (
    <ControlRoomAssistantDock
      caseId={caseId}
      planSummary={planSummary}
      evidenceSummary={evidenceSummary}
      timelineSummary={timelineSummary}
      solicitorFactRecord={solicitorFactRecord}
      assistantContext={assistantContext}
    />
  );
}
