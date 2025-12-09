"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TimeEntry = {
  id: string;
  caseId: string | null;
  description: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  isBillable: boolean;
  activityType: string;
  hourlyRate: number | null;
  totalAmount: number | null;
  status: string;
};

type ActiveTimer = {
  id: string;
  caseId: string | null;
  description: string;
  startTime: string;
  activityType: string;
};

type TimeTrackerProps = {
  caseId?: string;
};

export function TimeTracker({ caseId }: TimeTrackerProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Fetch active timer
  useEffect(() => {
    async function fetchActiveTimer() {
      try {
        const response = await fetch("/api/time/timer/active");
        if (response.ok) {
          const timer = await response.json();
          setActiveTimer(timer);
        }
      } catch (error) {
        console.error("Failed to fetch active timer:", error);
      }
    }

    fetchActiveTimer();
    const interval = setInterval(fetchActiveTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update elapsed time
  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }

    const start = new Date(activeTimer.startTime).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Fetch time entries
  useEffect(() => {
    async function fetchTimeEntries() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (caseId) params.set("caseId", caseId);
        params.set("status", "submitted,approved");

        const response = await fetch(`/api/time/entries?${params}`);
        if (response.ok) {
          const entries = await response.json();
          setTimeEntries(entries);
        }
      } catch (error) {
        console.error("Failed to fetch time entries:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTimeEntries();
  }, [caseId]);

  const handleStartTimer = async () => {
    try {
      const description = prompt("What are you working on?");
      if (!description) return;

      const response = await fetch("/api/time/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseId ?? undefined,
          description,
          activityType: "general",
        }),
      });

      if (response.ok) {
        const timer = await response.json();
        setActiveTimer(timer);
      }
    } catch (error) {
      console.error("Failed to start timer:", error);
      alert("Failed to start timer");
    }
  };

  const handleStopTimer = async () => {
    try {
      const description = prompt("Update description (optional):");
      const response = await fetch("/api/time/timer/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || undefined }),
      });

      if (response.ok) {
        setActiveTimer(null);
        setElapsed(0);
        // Refresh entries
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to stop timer:", error);
      alert("Failed to stop timer");
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Time Tracker</h3>
        {!activeTimer && (
          <Button onClick={handleStartTimer} size="sm">
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        )}
      </div>

      {/* Active Timer */}
      {activeTimer && (
        <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-cyan-300">
                {activeTimer.description}
              </p>
              <p className="text-xs text-cyan-200/70">
                Started {formatDistanceToNow(new Date(activeTimer.startTime), { addSuffix: true })}
              </p>
            </div>
            <Button onClick={handleStopTimer} size="sm" variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-2xl font-mono font-bold text-cyan-300">
              {formatDuration(elapsed)}
            </span>
          </div>
        </div>
      )}

      {/* Time Entries List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Recent Time Entries</h4>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : timeEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time entries yet</p>
        ) : (
          <div className="space-y-2">
            {timeEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{entry.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {entry.activityType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatMinutes(entry.durationMinutes)}
                    </span>
                    {entry.hourlyRate && entry.totalAmount && (
                      <span className="text-xs text-muted-foreground">
                        £{entry.totalAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                {entry.isBillable && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Billable
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

