"use client";

import { ControlRoomAssistantDock } from "@/components/criminal/control-room/ControlRoomAssistant";
import type { ControlRoomAssistantContext } from "@/components/criminal/control-room/assistantBattleboardFallback";

export function HearingWarRoomAssistant({
  caseId,
  planSummary,
  evidenceSummary,
  timelineSummary,
  assistantContext,
}: {
  caseId: string;
  planSummary: string;
  evidenceSummary?: string;
  timelineSummary?: string;
  assistantContext: ControlRoomAssistantContext;
}) {
  return (
    <ControlRoomAssistantDock
      caseId={caseId}
      planSummary={planSummary}
      evidenceSummary={evidenceSummary}
      timelineSummary={timelineSummary}
      assistantContext={assistantContext}
    />
  );
}
