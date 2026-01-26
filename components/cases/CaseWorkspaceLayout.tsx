"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Loader2, FileText, Target } from "lucide-react";
import { getLens, type PracticeArea } from "@/lib/lenses";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { buildCaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { CaseSummaryPanel } from "@/components/cases/CaseSummaryPanel";
import { CaseKeyFactsPanel } from "@/components/cases/KeyFactsPanel";
import { CaseStatusStrip } from "@/components/criminal/CaseStatusStrip";
import { CaseFightPlan } from "@/components/criminal/CaseFightPlan";
import { CasePhaseSelector, type CasePhase } from "@/components/criminal/CasePhaseSelector";
import { CaseEvidenceColumn } from "@/components/criminal/CaseEvidenceColumn";
import { CaseStrategyColumn } from "@/components/criminal/CaseStrategyColumn";
import { EvidenceSelectorModal } from "@/components/cases/EvidenceSelectorModal";
import type { StrategyCommitment } from "@/components/criminal/StrategyCommitmentPanel";

// Import criminal-specific components (only used for criminal)
import { ChargesPanel } from "@/components/criminal/ChargesPanel";
import { PACEComplianceChecker } from "@/components/criminal/PACEComplianceChecker";
import { CourtHearingsPanel } from "@/components/criminal/CourtHearingsPanel";
import { BailTracker } from "@/components/criminal/BailTracker";
import { BailApplicationPanel } from "@/components/criminal/BailApplicationPanel";
import { SentencingMitigationPanel } from "@/components/criminal/SentencingMitigationPanel";
import { ClientAdvicePanel } from "@/components/criminal/ClientAdvicePanel";

type CaseWorkspaceLayoutProps = {
  caseId: string;
  practiceArea: PracticeArea;
  // Optional: For non-criminal cases, we may not have CaseSnapshot
  // In that case, we'll show a "Not available" state
  hasStrategyData?: boolean;
};

/**
 * Shared Case Workspace Layout
 * 
 * Renders the same structure for all practice areas, with behavior differences
 * controlled by lens configs. For criminal cases, preserves exact existing behavior.
 * For other practice areas, shows appropriate fallbacks when strategy data is unavailable.
 */
export function CaseWorkspaceLayout({
  caseId,
  practiceArea,
  hasStrategyData = false,
}: CaseWorkspaceLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lens = getLens(practiceArea);
  
  // Hydration guard
  const [mounted, setMounted] = useState(false);
  
  // Snapshot state (criminal-specific, but structure is shared)
  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [showAddDocuments, setShowAddDocuments] = useState(false);
  
  const [gateBanner, setGateBanner] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);
  const [isDisclosureFirstMode, setIsDisclosureFirstMode] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<CasePhase>(1);
  const [committedStrategy, setCommittedStrategy] = useState<StrategyCommitment | null>(null);
  const [isStrategyCommitted, setIsStrategyCommitted] = useState(false);
  const [hasSavedPosition, setHasSavedPosition] = useState(false);
  const [savedPosition, setSavedPosition] = useState<{ id: string; position_text: string; created_at: string; phase: number } | null>(null);
  const [panelData, setPanelData] = useState<{
    bail: { hasData: boolean };
    sentencing: { hasData: boolean };
    hearings: { hasData: boolean };
    pace: { hasData: boolean };
  }>({
    bail: { hasData: false },
    sentencing: { hasData: false },
    hearings: { hasData: false },
    pace: { hasData: false },
  });

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load snapshot (criminal-specific, but structure is shared)
  useEffect(() => {
    async function loadSnapshot() {
      // For non-criminal cases, skip snapshot loading if not available
      if (practiceArea !== "criminal") {
        setSnapshotLoading(false);
        setSnapshot(null);
        return;
      }
      
      setSnapshotLoading(true);
      setSnapshotError(null);
      try {
        const snap = await buildCaseSnapshot(caseId);
        setSnapshot(snap);
      } catch (error) {
        console.error("[CaseWorkspaceLayout] Failed to load snapshot:", error);
        setSnapshotError(error instanceof Error ? error.message : "Failed to load case data");
        setSnapshot(null);
      } finally {
        setSnapshotLoading(false);
      }
    }
    loadSnapshot();
  }, [caseId, practiceArea]);

  // Check if analysis is gated (criminal-specific logic, but structure is shared)
  useEffect(() => {
    if (!snapshot || practiceArea !== "criminal") return;
    
    const shouldShowGateBanner = 
      (snapshot.analysis.mode === "preview" || snapshot.analysis.mode === "none") &&
      !snapshot.analysis.canShowStrategyOutputs;
    
    if (shouldShowGateBanner) {
      const message = snapshot.analysis.canShowStrategyPreview && !snapshot.analysis.canShowStrategyFull
        ? "Thin pack: limited outputs. Add documents for full strategy routes."
        : "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.";
      
      setGateBanner({
        banner: {
          severity: "warning",
          title: "Insufficient text extracted",
          message,
        },
      });
      setIsDisclosureFirstMode(true);
      setCurrentPhase((prev) => (prev === 1 ? 1 : prev));
    } else {
      setGateBanner(null);
      const primary = snapshot.strategy.primary;
      const mode = primary === "fight_charge" && snapshot.strategy.hasRenderableData 
        ? "OTHER" 
        : "DISCLOSURE-FIRST";
      setIsDisclosureFirstMode(mode === "DISCLOSURE-FIRST");
      if (mode !== "DISCLOSURE-FIRST") {
        setCurrentPhase((prev) => (prev === 1 ? 2 : prev));
      }
    }
  }, [snapshot, practiceArea]);

  // Handle query param actions
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;

    if (action === "reanalyse") {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("action");
      router.replace(`/cases/${caseId}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`, { scroll: false });

      async function triggerReanalyse() {
        try {
          const res = await fetch(`/api/cases/${caseId}/analysis/rerun`, {
            method: "POST",
            credentials: "include",
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Failed to re-run analysis" }));
            throw new Error(errorData.error || `Failed to re-run analysis (${res.status})`);
          }

          const data = await res.json();
          setTimeout(() => {
            router.refresh();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("analysis-rerun-complete", { 
                detail: { versionNumber: data.version_number, caseId } 
              }));
            }
          }, 750);
        } catch (error) {
          console.error(`[CaseWorkspaceLayout] Failed to re-run analysis:`, error);
        }
      }
      triggerReanalyse();
      return;
    }

    if (action === "add-documents") {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("action");
      router.replace(`/cases/${caseId}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`, { scroll: false });
      setShowAddDocuments(true);
      return;
    }
  }, [searchParams, caseId, router]);

  // Check panel data (criminal-specific)
  useEffect(() => {
    if (practiceArea !== "criminal") return;
    
    async function checkPanelData() {
      try {
        const [bailRes, sentencingRes, hearingsRes, paceRes] = await Promise.all([
          fetch(`/api/criminal/${caseId}/bail-application`).catch(() => null),
          fetch(`/api/criminal/${caseId}/sentencing-mitigation`).catch(() => null),
          fetch(`/api/criminal/${caseId}/hearings`).catch(() => null),
          fetch(`/api/criminal/${caseId}/pace`).catch(() => null),
        ]);
        
        const bailData = bailRes?.ok ? await bailRes.json().catch(() => null) : null;
        const sentencingData = sentencingRes?.ok ? await sentencingRes.json().catch(() => null) : null;
        const hearingsData = hearingsRes?.ok ? await hearingsRes.json().catch(() => null) : null;
        const paceData = paceRes?.ok ? await paceRes.json().catch(() => null) : null;
        
        setPanelData({
          bail: { hasData: !!(bailData?.data || bailData?.grounds?.length > 0) },
          sentencing: { hasData: !!(sentencingData?.data || sentencingData?.personalMitigation?.length > 0) },
          hearings: { hasData: !!(hearingsData?.hearings?.length > 0) },
          pace: { hasData: !!(paceData?.data || paceData?.paceStatus) },
        });
      } catch {
        // Silently fail
      }
    }
    
    checkPanelData();
  }, [caseId, practiceArea]);

  // Determine if we have extracted data
  const hasExtractedSummary = snapshot?.caseMeta?.title && snapshot.caseMeta.title !== "Untitled Case";
  const hasExtractedFacts = (snapshot?.evidence?.documents?.length ?? 0) > 0;
  const hasCharges = (snapshot?.charges?.length ?? 0) > 0;
  const hasReadLayerData = hasExtractedSummary || hasExtractedFacts || hasCharges;

  // Phase gating (criminal-specific, but structure is shared)
  const showBailTools = currentPhase >= 2 || panelData.bail.hasData;
  const showSentencingTools = currentPhase >= 3;
  const showCourtHearings = currentPhase >= 1 && (panelData.hearings.hasData || currentPhase >= 2);
  const showPACE = currentPhase >= 1 && (panelData.pace.hasData || currentPhase >= 2);

  // For non-criminal cases without strategy data, show fallback
  if (practiceArea !== "criminal" && !hasStrategyData) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-2 border-muted">
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Strategy analysis not available
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Strategy analysis is not yet available for {lens.practiceArea.replace("_", " ")} cases, or insufficient data has been provided.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pre-Analysis Read Layer */}
      {hasReadLayerData && (
        <>
          {hasExtractedSummary && (
            <CollapsibleSection
              title="Case Summary"
              description="Case overview and summary"
              defaultOpen={true}
              icon={<FileText className="h-4 w-4 text-blue-400" />}
            >
              <ErrorBoundary fallback={
                <Card className="p-4">
                  <h2 className="text-xl font-bold text-foreground mb-2">{snapshot?.caseMeta?.title ?? "Untitled Case"}</h2>
                  <p className="text-sm text-muted-foreground">Summary will appear once documents are processed.</p>
                </Card>
              }>
                <CaseSummaryPanel
                  caseId={caseId}
                  caseTitle={snapshot?.caseMeta?.title ?? "Untitled Case"}
                  practiceArea={null}
                  summary={null}
                />
              </ErrorBoundary>
            </CollapsibleSection>
          )}

          {hasExtractedFacts && (
            <CollapsibleSection
              title="Key Facts"
              description="Parties, dates, amounts, and case overview"
              defaultOpen={true}
              icon={<Target className="h-4 w-4 text-blue-400" />}
            >
              <ErrorBoundary fallback={
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Key facts will appear once documents are processed.</p>
                </Card>
              }>
                <CaseKeyFactsPanel caseId={caseId} />
              </ErrorBoundary>
            </CollapsibleSection>
          )}

          {hasCharges && practiceArea === "criminal" && (
            <ErrorBoundary fallback={
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Charges will appear once documents are processed.</p>
              </Card>
            }>
              <ChargesPanel caseId={caseId} />
            </ErrorBoundary>
          )}
        </>
      )}

      {/* Case Status Strip */}
      {snapshotLoading ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading case status...</span>
          </div>
        </Card>
      ) : snapshotError ? (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">
            Case status will appear once analysis is run.
          </div>
        </Card>
      ) : snapshot ? (
        <CaseStatusStrip snapshot={snapshot} />
      ) : null}

      {/* Primary Defence Strategy - Case Fight Plan */}
      {practiceArea === "criminal" && (
        <ErrorBoundary fallback={
          <div className="text-sm text-muted-foreground p-4">
            {snapshot?.analysis.canShowStrategyPreview && !snapshot?.analysis.canShowStrategyFull
              ? "Strategy preview available (thin pack). Add documents for full routes."
              : "Run analysis to populate this section."}
          </div>
        }>
          <CaseFightPlan 
            caseId={caseId} 
            committedStrategy={committedStrategy}
            canShowStrategyOutputs={snapshot?.analysis.canShowStrategyOutputs ?? false}
            canShowStrategyPreview={snapshot?.analysis.canShowStrategyPreview ?? false}
            canShowStrategyFull={snapshot?.analysis.canShowStrategyFull ?? false}
            strategyDataExists={snapshot?.strategy.strategyDataExists ?? false}
          />
        </ErrorBoundary>
      )}

      {/* Phase Selector */}
      {practiceArea === "criminal" && (
        <CasePhaseSelector
          caseId={caseId}
          isDisclosureFirstMode={isDisclosureFirstMode}
          onPhaseChange={setCurrentPhase}
          defaultPhase={isDisclosureFirstMode ? 1 : 2}
          currentPhase={currentPhase}
          hasSavedPosition={hasSavedPosition}
          onRecordPosition={() => {
            // Position modal would go here
          }}
        />
      )}

      {/* Gate Banner */}
      {gateBanner && (
        <AnalysisGateBanner
          banner={gateBanner.banner}
          diagnostics={gateBanner.diagnostics}
          showHowToFix={true}
          onRunAnalysis={async () => {
            try {
              const res = await fetch(`/api/cases/${caseId}/analysis/rerun`, {
                method: "POST",
                credentials: "include",
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Failed to re-run analysis" }));
                throw new Error(errorData.error || `Failed to re-run analysis (${res.status})`);
              }

              const data = await res.json();
              setTimeout(() => {
                router.refresh();
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("analysis-rerun-complete", { 
                    detail: { versionNumber: data.version_number, caseId } 
                  }));
                }
              }, 750);
            } catch (error) {
              console.error(`[CaseWorkspaceLayout] Failed to re-run analysis:`, error);
            }
          }}
          onAddDocuments={() => {
            window.location.href = `/cases/${caseId}?action=add-documents`;
          }}
          primaryAction={snapshot?.analysis.canShowStrategyPreview && !snapshot?.analysis.canShowStrategyFull ? "addDocuments" : "runAnalysis"}
        />
      )}

      {/* Phase 2: Two-Column Layout (Evidence Left, Strategy Right) */}
      {snapshotLoading ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading case data...</span>
          </div>
        </Card>
      ) : snapshotError ? (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Case data will appear once analysis is run.
          </div>
        </Card>
      ) : snapshot && practiceArea === "criminal" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary fallback={mounted ? <Card className="p-4"><div className="text-sm text-muted-foreground">Analysis will deepen as further disclosure is received.</div></Card> : null}>
            <CaseEvidenceColumn 
              caseId={caseId} 
              snapshot={snapshot}
              onAddDocument={() => setShowAddDocuments(true)}
              currentPhase={currentPhase}
              savedPosition={currentPhase >= 2 ? savedPosition : null}
              onCommitmentChange={(commitment) => {
                if (commitment) {
                  setCommittedStrategy(commitment);
                  setIsStrategyCommitted(true);
                  buildCaseSnapshot(caseId).then(setSnapshot).catch(console.error);
                } else {
                  setCommittedStrategy(null);
                  setIsStrategyCommitted(false);
                }
              }}
            />
          </ErrorBoundary>
          <ErrorBoundary fallback={
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                {snapshot?.analysis.canShowStrategyPreview && !snapshot?.analysis.canShowStrategyFull
                  ? "Strategy preview available (thin pack). Add documents for full routes."
                  : "Run analysis to populate this section."}
              </div>
            </Card>
          }>
            <CaseStrategyColumn 
              caseId={caseId} 
              snapshot={snapshot}
              currentPhase={currentPhase}
              onPositionChange={(hasPosition) => {
                setHasSavedPosition(hasPosition);
              }}
              savedPosition={currentPhase >= 2 ? savedPosition : null}
            />
          </ErrorBoundary>
        </div>
      ) : null}

      {/* Additional Tools (Criminal-specific, collapsed) */}
      {practiceArea === "criminal" && (
        <CollapsibleSection
          title="Additional Tools"
          description="Bail, sentencing, hearings, PACE compliance"
          defaultOpen={false}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showBailTools && (
              <>
                <BailTracker caseId={caseId} />
                <BailApplicationPanel caseId={caseId} />
              </>
            )}
            {showSentencingTools && (
              <SentencingMitigationPanel caseId={caseId} />
            )}
            {showCourtHearings && (
              <CourtHearingsPanel caseId={caseId} currentPhase={currentPhase} />
            )}
            {showPACE && (
              <PACEComplianceChecker caseId={caseId} />
            )}
            <ClientAdvicePanel caseId={caseId} />
          </div>
        </CollapsibleSection>
      )}

      {/* Evidence Selector Modal */}
      {showAddDocuments && (
        <EvidenceSelectorModal
          caseId={caseId}
          onClose={() => setShowAddDocuments(false)}
        />
      )}
    </div>
  );
}
