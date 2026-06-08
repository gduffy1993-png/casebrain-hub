"use client";

import { X, TrendingUp, TrendingDown, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AnalysisDelta = {
  timelineAdded: number;
  timelineRemoved: number;
  issuesAdded: Array<{ label: string; category?: string }>;
  issuesRemoved: Array<{ label: string; category?: string }>;
  missingEvidenceResolved: number;
  missingEvidenceStillOutstanding: number;
  missingEvidenceNew: number;
  riskChanged: {
    from: string | null;
    to: string | null;
    reason?: string;
  } | null;
};

type AnalysisDeltaPanelProps = {
  delta: AnalysisDelta;
  onDismiss?: () => void;
};

export function AnalysisDeltaPanel({ delta, onDismiss }: AnalysisDeltaPanelProps) {
  const hasChanges =
    delta.timelineAdded > 0 ||
    delta.timelineRemoved > 0 ||
    delta.issuesAdded.length > 0 ||
    delta.issuesRemoved.length > 0 ||
    delta.missingEvidenceResolved > 0 ||
    delta.missingEvidenceNew > 0 ||
    delta.riskChanged !== null;

  if (!hasChanges) {
    return null;
  }

  return (
    <Card
      title="New since last update"
      description="Changes detected in latest analysis"
      action={
        onDismiss ? (
          <Button variant="ghost" size="icon" onClick={onDismiss} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        ) : undefined
      }
      className="border-primary/30 bg-primary/5"
    >
      <div className="space-y-4">
        {/* Timeline Changes */}
        {(delta.timelineAdded > 0 || delta.timelineRemoved > 0) && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm text-accent">
              {delta.timelineAdded > 0 && (
                <span className="text-success">+{delta.timelineAdded} timeline events</span>
              )}
              {delta.timelineRemoved > 0 && (
                <span className="text-accent/60 ml-2">
                  {delta.timelineRemoved} removed
                </span>
              )}
            </span>
          </div>
        )}

        {/* Key Issues Changes */}
        {(delta.issuesAdded.length > 0 || delta.issuesRemoved.length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-accent">Key Issues</span>
            </div>
            {delta.issuesAdded.length > 0 && (
              <div className="ml-6 mb-2">
                <p className="text-xs text-success mb-1">Added:</p>
                <ul className="space-y-1">
                  {delta.issuesAdded.map((issue, idx) => (
                    <li key={idx} className="text-xs text-accent/70">
                      • {issue.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {delta.issuesRemoved.length > 0 && (
              <div className="ml-6">
                <p className="text-xs text-accent/60 mb-1">Removed:</p>
                <ul className="space-y-1">
                  {delta.issuesRemoved.map((issue, idx) => (
                    <li key={idx} className="text-xs text-accent/50 line-through">
                      • {issue.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Missing Evidence Changes */}
        {(delta.missingEvidenceResolved > 0 ||
          delta.missingEvidenceStillOutstanding > 0 ||
          delta.missingEvidenceNew > 0) && (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm text-accent">
              Missing evidence:{" "}
              {delta.missingEvidenceResolved > 0 && (
                <span className="text-success">
                  {delta.missingEvidenceResolved} resolved
                </span>
              )}
              {delta.missingEvidenceStillOutstanding > 0 && (
                <span className="text-accent/70 ml-2">
                  {delta.missingEvidenceStillOutstanding} still outstanding
                </span>
              )}
              {delta.missingEvidenceNew > 0 && (
                <span className="text-warning ml-2">
                  {delta.missingEvidenceNew} new
                </span>
              )}
            </span>
          </div>
        )}

        {/* Risk Change */}
        {delta.riskChanged && (
          <div className="flex items-center gap-2">
            {delta.riskChanged.to &&
            delta.riskChanged.from &&
            delta.riskChanged.to !== delta.riskChanged.from ? (
              delta.riskChanged.to === "CRITICAL" ||
              delta.riskChanged.to === "HIGH" ? (
                <TrendingUp className="h-4 w-4 text-danger" />
              ) : (
                <TrendingDown className="h-4 w-4 text-success" />
              )
            ) : (
              <AlertTriangle className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm text-accent">
              Risk:{" "}
              <Badge
                variant={delta.riskChanged.from === "CRITICAL" || delta.riskChanged.from === "HIGH" ? "danger" : "outline"}
                size="sm"
              >
                {delta.riskChanged.from || "Unknown"}
              </Badge>
              {" → "}
              <Badge
                variant={delta.riskChanged.to === "CRITICAL" || delta.riskChanged.to === "HIGH" ? "danger" : "outline"}
                size="sm"
              >
                {delta.riskChanged.to || "Unknown"}
              </Badge>
              {delta.riskChanged.reason && (
                <span className="text-accent/60 ml-2">({delta.riskChanged.reason})</span>
              )}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

