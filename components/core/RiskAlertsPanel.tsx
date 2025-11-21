"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RiskAlertCard } from "./RiskAlertCard";
import { ChecklistModal } from "./ChecklistModal";
import type { RiskAlert } from "@/lib/core/types";

type RiskAlertsPanelProps = {
  caseId: string;
  riskAlerts?: RiskAlert[];
};

export function RiskAlertsPanel({ caseId, riskAlerts: initialRiskAlerts }: RiskAlertsPanelProps) {
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>(initialRiskAlerts ?? []);
  const [loading, setLoading] = useState(!initialRiskAlerts);
  const [checklistType, setChecklistType] = useState<string | null>(null);

  useEffect(() => {
    if (!initialRiskAlerts) {
      fetchRiskAlerts();
    }
  }, [caseId]);

  const fetchRiskAlerts = async () => {
    try {
      // Try to get from housing compliance API (includes risk alerts)
      const response = await fetch(`/api/housing/compliance/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.riskAlerts && Array.isArray(data.riskAlerts)) {
          setRiskAlerts(data.riskAlerts);
        }
      }
    } catch (error) {
      console.error("Failed to load risk alerts", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChecklist = (type: string) => {
    setChecklistType(type);
  };

  if (loading) {
    return (
      <Card title="Risk Alerts">
        <p className="text-sm text-accent/60">Loading risk alerts...</p>
      </Card>
    );
  }

  const critical = riskAlerts.filter((a) => a.severity === "critical");
  const high = riskAlerts.filter((a) => a.severity === "high");
  const medium = riskAlerts.filter((a) => a.severity === "medium");
  const low = riskAlerts.filter((a) => a.severity === "low" || a.severity === "info");

  return (
    <>
      <Card
        title="Risk Alerts"
        description="Procedural risk indicators based on case data. This is guidance only and does not constitute legal advice."
      >
        <div className="space-y-4">
          {critical.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                Critical
              </p>
              <div className="space-y-2">
                {critical.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {high.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                High
              </p>
              <div className="space-y-2">
                {high.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {medium.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">
                Medium
              </p>
              <div className="space-y-2">
                {medium.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {low.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/50">
                Low / Info
              </p>
              <div className="space-y-2">
                {low.map((alert) => (
                  <RiskAlertCard
                    key={alert.id}
                    alert={alert}
                    onViewChecklist={handleViewChecklist}
                  />
                ))}
              </div>
            </div>
          )}

          {riskAlerts.length === 0 && (
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

