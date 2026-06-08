"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import type { RiskAlert } from "@/lib/core/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type RiskAlertCardProps = {
  alert: RiskAlert;
  onViewChecklist?: (checklistId: string) => void;
};

export function RiskAlertCard({ alert, onViewChecklist }: RiskAlertCardProps) {
  const [showActions, setShowActions] = useState(false);

  const severityColors = {
    critical: "rounded-2xl bg-gradient-to-br from-red-900/80 via-red-900/60 to-red-900/40 border border-red-500/40 shadow-lg shadow-red-900/40",
    high: "rounded-2xl bg-gradient-to-br from-orange-900/70 via-orange-900/50 to-orange-900/30 border border-orange-500/40 shadow-lg shadow-orange-900/30",
    medium: "rounded-2xl bg-gradient-to-br from-amber-900/60 via-amber-900/40 to-amber-900/20 border border-amber-500/40 shadow-lg shadow-amber-900/20",
    low: "rounded-2xl border border-primary/20 bg-muted/50 shadow-md",
    info: "rounded-2xl border border-primary/10 bg-muted/30 shadow-md",
  };

  const severityIcons = {
    critical: "text-danger",
    high: "text-danger",
    medium: "text-warning",
    low: "text-primary",
    info: "text-primary",
  };

  const severityBadges = {
    critical: "danger" as const,
    high: "danger" as const,
    medium: "warning" as const,
    low: "secondary" as const,
    info: "secondary" as const,
  };

  return (
    <div className={`p-4 space-y-2 ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <AlertTriangle className={`h-4 w-4 ${severityIcons[alert.severity]}`} />
            <p className="font-semibold text-accent text-sm">{alert.title}</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              alert.severity === "critical" 
                ? "bg-red-500/20 text-red-300 border-red-500/40"
                : alert.severity === "high"
                ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                : alert.severity === "medium"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-primary/20 text-primary-foreground border-primary/40"
            }`}>
              {alert.severity.toUpperCase()}
            </span>
            {alert.status === "resolved" && (
              <Badge variant="secondary" className="text-xs">
                RESOLVED
              </Badge>
            )}
          </div>

          <div className="text-xs text-accent/80 leading-relaxed mb-2 whitespace-pre-line">
            {alert.message.split("**").map((part, i) => 
              i % 2 === 1 ? (
                <strong key={i} className="font-semibold">{part}</strong>
              ) : (
                part
              )
            )}
          </div>

          {alert.deadlineDate && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-accent/70">
              <Calendar className="h-3 w-3" />
              <span>
                Estimated deadline: {new Date(alert.deadlineDate).toLocaleDateString("en-GB")}
              </span>
            </div>
          )}

          {alert.recommendedActions && alert.recommendedActions.length > 0 && (
            <div className="mt-3 border-t border-accent/10 pt-3">
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className="text-xs font-medium text-accent/70 hover:text-accent mb-2"
              >
                {showActions ? "Hide" : "Show"} recommended procedural steps ({alert.recommendedActions.length})
              </button>

              {showActions && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-accent/70 italic">
                    Recommended procedural steps (not legal advice):
                  </p>
                  <ul className="space-y-2">
                    {alert.recommendedActions.map((action) => (
                      <li key={action.id} className="text-xs text-accent/80 flex gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <div className="flex-1">
                          <span className="font-semibold">{action.label}.</span>{" "}
                          <span>{action.description}</span>
                          {action.priority === "urgent" && (
                            <Badge variant="danger" className="ml-2 text-[10px]">
                              URGENT
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {alert.type === "limitation" && onViewChecklist && (
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onViewChecklist("limitation")}
                className="gap-2 text-xs"
              >
                <FileText className="h-3 w-3" />
                View Standstill / Issue Checklist
              </Button>
            </div>
          )}

          {alert.sourceEvidence && alert.sourceEvidence.length > 0 && (
            <p className="mt-2 text-[10px] text-accent/50">
              Source: {alert.sourceEvidence.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

