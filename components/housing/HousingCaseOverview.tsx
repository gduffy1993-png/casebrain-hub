"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Home, User, Calendar } from "lucide-react";
import type { HousingCaseRecord, HousingDefect } from "@/types";

type HousingCaseOverviewProps = {
  caseId: string;
  housingCase: HousingCaseRecord;
  defects: HousingDefect[];
};

export function HousingCaseOverview({
  caseId,
  housingCase,
  defects,
}: HousingCaseOverviewProps) {
  return (
    <Card title="Housing Disrepair Overview">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-accent/50">Property</p>
          <p className="mt-1 text-sm font-semibold text-accent">
            {housingCase.property_address ?? "Not recorded"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-accent/50">Tenant</p>
          <p className="mt-1 text-sm font-semibold text-accent">
            {housingCase.tenant_name ?? "Not recorded"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-accent/50">Landlord</p>
          <p className="mt-1 text-sm font-semibold text-accent">
            {housingCase.landlord_name ?? "Not recorded"}
          </p>
          {housingCase.landlord_type && (
            <Badge variant="secondary" className="mt-1">
              {housingCase.landlord_type}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-accent/50">First Report</p>
          <p className="mt-1 text-sm font-semibold text-accent">
            {housingCase.first_report_date
              ? new Date(housingCase.first_report_date).toLocaleDateString("en-GB")
              : "Not recorded"}
          </p>
        </div>
      </div>

      {housingCase.tenant_vulnerability.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-accent/50">Tenant Vulnerabilities</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {housingCase.tenant_vulnerability.map((vuln, idx) => (
              <Badge key={idx} variant="warning">
                {vuln}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-3">
          <p className="text-xs uppercase tracking-wide text-accent/50">Defects</p>
          <p className="mt-1 text-lg font-semibold text-accent">{defects.length}</p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-3">
          <p className="text-xs uppercase tracking-wide text-accent/50">Repair Attempts</p>
          <p className="mt-1 text-lg font-semibold text-accent">
            {housingCase.repair_attempts_count}
          </p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-3">
          <p className="text-xs uppercase tracking-wide text-accent/50">No-Access Days</p>
          <p className="mt-1 text-lg font-semibold text-accent">
            {housingCase.no_access_days_total}
          </p>
        </div>
      </div>

      {housingCase.hhsrs_category_1_hazards.length > 0 && (
        <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            Category 1 HHSRS Hazards
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {housingCase.hhsrs_category_1_hazards.map((hazard, idx) => (
              <Badge key={idx} variant="danger">
                {hazard}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {housingCase.unfit_for_habitation && (
        <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            Unfit for Human Habitation
          </div>
        </div>
      )}
    </Card>
  );
}

