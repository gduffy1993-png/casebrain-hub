"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Calendar, CheckCircle2, XCircle } from "lucide-react";
import type { AwaabsLawStatus } from "@/lib/housing/awaabs-monitor";

type AwaabMonitorPanelProps = {
  caseId: string;
};

export function AwaabMonitorPanel({ caseId }: AwaabMonitorPanelProps) {
  const [status, setStatus] = useState<AwaabsLawStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/awaab/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Awaab's Law status", error);
    } finally {
      setLoading(false);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      const response = await fetch(`/api/awaab/check/${caseId}`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to check Awaab's Law", error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [caseId]);

  if (!status) {
    return (
      <Card
        title="Awaab's Law Trigger Monitor"
        description="Monitor compliance with Awaab's Law requirements for social landlords."
      >
        {loading ? (
          <p className="text-sm text-accent/60">Loading Awaab's Law status...</p>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-accent/60 mb-4">
              Awaab's Law status not yet calculated. Run a check to monitor deadlines.
            </p>
            <Button variant="primary" size="sm" onClick={runCheck} disabled={checking}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              {checking ? "Checking..." : "Run Check"}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (!status.isSocialLandlord) {
    return (
      <Card
        title="Awaab's Law Trigger Monitor"
        description="Monitor compliance with Awaab's Law requirements for social landlords."
      >
        <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
          <p className="text-sm text-accent">
            Awaab's Law applies only to social landlords. This case does not fall under Awaab's Law
            requirements.
          </p>
        </div>
      </Card>
    );
  }

  const riskColors = {
    critical: "border-danger/30 bg-danger/10",
    high: "border-danger/20 bg-danger/5",
    medium: "border-warning/20 bg-warning/5",
    low: "border-primary/10 bg-surface-muted/70",
    none: "border-primary/10 bg-surface-muted/50",
  };

  const riskBadges = {
    critical: "danger" as const,
    high: "danger" as const,
    medium: "warning" as const,
    low: "secondary" as const,
    none: "secondary" as const,
  };

  return (
    <Card
      title="Awaab's Law Trigger Monitor"
      description="Monitor compliance with Awaab's Law requirements for social landlords."
      action={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={runCheck}
            disabled={checking}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {checking ? "Checking..." : "Run Check"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className={`rounded-2xl border p-4 ${riskColors[status.overallRisk]}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-accent">Overall Risk</p>
            <Badge variant={riskBadges[status.overallRisk]} className="text-sm">
              {status.overallRisk.toUpperCase()}
            </Badge>
          </div>
          {status.riskCategory && (
            <p className="text-xs text-accent/70">
              Risk Category: {status.riskCategory} ({status.riskCategory === 1 ? "Immediate breach" : "Approaching breach"})
            </p>
          )}
          <p className="text-xs text-accent/80 mt-2">{status.summary}</p>
        </div>

        {/* Countdown Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {status.daysUntilInvestigationDeadline !== null && (
            <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-accent">Investigation Deadline</p>
              </div>
              <p
                className={`text-lg font-bold ${
                  status.investigationDeadlineBreached
                    ? "text-danger"
                    : status.daysUntilInvestigationDeadline <= 3
                      ? "text-danger"
                      : status.daysUntilInvestigationDeadline <= 7
                        ? "text-warning"
                        : "text-accent"
                }`}
              >
                {status.daysUntilInvestigationDeadline < 0
                  ? `${Math.abs(status.daysUntilInvestigationDeadline)} days overdue`
                  : `${status.daysUntilInvestigationDeadline} days remaining`}
              </p>
            </div>
          )}

          {status.daysUntilWorkStartDeadline !== null && (
            <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-accent">Work Start Deadline</p>
              </div>
              <p
                className={`text-lg font-bold ${
                  status.workStartDeadlineBreached
                    ? "text-danger"
                    : status.daysUntilWorkStartDeadline <= 2
                      ? "text-danger"
                      : status.daysUntilWorkStartDeadline <= 4
                        ? "text-warning"
                        : "text-accent"
                }`}
              >
                {status.daysUntilWorkStartDeadline < 0
                  ? `${Math.abs(status.daysUntilWorkStartDeadline)} days overdue`
                  : `${status.daysUntilWorkStartDeadline} days remaining`}
              </p>
            </div>
          )}

          {status.daysUntilCompletionDeadline !== null && (
            <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-accent">Completion Deadline</p>
              </div>
              <p
                className={`text-lg font-bold ${
                  status.completionDeadlineBreached
                    ? "text-danger"
                    : status.daysUntilCompletionDeadline <= 7
                      ? "text-warning"
                      : "text-accent"
                }`}
              >
                {status.daysUntilCompletionDeadline < 0
                  ? `${Math.abs(status.daysUntilCompletionDeadline)} days overdue`
                  : `${status.daysUntilCompletionDeadline} days remaining`}
              </p>
            </div>
          )}
        </div>

        {/* Enforcement Checklist */}
        {status.enforcementChecklist.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
              Enforcement Checklist
            </p>
            <div className="space-y-2">
              {status.enforcementChecklist.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-3"
                >
                  <div className="flex items-start gap-3">
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    ) : item.status === "overdue" ? (
                      <XCircle className="h-4 w-4 text-danger mt-0.5" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-accent/30 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-accent text-sm">{item.item}</p>
                        <Badge
                          variant={
                            item.priority === "urgent"
                              ? "danger"
                              : item.priority === "high"
                                ? "danger"
                                : "warning"
                          }
                          className="text-xs"
                        >
                          {item.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>
                      {item.deadline && (
                        <p className="text-xs text-accent/70">
                          Deadline: {new Date(item.deadline).toLocaleDateString("en-GB")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {status.recommendedActions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
              Recommended Actions
            </p>
            <ul className="space-y-2">
              {status.recommendedActions.map((action, index) => (
                <li key={index} className="text-xs text-accent/80 flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-accent/50 italic mt-4">
          This is procedural guidance only and does not constitute legal advice. All dates and
          deadlines should be verified by a qualified legal professional.
        </p>
      </div>
    </Card>
  );
}

