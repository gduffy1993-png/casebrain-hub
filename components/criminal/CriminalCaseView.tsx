"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { LoopholesPanel } from "./LoopholesPanel";
import { PACEComplianceChecker } from "./PACEComplianceChecker";
import { DisclosureTracker } from "./DisclosureTracker";
import { ChargesPanel } from "./ChargesPanel";
import { CourtHearingsPanel } from "./CourtHearingsPanel";
import { BailTracker } from "./BailTracker";
import { ClientAdvicePanel } from "./ClientAdvicePanel";
import { BailApplicationPanel } from "./BailApplicationPanel";
import { SentencingMitigationPanel } from "./SentencingMitigationPanel";
import { CaseFightPlan } from "./CaseFightPlan";
import { CasePhaseSelector, type CasePhase } from "./CasePhaseSelector";
import { StrategyCommitmentPanel, type StrategyCommitment } from "./StrategyCommitmentPanel";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";
import { Scale, Shield } from "lucide-react";

type CriminalCaseViewProps = {
  caseId: string;
};

export function CriminalCaseView({ caseId }: CriminalCaseViewProps) {
  const [gateBanner, setGateBanner] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);
  const [isDisclosureFirstMode, setIsDisclosureFirstMode] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<CasePhase>(1);
  const [committedStrategy, setCommittedStrategy] = useState<StrategyCommitment | null>(null);
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

  // Check if analysis is gated and determine mode
  useEffect(() => {
    async function checkGate() {
      try {
        const response = await fetch(`/api/criminal/${caseId}/aggressive-defense`).catch(() => null);
        if (response?.ok) {
          const data = await response.json();
          const normalized = normalizeApiResponse(data);
          if (isGated(normalized)) {
            setGateBanner({
              banner: normalized.banner || {
                severity: "warning",
                title: "Insufficient text extracted",
                message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
              },
              diagnostics: normalized.diagnostics,
            });
            setIsDisclosureFirstMode(true);
            // Keep phase at 1 if we are gated; do not override a deliberate user choice beyond 1
            setCurrentPhase((prev) => (prev === 1 ? 1 : prev));
          } else {
            setGateBanner(null);
            // Check if mode is DISCLOSURE-FIRST from the data
            const planData = normalized.data || data;
            const primaryAngle = planData?.recommendedStrategy?.primaryAngle;
            const mode = primaryAngle?.angleType === "DISCLOSURE_FAILURE_STAY" || 
                        !primaryAngle?.angleType ? "DISCLOSURE-FIRST" : "OTHER";
            setIsDisclosureFirstMode(mode === "DISCLOSURE-FIRST");
            if (mode !== "DISCLOSURE-FIRST") {
              // Move to Phase 2 by default when disclosure is stable, but respect manual selections
              setCurrentPhase((prev) => (prev === 1 ? 2 : prev));
            }
          }
        }
      } catch {
        // Silently fail - gate check is optional
      }
    }
    
    async function checkPanelData() {
      // Check if panels have structured data
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
    
    checkGate();
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

      {/* Phase 1: Core Disclosure & Readiness Tools */}
      
      {/* Strategy Commitment Panel - Phase 2+ only */}
      {currentPhase >= 2 && (
        <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategy commitment unavailable</div>}>
          <StrategyCommitmentPanel 
            caseId={caseId}
            onCommitmentChange={setCommittedStrategy}
          />
        </ErrorBoundary>
      )}

      {/* Primary Defence Strategy - Case Fight Plan (ONLY strategy surface for criminal cases) */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Defence plan unavailable</div>}>
        <CaseFightPlan caseId={caseId} committedStrategy={committedStrategy} />
      </ErrorBoundary>

      {/* Loopholes & Weaknesses - Factual analysis only (not strategy generation) */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Loopholes panel unavailable</div>}>
        <LoopholesPanel caseId={caseId} />
      </ErrorBoundary>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Charges unavailable</div>}>
            <ChargesPanel caseId={caseId} />
          </ErrorBoundary>

          {showPACE && (
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">PACE compliance unavailable</div>}>
              <PACEComplianceChecker caseId={caseId} />
            </ErrorBoundary>
          )}

          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Disclosure tracker unavailable</div>}>
            <DisclosureTracker caseId={caseId} />
          </ErrorBoundary>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {showCourtHearings && (
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Court hearings unavailable</div>}>
              <CourtHearingsPanel caseId={caseId} />
            </ErrorBoundary>
          )}

          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Client advice unavailable</div>}>
            <ClientAdvicePanel caseId={caseId} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Phase 2: Bail Tools (Accordion in Phase 1, visible in Phase 2+) */}
      {currentPhase >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showBailTools && (
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail application unavailable</div>}>
              <BailApplicationPanel caseId={caseId} />
            </ErrorBoundary>
          )}
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail tracker unavailable</div>}>
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
              <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail application unavailable</div>}>
                <BailApplicationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
            <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail tracker unavailable</div>}>
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
              <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Sentencing mitigation unavailable</div>}>
                <SentencingMitigationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

