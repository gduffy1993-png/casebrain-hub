"use client";

import { useState, useEffect } from "react";
import { 
  Radar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Send,
  Inbox,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OpponentActivitySnapshot, OpponentActivityStatus } from "@/lib/types/casebrain";

type OpponentRadarPanelProps = {
  caseId: string;
};

const statusConfig: Record<OpponentActivityStatus, {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  NORMAL: {
    color: "text-success",
    bgColor: "bg-success/10 border-success/20",
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Normal",
  },
  SLOWER_THAN_USUAL: {
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/20",
    icon: <Clock className="h-4 w-4" />,
    label: "Slower Than Usual",
  },
  CONCERNING_SILENCE: {
    color: "text-danger",
    bgColor: "bg-danger/10 border-danger/20",
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Concerning Silence",
  },
  NO_DATA: {
    color: "text-accent-muted",
    bgColor: "bg-accent/5 border-accent/10",
    icon: <HelpCircle className="h-4 w-4" />,
    label: "No Data",
  },
};

export function OpponentRadarPanel({ caseId }: OpponentRadarPanelProps) {
  const [snapshot, setSnapshot] = useState<OpponentActivitySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/opponent`);
        if (res.ok) {
          const data = await res.json();
          setSnapshot(data.snapshot);
        } else {
          const data = await res.json();
          setError(data.error);
        }
      } catch (err) {
        setError("Failed to load opponent data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSnapshot();
  }, [caseId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card title="Opponent Activity" className="animate-pulse">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error || !snapshot) {
    return null; // Hide if no data
  }

  const config = statusConfig[snapshot.status];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" />
          Opponent Activity
        </div>
      }
      description="Response patterns and silence detection"
    >
      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${config.bgColor}`}>
        <div className="flex items-center gap-3">
          <div className={config.color}>{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  snapshot.status === "CONCERNING_SILENCE" ? "danger" :
                  snapshot.status === "SLOWER_THAN_USUAL" ? "warning" :
                  snapshot.status === "NORMAL" ? "success" :
                  "outline"
                }
                size="sm"
              >
                {config.label}
              </Badge>
            </div>
            <p className={`mt-1 text-sm ${config.color}`}>
              {snapshot.statusMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Last Letter Sent */}
        <div className="rounded-lg bg-surface-muted/50 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-accent-muted">
            <Send className="h-3.5 w-3.5" />
            Last Letter Sent
          </div>
          <p className="mt-1 text-sm font-semibold text-accent">
            {formatDate(snapshot.lastLetterSentAt)}
          </p>
          {snapshot.lastLetterSentAt && (
            <p className="text-xs text-accent-muted">
              {snapshot.daysSinceLastContact} days ago
            </p>
          )}
        </div>

        {/* Last Reply */}
        <div className="rounded-lg bg-surface-muted/50 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-accent-muted">
            <Inbox className="h-3.5 w-3.5" />
            Last Known Reply
          </div>
          <p className="mt-1 text-sm font-semibold text-accent">
            {formatDate(snapshot.lastOpponentReplyAt)}
          </p>
          {!snapshot.lastOpponentReplyAt && (
            <p className="text-xs text-accent-muted">
              No reply recorded
            </p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          {snapshot.averageResponseDays && (
            <span className="text-accent-muted">
              Avg response: <span className="font-medium text-accent">{snapshot.averageResponseDays} days</span>
            </span>
          )}
          {snapshot.currentSilenceDays > 0 && (
            <span className={snapshot.currentSilenceDays > 21 ? "text-warning" : "text-accent-muted"}>
              Current wait: <span className="font-medium">{snapshot.currentSilenceDays} days</span>
            </span>
          )}
        </div>
      </div>

      {/* Silence Progress Bar */}
      {snapshot.averageResponseDays && snapshot.currentSilenceDays > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-accent-muted mb-1">
            <span>Silence vs usual</span>
            <span>
              {Math.round((snapshot.currentSilenceDays / snapshot.averageResponseDays) * 100)}% of avg
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                snapshot.currentSilenceDays > snapshot.averageResponseDays * 1.5
                  ? "bg-danger"
                  : snapshot.currentSilenceDays > snapshot.averageResponseDays
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{
                width: `${Math.min(
                  (snapshot.currentSilenceDays / snapshot.averageResponseDays) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

