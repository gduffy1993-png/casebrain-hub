"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { buildCaseSnapshot, type CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { buildEvidenceContext, buildTimelineContext } from "@/lib/criminal/evidence-context";
import { DisclosureChase } from "@/components/criminal/disclosure-chase/DisclosureChase";
import { HearingWarRoom } from "@/components/criminal/hearing-war-room/HearingWarRoom";
import { RecordPositionModal } from "@/components/criminal/RecordPositionModal";
import { AddEvidenceModal } from "@/components/criminal/AddEvidenceModal";
import type { StrategyCommitment } from "@/components/criminal/StrategyCommitmentPanel";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import { CaseWorkflowShell } from "./CaseWorkflowShell";
import { PilotPapersView } from "./PilotPapersView";
import { PilotSummaryView } from "./PilotSummaryView";
import { PilotDeskNavProvider } from "./pilotDeskNavContext";
import { useCaseWorkflowActiveTab } from "./useCaseWorkflowActiveTab";
import { usePilotDemoSession } from "./usePilotDemoSession";
import { buildCourtTodayDeskHref } from "@/components/criminal/criminalCaseNavigation";
import { workflowPilotCard } from "./workflowUi";
import { mapSnapshotToWorkflowDocuments } from "./caseWorkflowDocuments";
import { FiveAnswersView } from "@/components/criminal/five-answers/FiveAnswersView";

export type PilotMatterDeskProps = {
  caseId: string;
  deskSafeCourtLine?: string | null;
  deskChargeLine?: string | null;
};

