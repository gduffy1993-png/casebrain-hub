"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RiskAlertCard } from "./RiskAlertCard";
import { ChecklistModal } from "./ChecklistModal";
import type { RiskAlert } from "@/lib/core/types";

type RiskAlertsPanelProps = {
  caseId: string;
  riskAlerts?: RiskAlert[];
};

export function RiskAlertsPanel({ caseId, riskAlerts }: RiskAlertsPanelProps) {
  const [checklistType, setChecklistType] = useState<string | null>(null);

  // Normalize alerts: ensure severity is lowercase and status is set
  const normalized = (riskAlerts ?? []).map((a) => ({
    ...a,
    severity: (a.severity ?? "low").toLowerCase() as RiskAlert["severity"],
    status: (a.status ?? "outstanding") as RiskAlert["status"],
  }));

  // Filter to only show outstanding alerts
  const outstanding = normalized.filter(
    (a) => a.status !== "resolved" && a.status !== "snoozed"
  );

  // Group by severity
  const bySeverity = {
    critical: outstanding.filter((a) => a.severity === "critical"),
    high: outstanding.filter((a) => a.severity === "high"),
    medium: outstanding.filter((a) => a.severity === "medium"),
    low: outstanding.filter(
      (a) => a.severity === "low" || a.severity === "info"
    ),
  };

  // TEMPORARY debug log
  console.log("[RiskAlertsPanel] Render", {
    caseId,
    total: normalized.length,
    outstanding: outstanding.length,
    critical: bySeverity.critical.length,
    high: bySeverity.high.length,
    medium: bySeverity.medium.length,
    low: bySeverity.low.length,
  });

  const handleViewChecklist = (type: string) => {
    setChecklistType(type);
  };

  return (
    <>
      <Card
        title="Risk Alerts"
        description="Procedural risk indicators based on case data. This is guidance only and does not constitute legal advice."
      >
        <div className="space-y-4">
          {bySeverity.critical.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                Critical
              </p>
              <div className="space-y-2">
                {bySeverity.critical.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {bySeverity.high.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                High
              </p>
              <div className="space-y-2">
                {bySeverity.high.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {bySeverity.medium.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">
                Medium
              </p>
              <div className="space-y-2">
                {bySeverity.medium.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {bySeverity.low.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/50">
                Low / Info
              </p>
              <div className="space-y-2">
                {bySeverity.low.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {outstanding.length === 0 && (
            <p className="text-sm text-accent/60">
              No risk alerts detected for this case.
            </p>
          )}
        </div>
      </Card>

      {checklistType && (
        <ChecklistModal
          caseId={caseId}
          checklistType={checklistType}
          onClose={() => setChecklistType(null)}
        />
      )}
    </>
  );
}
