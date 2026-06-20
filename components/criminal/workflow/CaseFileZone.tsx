"use client";

import { useMemo } from "react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { CaseWorkflowShell } from "./CaseWorkflowShell";
import { PilotCaseDocumentsPanel } from "./PilotCaseDocumentsPanel";
import { mapSnapshotToWorkflowDocuments } from "./caseWorkflowDocuments";
import { HearingOutcomeNote } from "./HearingOutcomeNote";
import { ClientVsPapersPanel } from "./ClientVsPapersPanel";
import { PilotDeadlinesPanel } from "./PilotDeadlinesPanel";
import { ClientInstructionsRecorder } from "../ClientInstructionsRecorder";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

export type CaseFileZoneProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  pilotUploadDisabled?: boolean;
  pilotRecordPositionHidden?: boolean;
  embedInShell?: boolean;
};

/** Pilot File zone — documents + file note workflow (brains unchanged). */
export function CaseFileZone({
  caseId,
  snapshot,
  pilotUploadDisabled = false,
  pilotRecordPositionHidden = false,
  embedInShell = false,
}: CaseFileZoneProps) {
  const documents = useMemo(() => mapSnapshotToWorkflowDocuments(snapshot), [snapshot]);
  const pilotMode = isCriminalPilotMode();

  const inner = (
    <div className="space-y-3">
      <PilotCaseDocumentsPanel documents={documents} pilotDark={pilotMode && embedInShell} />
      {!pilotMode ? (
        <>
          <HearingOutcomeNote caseId={caseId} />
          <ClientVsPapersPanel caseId={caseId} />
          {!pilotRecordPositionHidden ? (
            <ClientInstructionsRecorder caseId={caseId} />
          ) : null}
          <PilotDeadlinesPanel caseId={caseId} />
        </>
      ) : null}
    </div>
  );

  if (embedInShell) {
    return (
      <div className="min-h-0" data-testid="case-file-zone">
        {inner}
      </div>
    );
  }

  return (
    <div className="min-h-0 pb-8 text-slate-900" data-testid="case-file-zone">
      <CaseWorkflowShell
        caseId={caseId}
        documents={documents}
        pilotUploadDisabled={pilotUploadDisabled}
        pilotRecordPositionHidden={pilotRecordPositionHidden}
      >
        {inner}
      </CaseWorkflowShell>
    </div>
  );
}