/** Pic 5 right pane — full pilot tab workspace on Court Today. Brains unchanged. */
export function PilotMatterDesk({ caseId, deskSafeCourtLine, deskChargeLine }: PilotMatterDeskProps) {
  const router = useRouter();
  const activeTab = useCaseWorkflowActiveTab();
  const { uploadDisabled: pilotUploadDisabled, recordPositionDisabled: pilotRecordPositionHidden } =
    usePilotDemoSession();

  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [savedPosition, setSavedPosition] = useState<{
    id: string;
    position_text: string;
    created_at: string;
    phase: number;
  } | null>(null);
  const [hasSavedPosition, setHasSavedPosition] = useState(false);
  const [matterState, setMatterState] = useState<string | null>(null);
  const [effectiveProceduralSafety] = useState<{
    status: string;
    outstandingItems?: string[];
  } | null>(null);
  const defencePlan = null as DefenceStrategyPlan | null;
  const displayStrategy = null as { displayLabel: string; displayCategory: string } | null;
  const committedStrategy = null as StrategyCommitment | null;
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [pendingPositionText, setPendingPositionText] = useState<string | null>(null);
  const [showAddEvidenceUpload, setShowAddEvidenceUpload] = useState(false);

  const openUploadEvidence = pilotUploadDisabled ? undefined : () => setShowAddEvidenceUpload(true);
  const openRecordPosition = pilotRecordPositionHidden
    ? undefined
    : () => {
        setPendingPositionText(null);
        setIsPositionModalOpen(true);
      };

  useEffect(() => {
    let cancelled = false;
    setSnapshotLoading(true);
    buildCaseSnapshot(caseId)
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/position`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && (data.data || data.position)) {
          setSavedPosition(data.data || data.position);
          setHasSavedPosition(true);
        } else {
          setSavedPosition(null);
          setHasSavedPosition(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSavedPosition(null);
          setHasSavedPosition(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setMatterState(data.matterState ?? data.stage ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const hearingWarRoomSharedProps = useMemo(
    () => ({
      caseId,
      snapshot,
      snapshotLoading,
      hasSavedPosition,
      savedPosition,
      defencePlan,
      displayStrategy,
      committedStrategy,
      matterState,
      effectiveProceduralSafety,
      evidenceSummary: snapshot
        ? buildEvidenceContext(snapshot, effectiveProceduralSafety?.outstandingItems)
        : undefined,
      timelineSummary: snapshot ? buildTimelineContext(snapshot) : undefined,
      onRecordPosition: openRecordPosition,
      onUploadEvidence: openUploadEvidence,
      controlRoomMode: true,
      embedInShell: true,
      deskChargeLine,
    }),
    [
      caseId,
      snapshot,
      snapshotLoading,
      hasSavedPosition,
      savedPosition,
      matterState,
      effectiveProceduralSafety,
      openRecordPosition,
      openUploadEvidence,
      deskChargeLine,
    ],
  );

  const disclosureChaseSharedProps = useMemo(
    () => ({
      caseId,
      snapshot,
      snapshotLoading,
      hasSavedPosition,
      savedPosition,
      matterState,
      effectiveProceduralSafety,
    }),
    [caseId, snapshot, snapshotLoading, hasSavedPosition, savedPosition, matterState, effectiveProceduralSafety],
  );

  const controlRoomProps = useMemo(
    () => ({
      caseId,
      snapshot,
      snapshotLoading,
      savedPosition,
      hasSavedPosition,
      defencePlan,
      displayStrategy,
      committedStrategy,
      matterState,
      effectiveProceduralSafety,
      evidenceSummary: snapshot
        ? buildEvidenceContext(snapshot, effectiveProceduralSafety?.outstandingItems)
        : undefined,
      timelineSummary: snapshot ? buildTimelineContext(snapshot) : undefined,
      onRecordPosition: openRecordPosition,
      onUploadEvidence: openUploadEvidence,
    }),
    [
      caseId,
      snapshot,
      snapshotLoading,
      savedPosition,
      hasSavedPosition,
      matterState,
      effectiveProceduralSafety,
      openRecordPosition,
      openUploadEvidence,
    ],
  );

  const refetchPosition = useCallback(async () => {
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        if (data.ok && (data.data || data.position)) {
          setSavedPosition(data.data || data.position);
          setHasSavedPosition(true);
        } else {
          setSavedPosition(null);
          setHasSavedPosition(false);
        }
      }
    } catch {
      /* ignore */
    }
    router.refresh();
  }, [caseId, router]);

  const tabBody = (() => {
    if (snapshotLoading && !snapshot) {
      return (
        <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          Loading matter…
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return <FiveAnswersView caseId={caseId} />;
      case "today":
      case "hearing-war-room":
        return <HearingWarRoom {...hearingWarRoomSharedProps} />;
      case "papers":
      case "control-room":
        return <PilotPapersView {...controlRoomProps} embedInShell />;
      case "summary":
        return (
          <ErrorBoundary
            fallback={
              <Card className="p-4 border-slate-700 bg-slate-900/40">
                <p className="text-sm text-slate-400">Summary will appear once documents are processed.</p>
              </Card>
            }
          >
            <PilotSummaryView caseId={caseId} caseTitle={snapshot?.caseMeta?.title ?? "Untitled Case"} />
          </ErrorBoundary>
        );
      case "disclosure-chase":
        return <DisclosureChase {...disclosureChaseSharedProps} controlRoomMode embedInShell />;
      case "file":
      case "documents":
        return null;
      default:
        return <FiveAnswersView caseId={caseId} />;
    }
  })();

  const isFileTab = activeTab === "file" || activeTab === "documents";
  const workflowDocuments = useMemo(() => mapSnapshotToWorkflowDocuments(snapshot), [snapshot]);

  return (
    <PilotDeskNavProvider buildTabHref={buildCourtTodayDeskHref}>
      <div className="min-w-0" data-testid="pilot-matter-desk">
        <CaseWorkflowShell
          caseId={caseId}
          safeCourtLine={deskSafeCourtLine}
          deskChargeLine={deskChargeLine}
          documents={workflowDocuments}
          onRecordPosition={pilotRecordPositionHidden ? undefined : openRecordPosition}
          onUploadEvidence={pilotUploadDisabled ? undefined : openUploadEvidence}
          pilotUploadDisabled={pilotUploadDisabled}
          pilotRecordPositionHidden={pilotRecordPositionHidden}
          documentsOnly={isFileTab}
        >
          {!isFileTab ? tabBody : null}
        </CaseWorkflowShell>

        <RecordPositionModal
          caseId={caseId}
          charges={snapshot?.charges?.map((c) => ({ offence: c.offence, section: c.section ?? null })) ?? []}
          isOpen={isPositionModalOpen}
          onClose={() => {
            setIsPositionModalOpen(false);
            setPendingPositionText(null);
          }}
          onSuccess={() => void refetchPosition()}
          initialText={pendingPositionText ?? savedPosition?.position_text ?? ""}
          currentPhase={2}
          onPhase2Request={() => {}}
          onAutoAdvanceToPhase2={() => {}}
          showPhase2CTA={false}
        />
        {showAddEvidenceUpload ? (
          <AddEvidenceModal
            caseId={caseId}
            caseTitle={snapshot?.caseMeta?.title ?? undefined}
            isOpen={showAddEvidenceUpload}
            onClose={() => setShowAddEvidenceUpload(false)}
            onSuccess={async () => {
              setShowAddEvidenceUpload(false);
              try {
                setSnapshot(await buildCaseSnapshot(caseId));
              } catch {
                /* ignore */
              }
              router.refresh();
            }}
          />
        ) : null}
      </div>
    </PilotDeskNavProvider>
  );
}
