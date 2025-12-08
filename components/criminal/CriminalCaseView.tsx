"use client";

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

type CriminalCaseViewProps = {
  caseId: string;
};

export function CriminalCaseView({ caseId }: CriminalCaseViewProps) {
  return (
    <div className="space-y-6">
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

