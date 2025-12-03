"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, Loader2 } from "lucide-react";
import type { UnifiedDeadline } from "@/lib/core/deadline-management";

type DeadlineManagementPanelProps = {
  caseId: string;
  className?: string;
};

type DeadlineSummary = {
  total: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  critical: number;
};

export function DeadlineManagementPanel({ caseId, className = "" }: DeadlineManagementPanelProps) {
  const [deadlines, setDeadlines] = useState<UnifiedDeadline[]>([]);
  const [summary, setSummary] = useState<DeadlineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/cases/${caseId}/deadlines`);
        if (!res.ok) throw new Error("Failed to fetch deadlines");
        const data = await res.json();
        setDeadlines(data.deadlines ?? []);
        setSummary(data.summary ?? null);
      } catch (err) {
        console.error("[DeadlineManagementPanel] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load deadlines");
      } finally {
        setLoading(false);
      }
    }
    fetchDeadlines();
  }, [caseId]);

  const getStatusColor = (status: UnifiedDeadline["status"]) => {
    switch (status) {
      case "OVERDUE":
        return "bg-danger text-white";
      case "DUE_TODAY":
        return "bg-danger/80 text-white";
      case "DUE_SOON":
        return "bg-warning text-white";
      case "COMPLETED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-accent/10 text-accent border-accent/20";
    }
  };

  const getPriorityColor = (priority: UnifiedDeadline["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return "text-danger";
      case "HIGH":
        return "text-warning";
      case "MEDIUM":
        return "text-accent";
      default:
        return "text-accent/60";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Calendar className="h-4 w-4 text-blue-400" />
            Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Calendar className="h-4 w-4 text-blue-400" />
            Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const overdue = deadlines.filter(d => d.status === "OVERDUE");
  const dueToday = deadlines.filter(d => d.status === "DUE_TODAY");
  const dueSoon = deadlines.filter(d => d.status === "DUE_SOON");
  const upcoming = deadlines.filter(d => 
    d.status === "UPCOMING" && d.priority !== "LOW"
  );
  const completed = deadlines.filter(d => d.status === "COMPLETED");

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Calendar className="h-4 w-4 text-blue-400" />
            Deadlines
          </CardTitle>
          {summary && (
            <div className="flex items-center gap-2 text-xs">
              {summary.overdue > 0 && (
                <Badge className="bg-danger text-white">{summary.overdue} overdue</Badge>
              )}
              {summary.dueToday > 0 && (
                <Badge className="bg-warning text-white">{summary.dueToday} today</Badge>
              )}
              {summary.dueSoon > 0 && (
                <Badge className="bg-warning/50 text-white">{summary.dueSoon} soon</Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
              Overdue
            </p>
            <div className="space-y-2">
              {overdue.map((deadline) => (
                <DeadlineCard key={deadline.id} deadline={deadline} formatDate={formatDate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />
              ))}
            </div>
          </div>
        )}

        {/* Due Today */}
        {dueToday.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
              Due Today
            </p>
            <div className="space-y-2">
              {dueToday.map((deadline) => (
                <DeadlineCard key={deadline.id} deadline={deadline} formatDate={formatDate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />
              ))}
            </div>
          </div>
        )}

        {/* Due Soon */}
        {dueSoon.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">
              Due Soon (1-3 days)
            </p>
            <div className="space-y-2">
              {dueSoon.map((deadline) => (
                <DeadlineCard key={deadline.id} deadline={deadline} formatDate={formatDate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/50">
              Upcoming
            </p>
            <div className="space-y-2">
              {upcoming.map((deadline) => (
                <DeadlineCard key={deadline.id} deadline={deadline} formatDate={formatDate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />
              ))}
            </div>
          </div>
        )}

        {/* No deadlines */}
        {deadlines.length === 0 && (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-accent/30" />
            <p className="mt-2 text-sm text-accent/60">No deadlines found</p>
            <p className="mt-1 text-xs text-accent/40">
              Deadlines are automatically calculated from case data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeadlineCard({
  deadline,
  formatDate,
  getStatusColor,
  getPriorityColor,
}: {
  deadline: UnifiedDeadline;
  formatDate: (date: string) => string;
  getStatusColor: (status: UnifiedDeadline["status"]) => string;
  getPriorityColor: (priority: UnifiedDeadline["priority"]) => string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white/90">{deadline.title}</h4>
            <Badge className={`${getStatusColor(deadline.status)} text-[10px]`}>
              {deadline.status.replace("_", " ")}
            </Badge>
            {deadline.priority === "CRITICAL" && (
              <Badge className="bg-danger/20 text-danger border-danger/30 text-[10px]">
                CRITICAL
              </Badge>
            )}
          </div>
          {deadline.description && (
            <p className="mt-1 text-xs text-accent/60 line-clamp-2">{deadline.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-accent/50">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(deadline.dueDate)}</span>
            </div>
            {deadline.daysRemaining !== undefined && (
              <div className={`flex items-center gap-1 ${getPriorityColor(deadline.priority)}`}>
                {deadline.daysRemaining < 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    <span>{Math.abs(deadline.daysRemaining)} days overdue</span>
                  </>
                ) : deadline.daysRemaining === 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    <span>Due today</span>
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3" />
                    <span>{deadline.daysRemaining} days remaining</span>
                  </>
                )}
              </div>
            )}
            {deadline.sourceRule && (
              <span className="text-accent/40">({deadline.sourceRule})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

