"use client";

import { ArrowRight, AlertTriangle, Clock, FileText, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { NextStep, Severity } from "@/lib/types/casebrain";

type NextStepPanelProps = {
  caseId: string;
  nextStep: NextStep | null;
  allSteps?: NextStep[];
};

const priorityStyles: Record<Severity, { bg: string; border: string; icon: string }> = {
  CRITICAL: {
    bg: "from-danger/20 to-danger/5",
    border: "border-danger/40",
    icon: "text-danger",
  },
  HIGH: {
    bg: "from-warning/20 to-warning/5",
    border: "border-warning/40",
    icon: "text-warning",
  },
  MEDIUM: {
    bg: "from-primary/20 to-primary/5",
    border: "border-primary/40",
    icon: "text-primary",
  },
  LOW: {
    bg: "from-accent/10 to-accent/5",
    border: "border-accent/20",
    icon: "text-accent-soft",
  },
};

const sourceIcons: Record<string, React.ReactNode> = {
  LIMITATION: <Clock className="h-5 w-5" />,
  RISK: <AlertTriangle className="h-5 w-5" />,
  EVIDENCE: <FileText className="h-5 w-5" />,
  PROTOCOL: <Zap className="h-5 w-5" />,
  CHASER: <ArrowRight className="h-5 w-5" />,
  COMPLIANCE: <FileText className="h-5 w-5" />,
};

export function NextStepPanel({ caseId, nextStep, allSteps = [] }: NextStepPanelProps) {
  if (!nextStep) {
    return (
      <Card className="border-success/30 bg-gradient-to-br from-success/10 to-success/5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20">
            <Zap className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-success">All caught up!</h3>
            <p className="text-sm text-accent-soft">
              No urgent actions required for this case right now.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const styles = priorityStyles[nextStep.priority];

  return (
    <div className="space-y-3">
      {/* Main Next Step Card */}
      <div
        className={`rounded-2xl border bg-gradient-to-br p-5 ${styles.bg} ${styles.border}`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-surface/50 ${styles.icon}`}
          >
            {sourceIcons[nextStep.source] ?? <Zap className="h-5 w-5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={
                  nextStep.priority === "CRITICAL"
                    ? "danger"
                    : nextStep.priority === "HIGH"
                      ? "warning"
                      : "primary"
                }
                size="sm"
                glow={nextStep.isUrgent}
              >
                {nextStep.isUrgent ? "URGENT" : nextStep.priority}
              </Badge>
              <span className="text-xs text-accent-muted uppercase tracking-wide">
                Next Step
              </span>
            </div>

            <h3 className="mt-2 text-lg font-semibold text-accent">
              {nextStep.title}
            </h3>

            <p className="mt-1 text-sm text-accent-soft">
              {nextStep.description}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs text-accent-muted">
              <span className="flex items-center gap-1">
                <span className="font-medium">Why:</span> {nextStep.reason}
              </span>
              {nextStep.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {new Date(nextStep.dueDate).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>

            {/* Action Button */}
            {nextStep.suggestedTemplateId && (
              <div className="mt-4">
                <Link href={`/cases/${caseId}/letters/new?template=${nextStep.suggestedTemplateId}`}>
                  <Button variant="primary" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Draft Letter
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Steps (collapsed) */}
      {allSteps.length > 1 && (
        <div className="rounded-xl border border-white/10 bg-surface-muted/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-accent-muted mb-3">
            Also Consider ({allSteps.length - 1} more)
          </h4>
          <ul className="space-y-2">
            {allSteps.slice(1, 4).map((step) => (
              <li
                key={step.id}
                className="flex items-center gap-2 text-sm text-accent-soft"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    step.priority === "CRITICAL"
                      ? "bg-danger"
                      : step.priority === "HIGH"
                        ? "bg-warning"
                        : "bg-primary"
                  }`}
                />
                {step.title}
              </li>
            ))}
            {allSteps.length > 4 && (
              <li className="text-xs text-accent-muted">
                +{allSteps.length - 4} more actions
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for sidebar/dashboard
 */
export function NextStepBadge({ nextStep }: { nextStep: NextStep | null }) {
  if (!nextStep) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
        <Zap className="h-3 w-3" />
        All caught up
      </span>
    );
  }

  const colors = {
    CRITICAL: "bg-danger/10 text-danger border-danger/20",
    HIGH: "bg-warning/10 text-warning border-warning/20",
    MEDIUM: "bg-primary/10 text-primary border-primary/20",
    LOW: "bg-accent/10 text-accent-soft border-accent/20",
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[nextStep.priority]}`}>
      <div className="flex items-center gap-2">
        {nextStep.isUrgent && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
        )}
        <span className="text-xs font-semibold uppercase">Next Step</span>
      </div>
      <p className="mt-1 text-sm font-medium line-clamp-1">{nextStep.title}</p>
    </div>
  );
}

