"use client";

import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { PiMedicalReportsPanel } from "./PiMedicalReportsPanel";
import { PiOffersPanel } from "./PiOffersPanel";
import { PiHearingsPanel } from "./PiHearingsPanel";
import { PiDisbursementsPanel } from "./PiDisbursementsPanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FileText } from "lucide-react";

type PICaseDetailsSectionProps = {
  caseId: string;
  reports: any[];
  offers: any[];
  hearings: any[];
  disbursements: any[];
  defaultOpen?: boolean;
};

export function PICaseDetailsSection({
  caseId,
  reports,
  offers,
  hearings,
  disbursements,
  defaultOpen = false,
}: PICaseDetailsSectionProps) {
  return (
    <CollapsibleSection
      title="PI Case Details"
      description="Medical reports, offers, hearings, and disbursements"
      defaultOpen={defaultOpen}
      icon={<FileText className="h-4 w-4 text-purple-400" />}
    >
      <div className="space-y-4">
        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load medical reports right now.</div>
          }
        >
          <PiMedicalReportsPanel caseId={caseId} reports={reports} />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load offers right now.</div>
          }
        >
          <PiOffersPanel caseId={caseId} offers={offers} />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load hearings right now.</div>
          }
        >
          <PiHearingsPanel caseId={caseId} hearings={hearings} />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <div className="text-sm text-accent/60 p-4">Unable to load disbursements right now.</div>
          }
        >
          <PiDisbursementsPanel caseId={caseId} disbursements={disbursements} />
        </ErrorBoundary>
      </div>
    </CollapsibleSection>
  );
}

