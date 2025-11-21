"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { HousingCaseRecord } from "@/types";

type ComplianceCheck = {
  rule: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  passed: boolean;
  details?: string;
};

type HousingCompliancePanelProps = {
  housingCase: HousingCaseRecord;
  complianceChecks: ComplianceCheck[];
};

export function HousingCompliancePanel({
  housingCase,
  complianceChecks,
}: HousingCompliancePanelProps) {
  const criticalIssues = complianceChecks.filter(
    (c) => !c.passed && (c.severity === "critical" || c.severity === "high"),
  );
  const passedChecks = complianceChecks.filter((c) => c.passed);

  return (
    <Card
      title="Compliance & Risk"
      description="HHSRS, Awaab's Law, Section 11 LTA 1985 checks"
    >
      {criticalIssues.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            Critical Issues
          </div>
          {criticalIssues.map((check, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-danger/20 bg-danger/5 p-3 text-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-accent">{check.rule}</p>
                  <p className="mt-1 text-xs text-accent/70">{check.description}</p>
                  {check.details && (
                    <p className="mt-1 text-xs text-accent/60">{check.details}</p>
                  )}
                </div>
                <Badge variant="danger" className="ml-2">
                  {check.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {complianceChecks.map((check, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${
              check.passed
                ? "border-primary/10 bg-surface-muted/70"
                : check.severity === "critical" || check.severity === "high"
                  ? "border-danger/20 bg-danger/5"
                  : "border-warning/20 bg-warning/5"
            }`}
          >
            {check.passed ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
            ) : (
              <XCircle
                className={`h-5 w-5 flex-shrink-0 ${
                  check.severity === "critical" || check.severity === "high"
                    ? "text-danger"
                    : "text-warning"
                }`}
              />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-accent">{check.rule}</p>
                {!check.passed && (
                  <Badge
                    variant={
                      check.severity === "critical" || check.severity === "high"
                        ? "danger"
                        : "warning"
                    }
                    className="ml-2"
                  >
                    {check.severity.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-accent/70">{check.description}</p>
              {check.details && (
                <p className="mt-1 text-xs text-accent/60">{check.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {passedChecks.length === complianceChecks.length && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center text-sm text-accent/70">
          <CheckCircle className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 font-semibold">All compliance checks passed</p>
        </div>
      )}
    </Card>
  );
}

