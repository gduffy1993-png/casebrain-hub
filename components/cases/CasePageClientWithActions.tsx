"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaseActionsMenu } from "./CaseActionsMenu";
import { AddDocumentsModal } from "./AddDocumentsModal";
import { AnalysisHistoryModal } from "./AnalysisHistoryModal";
import { AnalysisDeltaPanel } from "./AnalysisDeltaPanel";
import { CaptureWinStoryModal } from "./CaptureWinStoryModal";

type CasePageClientWithActionsProps = {
  caseId: string;
  caseTitle: string;
  analysisStale: boolean;
  showCaptureWin?: boolean;
  latestDelta?: {
    timelineAdded: number;
    timelineRemoved: number;
    issuesAdded: Array<{ label: string; category?: string }>;
    issuesRemoved: Array<{ label: string; category?: string }>;
    missingEvidenceResolved: number;
    missingEvidenceStillOutstanding: number;
    missingEvidenceNew: number;
    riskChanged: {
      from: string | null;
      to: string | null;
      reason?: string;
    } | null;
  } | null;
};

export function CasePageClientWithActions({
  caseId,
  caseTitle,
  analysisStale,
  showCaptureWin = true,
  latestDelta,
}: CasePageClientWithActionsProps) {
  const router = useRouter();
  const [showAddDocs, setShowAddDocs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCaptureWinStory, setShowCaptureWinStory] = useState(false);
  const [showDelta, setShowDelta] = useState(!!latestDelta);
  const [isPending, startTransition] = useTransition();

  const handleRerunAnalysis = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/analysis/rerun`, {
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Failed to re-run analysis");
        }

        const data = await res.json();
        
        // Refresh page to show new version and delta
        router.refresh();
      } catch (error) {
        console.error("Failed to re-run analysis:", error);
        alert("Failed to re-run analysis. Please try again.");
      }
    });
  };

  const handleAddDocumentsSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <CaseActionsMenu
        caseId={caseId}
        analysisStale={analysisStale}
        onAddDocuments={() => setShowAddDocs(true)}
        onRerunAnalysis={handleRerunAnalysis}
        onViewHistory={() => setShowHistory(true)}
        onCaptureWinStory={() => setShowCaptureWinStory(true)}
      />

      <AddDocumentsModal
        caseId={caseId}
        caseTitle={caseTitle}
        isOpen={showAddDocs}
        onClose={() => setShowAddDocs(false)}
        onSuccess={handleAddDocumentsSuccess}
      />

      <AnalysisHistoryModal
        caseId={caseId}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {latestDelta && showDelta && (
        <AnalysisDeltaPanel
          delta={latestDelta}
          onDismiss={() => setShowDelta(false)}
        />
      )}

      {showCaptureWin && (
        <CaptureWinStoryModal
          caseId={caseId}
          caseTitle={caseTitle}
          isOpen={showCaptureWinStory}
          onClose={() => setShowCaptureWinStory(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}

