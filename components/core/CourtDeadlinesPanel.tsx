"use client";

import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  ChevronRight,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CourtDeadline, ProtocolStage } from "@/lib/court-deadlines";

type CourtDeadlinesPanelProps = {
  deadlines: CourtDeadline[];
  stages: ProtocolStage[];
};

const statusConfig = {
  PENDING: { 
    color: "text-accent-muted", 
    bg: "bg-accent/10",
    icon: <Clock className="h-4 w-4" />,
  },
  DUE_SOON: { 
    color: "text-warning", 
    bg: "bg-warning/10",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  OVERDUE: { 
    color: "text-danger", 
    bg: "bg-danger/10",
    icon: <XCircle className="h-4 w-4" />,
  },
  COMPLETED: { 
    color: "text-success", 
    bg: "bg-success/10",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  N_A: { 
    color: "text-accent-muted", 
    bg: "bg-accent/5",
    icon: <Clock className="h-4 w-4" />,
  },
};

export function CourtDeadlinesPanel({ deadlines, stages }: CourtDeadlinesPanelProps) {
  const urgentDeadlines = deadlines.filter(
    d => d.status === "OVERDUE" || (d.status === "DUE_SOON" && d.daysRemaining <= 7)
  );

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Court Deadlines & Protocol
          {urgentDeadlines.length > 0 && (
            <Badge variant="danger" size="sm" glow>
              {urgentDeadlines.length} urgent
            </Badge>
          )}
        </div>
      }
      description="CPR deadlines and protocol requirements"
    >
      {deadlines.length > 0 ? (
        <div className="space-y-4">
          {/* Urgent Deadlines */}
          {urgentDeadlines.length > 0 && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-danger mb-3">
                <AlertTriangle className="h-4 w-4" />
                Urgent Attention Required
              </h4>
              <ul className="space-y-2">
                {urgentDeadlines.map((deadline) => (
                  <DeadlineItem key={deadline.id} deadline={deadline} />
                ))}
              </ul>
            </div>
          )}

          {/* All Deadlines by Stage */}
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage.id} className="rounded-xl border border-white/10 bg-surface-muted/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted/50">
                  {stage.isComplete ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Scale className="h-4 w-4 text-primary" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-accent text-sm">{stage.label}</h4>
                    <p className="text-[10px] text-accent-muted">{stage.description}</p>
                  </div>
                  {stage.isComplete && (
                    <Badge variant="success" size="sm">Complete</Badge>
                  )}
                </div>
                {!stage.isComplete && stage.deadlines.length > 0 && (
                  <ul className="divide-y divide-white/5">
                    {stage.deadlines.map((deadline) => (
                      <DeadlineItem key={deadline.id} deadline={deadline} compact />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-12 w-12 text-accent-muted" />
          <p className="mt-4 text-sm font-medium text-accent">No deadlines tracked yet</p>
          <p className="mt-1 text-xs text-accent-soft">
            Deadlines will appear once proceedings are issued
          </p>
        </div>
      )}
    </Card>
  );
}

function DeadlineItem({ deadline, compact = false }: { deadline: CourtDeadline; compact?: boolean }) {
  const config = statusConfig[deadline.status];

  if (compact) {
    return (
      <li className="flex items-center gap-3 px-4 py-2">
        <span className={config.color}>{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-accent">{deadline.label}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-medium ${config.color}`}>
            {deadline.status === "COMPLETED" 
              ? "Done"
              : deadline.isOverdue 
                ? `${Math.abs(deadline.daysRemaining)}d overdue`
                : `${deadline.daysRemaining}d left`}
          </p>
          <p className="text-[10px] text-accent-muted">
            {new Date(deadline.dueDate).toLocaleDateString("en-GB")}
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className={`flex items-start gap-3 rounded-lg p-3 ${config.bg}`}>
      <span className={`mt-0.5 ${config.color}`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-medium text-sm ${config.color}`}>{deadline.label}</p>
          {deadline.cprRule && (
            <Badge variant="outline" size="sm">{deadline.cprRule}</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-accent-soft">{deadline.description}</p>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className={config.color}>
            Due: {new Date(deadline.dueDate).toLocaleDateString("en-GB")}
          </span>
          <span className={`font-semibold ${config.color}`}>
            {deadline.isOverdue 
              ? `${Math.abs(deadline.daysRemaining)} days overdue`
              : `${deadline.daysRemaining} days remaining`}
          </span>
        </div>
      </div>
    </li>
  );
}

