"use client";

import { useState, useEffect } from "react";
import { StrategicOverviewCard } from "./StrategicOverviewCard";
import { StrategicRoutesPanel } from "./StrategicRoutesPanel";
import { LeverageAndWeakSpotsPanel } from "./LeverageAndWeakSpotsPanel";
import { TimePressureAndSettlementPanel } from "./TimePressureAndSettlementPanel";
import { JudicialExpectationsPanel } from "./JudicialExpectationsPanel";
import { MoveSequencePanel } from "./MoveSequencePanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { normalizePracticeArea } from "@/lib/types/casebrain";

type StrategicIntelligenceSectionProps = {
  caseId: string;
  practiceArea?: string | null;
};

export function StrategicIntelligenceSection({ caseId, practiceArea }: StrategicIntelligenceSectionProps) {
  const normalizedPracticeArea = normalizePracticeArea(practiceArea ?? undefined);
  const isCriminal = normalizedPracticeArea === "criminal";
  const [summary, setSummary] = useState<{
    routes: number;
    leverage: number;
    weakSpots: number;
    expectations: number;
  } | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const [overviewRes, leverageRes, weakSpotsRes, expectationsRes] = await Promise.all([
          fetch(`/api/strategic/${caseId}/overview`).catch(() => null),
          fetch(`/api/strategic/${caseId}/leverage`).catch(() => null),
          fetch(`/api/strategic/${caseId}/weak-spots`).catch(() => null),
          fetch(`/api/strategic/${caseId}/cpr-compliance`).catch(() => null),
        ]);

        const routes = overviewRes?.ok ? (await overviewRes.json())?.strategies?.length || 0 : 0;
        const leverage = leverageRes?.ok ? (await leverageRes.json())?.leveragePoints?.length || 0 : 0;
        const weakSpots = weakSpotsRes?.ok ? (await weakSpotsRes.json())?.weakSpots?.length || 0 : 0;
        const expectations = expectationsRes?.ok ? (await expectationsRes.json())?.expectations?.length || 0 : 0;

        setSummary({ routes, leverage, weakSpots, expectations });
      } catch (err) {
        // Silently fail - summary is optional
      }
    }

    fetchSummary();
  }, [caseId]);

  const summaryItems = [];
  if (summary) {
    if (summary.routes > 0) summaryItems.push(`${summary.routes} strategic route${summary.routes !== 1 ? "s" : ""}`);
    if (summary.leverage > 0) summaryItems.push(`${summary.leverage} leverage point${summary.leverage !== 1 ? "s" : ""}`);
    if (summary.weakSpots > 0) summaryItems.push(`${summary.weakSpots} critical weakness${summary.weakSpots !== 1 ? "es" : ""}`);
    if (summary.expectations > 0) summaryItems.push(`${summary.expectations} judicial expectation${summary.expectations !== 1 ? "s" : ""}`);
  }

  return (
    <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategic Intelligence temporarily unavailable.</div>}>
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Strategic Intelligence</h2>
          <Badge variant="outline" className="text-xs">BETA</Badge>
        </div>
        
        {/* Summary Line - Dynamic based on what's found */}
        {summaryItems.length > 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-3">
            <p className="font-medium text-foreground mb-1">Based on the current bundle, CaseBrain has found:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {summaryItems.map((item, idx) => (
                <span key={idx}>• {item}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-3">
            <p className="font-medium text-foreground mb-1">Based on the current bundle, CaseBrain has found:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>• Strategic routes to exploit</span>
              <span>• Critical evidence gaps</span>
              <span>• Procedural leverage points</span>
              <span>• Opponent weaknesses</span>
            </div>
          </div>
        )}

        {/* Overview Card */}
        <ErrorBoundary>
          <StrategicOverviewCard caseId={caseId} practiceArea={normalizedPracticeArea} />
        </ErrorBoundary>

        {/* Move Sequence Panel - Full Width */}
        <ErrorBoundary>
          <MoveSequencePanel caseId={caseId} />
        </ErrorBoundary>

        {/* Detailed Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!isCriminal && (
            <ErrorBoundary>
              <StrategicRoutesPanel caseId={caseId} />
            </ErrorBoundary>
          )}

          <ErrorBoundary>
            <LeverageAndWeakSpotsPanel caseId={caseId} />
          </ErrorBoundary>

          {!isCriminal && (
            <ErrorBoundary>
              <TimePressureAndSettlementPanel caseId={caseId} />
            </ErrorBoundary>
          )}

          {!isCriminal && (
            <ErrorBoundary>
              <JudicialExpectationsPanel caseId={caseId} />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

