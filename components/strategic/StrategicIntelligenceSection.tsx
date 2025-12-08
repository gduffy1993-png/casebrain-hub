"use client";

import { StrategicOverviewCard } from "./StrategicOverviewCard";
import { StrategicRoutesPanel } from "./StrategicRoutesPanel";
import { LeverageAndWeakSpotsPanel } from "./LeverageAndWeakSpotsPanel";
import { TimePressureAndSettlementPanel } from "./TimePressureAndSettlementPanel";
import { JudicialExpectationsPanel } from "./JudicialExpectationsPanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

type StrategicIntelligenceSectionProps = {
  caseId: string;
};

export function StrategicIntelligenceSection({ caseId }: StrategicIntelligenceSectionProps) {
  return (
    <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategic Intelligence temporarily unavailable.</div>}>
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Strategic Intelligence</h2>
          <Badge variant="outline" className="text-xs">BETA</Badge>
        </div>

        {/* Overview Card */}
        <ErrorBoundary>
          <StrategicOverviewCard caseId={caseId} />
        </ErrorBoundary>

        {/* Detailed Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ErrorBoundary>
            <StrategicRoutesPanel caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary>
            <LeverageAndWeakSpotsPanel caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary>
            <TimePressureAndSettlementPanel caseId={caseId} />
          </ErrorBoundary>

          <ErrorBoundary>
            <JudicialExpectationsPanel caseId={caseId} />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}

