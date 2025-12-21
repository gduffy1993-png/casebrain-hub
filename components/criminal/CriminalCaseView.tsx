"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GetOffProbabilityMeter } from "./GetOffProbabilityMeter";
import { LoopholesPanel } from "./LoopholesPanel";
import { PACEComplianceChecker } from "./PACEComplianceChecker";
import { DisclosureTracker } from "./DisclosureTracker";
import { DefenseStrategiesPanel } from "./DefenseStrategiesPanel";
import { EvidenceAnalysisPanel } from "./EvidenceAnalysisPanel";
import { ChargesPanel } from "./ChargesPanel";
import { CourtHearingsPanel } from "./CourtHearingsPanel";
import { BailTracker } from "./BailTracker";
import { ClientAdvicePanel } from "./ClientAdvicePanel";
import { AggressiveDefensePanel } from "./AggressiveDefensePanel";
import { ExecutiveBriefPanel } from "./ExecutiveBriefPanel";
import { KillShotPanel } from "./KillShotPanel";
import { BailApplicationPanel } from "./BailApplicationPanel";
import { SentencingMitigationPanel } from "./SentencingMitigationPanel";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type CriminalCaseViewProps = {
  caseId: string;
};

export function CriminalCaseView({ caseId }: CriminalCaseViewProps) {
  const [gateBanner, setGateBanner] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  // Check if analysis is gated by checking one endpoint
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
          } else {
            setGateBanner(null);
          }
        }
      } catch {
        // Silently fail - gate check is optional
      }
    }
    checkGate();
  }, [caseId]);

  return (
    <div className="space-y-6">
      {/* Gate Banner - Show once at top if analysis is blocked */}
      {gateBanner && (
        <AnalysisGateBanner
          banner={gateBanner.banner}
          diagnostics={gateBanner.diagnostics}
          showHowToFix={true}
        />
      )}

      {/* Executive Brief - One-Page Case Summary (30-Minute Court Prep) */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Executive brief unavailable</div>}>
        <ExecutiveBriefPanel caseId={caseId} />
      </ErrorBoundary>

      {/* Kill Shot Strategy - The ONE Angle That Wins */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Kill shot strategy unavailable</div>}>
        <KillShotPanel caseId={caseId} />
      </ErrorBoundary>

      {/* Aggressive Defense Analysis - FIND EVERY ANGLE TO WIN */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Aggressive defense analysis unavailable</div>}>
        <AggressiveDefensePanel caseId={caseId} />
      </ErrorBoundary>

      {/* Get Off Probability Meter - Top Priority */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Probability meter unavailable</div>}>
        <GetOffProbabilityMeter caseId={caseId} />
      </ErrorBoundary>

      {/* Loopholes & Weaknesses - Critical */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Loopholes panel unavailable</div>}>
        <LoopholesPanel caseId={caseId} />
      </ErrorBoundary>

      {/* Defense Strategies */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Defense strategies unavailable</div>}>
        <DefenseStrategiesPanel caseId={caseId} />
      </ErrorBoundary>

      {/* Evidence Analysis */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Evidence analysis unavailable</div>}>
        <EvidenceAnalysisPanel caseId={caseId} />
      </ErrorBoundary>

      {/* Phase 2: Tactical Advantage Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail application unavailable</div>}>
          <BailApplicationPanel caseId={caseId} />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Sentencing mitigation unavailable</div>}>
          <SentencingMitigationPanel caseId={caseId} />
        </ErrorBoundary>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Charges unavailable</div>}>
            <ChargesPanel caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">PACE compliance unavailable</div>}>
            <PACEComplianceChecker caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Disclosure tracker unavailable</div>}>
            <DisclosureTracker caseId={caseId} />
          </ErrorBoundary>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Bail tracker unavailable</div>}>
            <BailTracker caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Court hearings unavailable</div>}>
            <CourtHearingsPanel caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Client advice unavailable</div>}>
            <ClientAdvicePanel caseId={caseId} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

