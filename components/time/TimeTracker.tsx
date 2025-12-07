"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Clock, Save, X } from "lucide-react";
import { useToast } from "@/components/Toast";

type TimeTrackerProps = {
  caseId: string;
  taskId?: string;
  onTimeSaved?: () => void;
};

type TimeEntry = {
  id: string;
  description: string;
  activityType: string;
  billable: boolean;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
};

export function TimeTracker({ caseId, taskId, onTimeSaved }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<string>("general");
  const [billable, setBillable] = useState(true);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const pushToast = useToast((state) => state.push);
  
  // Timer effect
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning]);
  
  const startTimer = () => {
    setStartTime(new Date());
    setIsRunning(true);
    setElapsedSeconds(0);
  };
  
  const stopTimer = async () => {
    if (!startTime) return;
    
    setIsRunning(false);
    const endTime = new Date();
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    
    if (durationMinutes === 0) {
      pushToast({
        type: "warning",
        message: "Timer was running for less than a minute. Entry not saved.",
      });
      setStartTime(null);
      setElapsedSeconds(0);
      return;
    }
    
    // Auto-save the time entry
    try {
      const res = await fetch("/api/time/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          taskId,
          description: description || "Time entry",
          activityType,
          billable,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });
      
      if (res.ok) {
        pushToast({
          type: "success",
          message: `Saved ${durationMinutes} minutes`,
        });
        setStartTime(null);
        setElapsedSeconds(0);
        setDescription("");
        if (onTimeSaved) onTimeSaved();
        loadRecentEntries();
      } else {
        pushToast({
          type: "error",
          message: "Failed to save time entry",
        });
      }
    } catch (error) {
      console.error("Failed to save time:", error);
      pushToast({
        type: "error",
        message: "Failed to save time entry",
      });
    }
  };
  
  const loadRecentEntries = async () => {
    try {
      const res = await fetch(`/api/time/entries?caseId=${caseId}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setRecentEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to load entries:", error);
    }
  };
  
  useEffect(() => {
    loadRecentEntries();
  }, [caseId]);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  const activityTypes = [
    { value: "drafting", label: "Drafting" },
    { value: "research", label: "Research" },
    { value: "client_call", label: "Client Call" },
    { value: "court_attendance", label: "Court Attendance" },
    { value: "meeting", label: "Meeting" },
    { value: "review", label: "Review" },
    { value: "correspondence", label: "Correspondence" },
    { value: "admin", label: "Admin" },
    { value: "general", label: "General" },
  ];
  
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Time Tracker
        </div>
      }
      description="Track billable and non-billable time"
    >
      <div className="space-y-4">
        {/* Timer Display */}
        <div className="text-center py-6 rounded-lg bg-muted/30 border border-border">
          <div className="text-4xl font-mono font-bold text-foreground mb-2">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="flex items-center justify-center gap-2">
            {isRunning ? (
              <>
                <Badge variant="danger" size="sm">Running</Badge>
                <Button onClick={stopTimer} variant="destructive" size="sm">
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </>
            ) : (
              <Button onClick={startTimer} variant="primary" size="sm">
                <Play className="mr-2 h-4 w-4" />
                Start Timer
              </Button>
            )}
          </div>
        </div>
        
        {/* Activity Details */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              disabled={isRunning}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="activityType">Activity Type</Label>
            <select
              id="activityType"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              disabled={isRunning}
              className="flex h-10 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/40"
            />
            <Label htmlFor="billable" className="cursor-pointer">
              Billable
            </Label>
          </div>
        </div>
        
        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Recent Entries</h4>
            <div className="space-y-2">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.activityType} • {entry.durationMinutes} min
                    </p>
                  </div>
                  <Badge variant={entry.billable ? "primary" : "outline"} size="sm">
                    {entry.billable ? "Billable" : "Non-billable"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

