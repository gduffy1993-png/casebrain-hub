"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
// Legacy panels - only used in collapsed "Additional Tools" section
import { PACEComplianceChecker } from "./PACEComplianceChecker";
import { CourtHearingsPanel } from "./CourtHearingsPanel";
import { BailTracker } from "./BailTracker";
import { ClientAdvicePanel } from "./ClientAdvicePanel";
import { BailApplicationPanel } from "./BailApplicationPanel";
import { SentencingMitigationPanel } from "./SentencingMitigationPanel";
import { CaseFightPlan } from "./CaseFightPlan";
import { CasePhaseSelector, type CasePhase } from "./CasePhaseSelector";
import { StrategyCommitmentPanel, type StrategyCommitment } from "./StrategyCommitmentPanel";
import { Phase2StrategyPlanPanel } from "./Phase2StrategyPlanPanel";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { Scale, Shield, Loader2 } from "lucide-react";
// Phase 2 components
import { buildCaseSnapshot, type CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { CaseStatusStrip } from "./CaseStatusStrip";
import { CaseEvidenceColumn } from "./CaseEvidenceColumn";
import { CaseStrategyColumn } from "./CaseStrategyColumn";

type CriminalCaseViewProps = {
  caseId: string;
};

export function CriminalCaseView({ caseId }: CriminalCaseViewProps) {
  // Phase 2: Snapshot state
  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [gateBanner, setGateBanner] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);
  const [isDisclosureFirstMode, setIsDisclosureFirstMode] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<CasePhase>(1);
  const [committedStrategy, setCommittedStrategy] = useState<StrategyCommitment | null>(null);
  const [isStrategyCommitted, setIsStrategyCommitted] = useState(false);
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

  // Phase 2: Build snapshot on mount
  useEffect(() => {
    async function loadSnapshot() {
      setSnapshotLoading(true);
      setSnapshotError(null);
      try {
        const snap = await buildCaseSnapshot(caseId);
        setSnapshot(snap);
        // Update committed strategy from snapshot
        if (snap.decisionLog.currentPosition) {
          setIsStrategyCommitted(true);
          setCommittedStrategy({
            primary: snap.decisionLog.currentPosition.position as any,
            secondary: snap.decisionLog.history
              .filter(h => h.position !== snap.decisionLog.currentPosition?.position)
              .map(h => h.position as any),
          });
        } else {
          setIsStrategyCommitted(false);
        }
      } catch (error) {
        console.error("[CriminalCaseView] Failed to load snapshot:", error);
        setSnapshotError(error instanceof Error ? error.message : "Failed to load case data");
        // Fail-safe: still allow page to render
        setSnapshot(null);
      } finally {
        setSnapshotLoading(false);
      }
    }
    loadSnapshot();
  }, [caseId]);

  // Check if analysis is gated and determine mode (using snapshot data when available)
  useEffect(() => {
    if (!snapshot) return; // Wait for snapshot
    
    // Derive gate status from snapshot analysis mode
    if (snapshot.analysis.mode === "preview" || snapshot.analysis.mode === "none") {
      setGateBanner({
        banner: {
          severity: "warning",
          title: "Insufficient text extracted",
          message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
        },
      });
      setIsDisclosureFirstMode(true);
      setCurrentPhase((prev) => (prev === 1 ? 1 : prev));
    } else {
      setGateBanner(null);
      // Check if mode is DISCLOSURE-FIRST from strategy data
      const primary = snapshot.strategy.primary;
      const mode = primary === "fight_charge" && snapshot.strategy.hasRenderableData 
        ? "OTHER" 
        : "DISCLOSURE-FIRST";
      setIsDisclosureFirstMode(mode === "DISCLOSURE-FIRST");
      if (mode !== "DISCLOSURE-FIRST") {
        setCurrentPhase((prev) => (prev === 1 ? 2 : prev));
      }
    }
  }, [snapshot]);
  
  // Check panel data (for phase gating only - not for rendering)
  useEffect(() => {
    async function checkPanelData() {
      // Minimal check for phase gating - panels themselves will fetch their own data
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
        // Silently fail - panel data check is optional
      }
    }
    
    checkPanelData();
  }, [caseId]);

  // Phase 1: Disclosure & Readiness (default when DISCLOSURE-FIRST)
  // Phase 2: Positioning & Options
  // Phase 3: Sentencing & Outcome

  const showBailTools = currentPhase >= 2 || panelData.bail.hasData;
  const showSentencingTools = currentPhase >= 3;
  const showCourtHearings = currentPhase >= 1 && (panelData.hearings.hasData || currentPhase >= 2);
  const showPACE = currentPhase >= 1 && (panelData.pace.hasData || currentPhase >= 2);

  return (
    <div className="space-y-6">
      {/* Phase 2: Case Status Strip */}
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
            Case status not yet available — run analysis to populate this section.
          </div>
        </Card>
      ) : snapshot ? (
        <CaseStatusStrip snapshot={snapshot} />
      ) : null}

      {/* Primary Defence Strategy - Case Fight Plan (ONLY strategy surface for criminal cases) */}
      {/* FIX: Always visible regardless of phase - phase gating only affects bail/sentencing tools */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategy analysis not yet available — run analysis to populate this section.</div>}>
        <CaseFightPlan caseId={caseId} committedStrategy={committedStrategy} />
      </ErrorBoundary>

      {/* Phase Selector */}
      <CasePhaseSelector
        caseId={caseId}
        isDisclosureFirstMode={isDisclosureFirstMode}
        onPhaseChange={setCurrentPhase}
        defaultPhase={isDisclosureFirstMode ? 1 : 2}
        currentPhase={currentPhase}
      />

      {/* Gate Banner - Show once at top if analysis is blocked */}
      {gateBanner && (
        <AnalysisGateBanner
          banner={gateBanner.banner}
          diagnostics={gateBanner.diagnostics}
          showHowToFix={true}
        />
      )}

      {/* Phase 2: Two-Column Layout (Evidence Left, Strategy Right) - SINGLE SOURCE OF TRUTH */}
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
            Case data not yet available — run analysis to populate this section.
          </div>
        </Card>
      ) : snapshot ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Evidence analysis not yet available — add documents or run analysis.</div></Card>}>
            <CaseEvidenceColumn caseId={caseId} snapshot={snapshot} />
          </ErrorBoundary>
          <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Strategy analysis not yet available — run analysis to populate this section.</div></Card>}>
            <CaseStrategyColumn 
              caseId={caseId} 
              snapshot={snapshot}
              onRecordPosition={() => {
                // Scroll to strategy commitment panel
                const panel = document.querySelector('[data-strategy-commitment]');
                if (panel) {
                  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              onCommitmentChange={(commitment) => {
                if (commitment) {
                  setCommittedStrategy(commitment);
                  setIsStrategyCommitted(true);
                  // Reload snapshot to reflect new commitment
                  buildCaseSnapshot(caseId).then(setSnapshot).catch(console.error);
                } else {
                  setCommittedStrategy(null);
                  setIsStrategyCommitted(false);
                }
              }}
            />
          </ErrorBoundary>
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Case data not yet available — run analysis to populate this section.
          </div>
        </Card>
      )}

      {/* Strategy Commitment Panel - Phase 2+ only (for recording position) */}
      {currentPhase >= 2 && (
        <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategy commitment not yet available — run analysis to populate this section.</div>}>
          <StrategyCommitmentPanel 
            caseId={caseId}
            onCommitmentChange={(commitment) => {
              setCommittedStrategy(commitment);
              setIsStrategyCommitted(!!commitment);
              // Reload snapshot to reflect new commitment
              buildCaseSnapshot(caseId).then(setSnapshot).catch(console.error);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Primary Strategy Plan - Phase 2+ only, shows after commitment */}
      {currentPhase >= 2 && isStrategyCommitted && (
        <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategy plan not yet available — run analysis to populate this section.</div>}>
          <Phase2StrategyPlanPanel caseId={caseId} />
        </ErrorBoundary>
      )}

      {/* Additional Tools - Collapsed (PACE, Court Hearings, Client Advice) */}
      {/* These are not part of Phase 2 core layout but remain available for advanced use */}
      <CollapsibleSection
        title="Additional Tools"
        description="PACE compliance, court hearings, client advice"
        defaultOpen={false}
        icon={<Shield className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showPACE && (
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">PACE compliance not yet available — run analysis to populate this section.</div>}>
              <PACEComplianceChecker caseId={caseId} />
            </ErrorBoundary>
          )}
          {showCourtHearings && (
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Court hearings not yet available — run analysis to populate this section.</div>}>
              <CourtHearingsPanel caseId={caseId} currentPhase={currentPhase} />
            </ErrorBoundary>
          )}
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Client advice not yet available — run analysis to populate this section.</div>}>
            <ClientAdvicePanel caseId={caseId} />
          </ErrorBoundary>
        </div>
      </CollapsibleSection>

      {/* Phase 2: Bail Tools (Accordion in Phase 1, visible in Phase 2+) */}
      {currentPhase >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showBailTools && (
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail application not yet available — run analysis to populate this section.</div>}>
              <BailApplicationPanel caseId={caseId} />
            </ErrorBoundary>
          )}
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail tracker not yet available — run analysis to populate this section.</div>}>
            <BailTracker caseId={caseId} />
          </ErrorBoundary>
        </div>
      ) : (
        <CollapsibleSection
          title="Custody / Bail Tools"
          description="Bail application generator and bail tracker (Phase 2 tools)"
          defaultOpen={false}
          icon={<Shield className="h-4 w-4 text-blue-400" />}
        >
          <div className="space-y-6">
            {showBailTools && (
              <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail application not yet available — run analysis to populate this section.</div>}>
                <BailApplicationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail tracker not yet available — run analysis to populate this section.</div>}>
              <BailTracker caseId={caseId} />
            </ErrorBoundary>
          </div>
        </CollapsibleSection>
      )}

      {/* Phase 3: Sentencing Tools (Only visible in Phase 3) */}
      {currentPhase >= 3 && (
        <CollapsibleSection
          title="Sentencing Tools"
          description="Sentencing mitigation generator and character tools"
          defaultOpen={true}
          icon={<Scale className="h-4 w-4 text-green-400" />}
        >
          <div className="space-y-6">
            {showSentencingTools && (
              <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Sentencing mitigation not yet available — run analysis to populate this section.</div>}>
                <SentencingMitigationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

