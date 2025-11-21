"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, CheckCircle } from "lucide-react";

type HousingDeadline = {
  id: string;
  name: string;
  description: string;
  deadlineDate: string; // ISO string from API
  daysRemaining: number;
  priority: "urgent" | "high" | "medium" | "low";
  status: "upcoming" | "due_today" | "overdue" | "passed";
  source: string;
  actionRequired: string;
};

type HousingDeadlineTrackerProps = {
  caseId: string;
};

export function HousingDeadlineTracker({ caseId }: HousingDeadlineTrackerProps) {
  const [deadlines, setDeadlines] = useState<HousingDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeadlines();
  }, [caseId]);

  const fetchDeadlines = async () => {
    try {
      const response = await fetch(`/api/housing/deadlines/${caseId}`);
      if (!response.ok) throw new Error("Failed to load deadlines");
      const data = await response.json();
      setDeadlines(data.deadlines ?? []);
    } catch (error) {
      console.error("Failed to load deadlines", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card title="Deadline Tracker">
        <p className="text-sm text-accent/60">Loading deadlines...</p>
      </Card>
    );
  }

  const overdue = deadlines.filter((d) => d.status === "overdue");
  const dueToday = deadlines.filter((d) => d.status === "due_today");
  const upcoming = deadlines.filter((d) => d.status === "upcoming");

  return (
    <Card
      title="Deadline Tracker"
      description="Awaab's Law, Section 11 LTA, and limitation period deadlines"
    >
      <div className="space-y-4">
        {overdue.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
              Overdue
            </p>
            <div className="space-y-2">
              {overdue.map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-2xl border border-danger/30 bg-danger/10 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-danger" />
                        <p className="text-sm font-semibold text-accent">{deadline.name}</p>
                        <Badge variant="danger">OVERDUE</Badge>
                      </div>
                      <p className="mt-1 text-xs text-accent/70">{deadline.description}</p>
                      <p className="mt-1 text-xs text-danger">
                        {Math.abs(deadline.daysRemaining)} days overdue
                      </p>
                      <p className="mt-1 text-xs text-accent/60">
                        Action: {deadline.actionRequired}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dueToday.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">
              Due Today
            </p>
            <div className="space-y-2">
              {dueToday.map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-2xl border border-warning/30 bg-warning/10 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold text-accent">{deadline.name}</p>
                    <Badge variant="warning">DUE TODAY</Badge>
                  </div>
                  <p className="mt-1 text-xs text-accent/70">{deadline.description}</p>
                  <p className="mt-1 text-xs text-accent/60">
                    Action: {deadline.actionRequired}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/50">
              Upcoming
            </p>
            <div className="space-y-2">
              {upcoming.map((deadline) => (
                <div
                  key={deadline.id}
                  className={`rounded-2xl border p-3 ${
                    deadline.priority === "urgent"
                      ? "border-danger/20 bg-danger/5"
                      : deadline.priority === "high"
                        ? "border-warning/20 bg-warning/5"
                        : "border-primary/10 bg-surface-muted/70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-accent">{deadline.name}</p>
                        <Badge
                          variant={
                            deadline.priority === "urgent"
                              ? "danger"
                              : deadline.priority === "high"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {deadline.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-accent/70">{deadline.description}</p>
                      <p className="mt-1 text-xs text-accent/60">
                        Due: {new Date(deadline.deadlineDate).toLocaleDateString("en-GB")} (
                        {deadline.daysRemaining} days remaining)
                      </p>
                      <p className="mt-1 text-xs text-accent/60">
                        Action: {deadline.actionRequired}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {deadlines.length === 0 && (
          <p className="text-sm text-accent/60">No deadlines calculated yet.</p>
        )}
      </div>
    </Card>
  );
}

