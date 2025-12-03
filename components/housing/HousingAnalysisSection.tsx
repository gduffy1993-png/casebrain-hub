"use client";

import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { AwaabMonitorPanel } from "./AwaabMonitorPanel";
import { DampMouldPanel } from "./DampMouldPanel";
import { HealthSymptomsPanel } from "./HealthSymptomsPanel";
import { UrgencyPanel } from "./UrgencyPanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Home } from "lucide-react";

type HousingAnalysisSectionProps = {
  caseId: string;
  defaultOpen?: boolean;
};

export function HousingAnalysisSection({ caseId, defaultOpen = false }: HousingAnalysisSectionProps) {
  return (
    <CollapsibleSection
      title="Housing Analysis"
      description="Awaab's Law, damp/mould, health symptoms, and urgency assessment"
      defaultOpen={defaultOpen}
      icon={<Home className="h-4 w-4 text-blue-400" />}
    >
      <div className="space-y-4">
        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load Awaab monitor right now.</div>
          }
        >
          <AwaabMonitorPanel caseId={caseId} />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load damp/mould panel right now.</div>
          }
        >
          <DampMouldPanel caseId={caseId} />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load health symptoms panel right now.</div>
          }
        >
          <HealthSymptomsPanel caseId={caseId} />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load urgency panel right now.</div>
          }
        >
          <UrgencyPanel caseId={caseId} />
        </ErrorBoundary>
      </div>
    </CollapsibleSection>
  );
}

