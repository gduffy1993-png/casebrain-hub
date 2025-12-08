"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type PACEComplianceProps = {
  caseId: string;
};

type PACECompliance = {
  cautionGiven: boolean | null;
  cautionGivenBeforeQuestioning: boolean | null;
  interviewRecorded: boolean | null;
  rightToSolicitor: boolean | null;
  solicitorPresent: boolean | null;
  detentionTimeHours: number | null;
  detentionTimeExceeded: boolean | null;
  breachesDetected: string[];
  breachSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
};

export function PACEComplianceChecker({ caseId }: PACEComplianceProps) {
  const [compliance, setCompliance] = useState<PACECompliance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPACE() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/pace`);
        if (res.ok) {
          const result = await res.json();
          setCompliance(result);
        }
      } catch (error) {
        console.error("Failed to fetch PACE compliance:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPACE();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="PACE Compliance" description="Checking PACE compliance..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  if (!compliance) {
    return (
      <Card title="PACE Compliance" description="PACE compliance information unavailable">
        <div className="text-center py-4 text-muted-foreground text-sm">
          No PACE data available
        </div>
      </Card>
    );
  }

  const breaches = compliance.breachesDetected || [];
  const hasBreaches = breaches.length > 0;

  return (
    <Card
      title="PACE Compliance Checker"
      description="Police and Criminal Evidence Act 1984 compliance status"
    >
      <div className="space-y-3">
        {/* Compliance Items */}
        <div className="space-y-2">
          <ComplianceItem
            label="Caution Given"
            value={compliance.cautionGiven}
          />
          <ComplianceItem
            label="Caution Before Questioning"
            value={compliance.cautionGivenBeforeQuestioning}
          />
          <ComplianceItem
            label="Interview Recorded"
            value={compliance.interviewRecorded}
          />
          <ComplianceItem
            label="Right to Solicitor"
            value={compliance.rightToSolicitor}
          />
          <ComplianceItem
            label="Solicitor Present"
            value={compliance.solicitorPresent}
          />
          {compliance.detentionTimeHours !== null && (
            <div className="flex items-center justify-between p-2 rounded bg-muted/30">
              <span className="text-sm text-foreground">Detention Time</span>
              <span className="text-sm font-medium">
                {compliance.detentionTimeHours} hours
                {compliance.detentionTimeExceeded && (
                  <Badge variant="danger" className="ml-2 text-xs">EXCEEDED</Badge>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Breaches */}
        {hasBreaches && (
          <div className="mt-4 p-3 rounded-lg border border-red-500/50 bg-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">
                BREACHES FOUND: {breaches.length}
              </span>
              {compliance.breachSeverity && (
                <Badge variant="danger" className="text-xs">
                  {compliance.breachSeverity}
                </Badge>
              )}
            </div>
            <ul className="space-y-1 text-xs text-red-300">
              {breaches.map((breach, i) => (
                <li key={i}>• {breach}</li>
              ))}
            </ul>
          </div>
        )}

        {!hasBreaches && (
          <div className="mt-4 p-3 rounded-lg border border-green-500/50 bg-green-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">No PACE breaches detected</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function ComplianceItem({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between p-2 rounded bg-muted/30">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">Not recorded</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
      <span className="text-sm text-foreground">{label}</span>
      {value ? (
        <CheckCircle className="h-4 w-4 text-green-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
    </div>
  );
}

