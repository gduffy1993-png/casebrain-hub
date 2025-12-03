"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

type UrgencyPanelProps = {
  caseId: string;
};

type UrgencyData = {
  awaabInvestigationDeadline?: {
    daysRemaining: number;
    deadlineDate: string;
    breached: boolean;
  };
  awaabWorkStartDeadline?: {
    daysRemaining: number;
    deadlineDate: string;
    breached: boolean;
  };
  section11ReasonableTime?: {
    daysSinceReport: number;
    reasonableTime: number;
    exceeded: boolean;
  };
  overallUrgency: "none" | "low" | "medium" | "high" | "critical";
  statutoryBreaches: string[];
};

export function UrgencyPanel({ caseId }: UrgencyPanelProps) {
  const [data, setData] = useState<UrgencyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/cases/${caseId}/housing/urgency`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch urgency data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Statutory Deadlines & Urgency">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="Statutory Deadlines & Urgency">
        <p className="text-sm text-accent/60">No statutory deadline information available.</p>
      </Card>
    );
  }

  const urgencyColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    none: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <Card title="Statutory Deadlines & Urgency">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <Badge className={urgencyColors[data.overallUrgency]}>
            {data.overallUrgency.toUpperCase()} Urgency
          </Badge>
        </div>

        {data.awaabInvestigationDeadline && (
          <div className={`rounded-lg border p-3 ${
            data.awaabInvestigationDeadline.breached
              ? "border-red-500/20 bg-red-500/5"
              : data.awaabInvestigationDeadline.daysRemaining <= 3
              ? "border-warning/20 bg-warning/5"
              : "border-primary/20 bg-primary/5"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Awaab's Law - Investigation</p>
                <p className="text-xs text-accent/60 mt-1">
                  Deadline: {new Date(data.awaabInvestigationDeadline.deadlineDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              {data.awaabInvestigationDeadline.breached ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  BREACHED
                </Badge>
              ) : (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {data.awaabInvestigationDeadline.daysRemaining} days
                </Badge>
              )}
            </div>
          </div>
        )}

        {data.awaabWorkStartDeadline && (
          <div className={`rounded-lg border p-3 ${
            data.awaabWorkStartDeadline.breached
              ? "border-red-500/20 bg-red-500/5"
              : data.awaabWorkStartDeadline.daysRemaining <= 3
              ? "border-warning/20 bg-warning/5"
              : "border-primary/20 bg-primary/5"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Awaab's Law - Work Start</p>
                <p className="text-xs text-accent/60 mt-1">
                  Deadline: {new Date(data.awaabWorkStartDeadline.deadlineDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              {data.awaabWorkStartDeadline.breached ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  BREACHED
                </Badge>
              ) : (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {data.awaabWorkStartDeadline.daysRemaining} days
                </Badge>
              )}
            </div>
          </div>
        )}

        {data.section11ReasonableTime && (
          <div className={`rounded-lg border p-3 ${
            data.section11ReasonableTime.exceeded
              ? "border-orange-500/20 bg-orange-500/5"
              : "border-primary/20 bg-primary/5"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Section 11 LTA - Reasonable Time</p>
                <p className="text-xs text-accent/60 mt-1">
                  {data.section11ReasonableTime.daysSinceReport} days since report
                  (Reasonable: {data.section11ReasonableTime.reasonableTime} days)
                </p>
              </div>
              {data.section11ReasonableTime.exceeded ? (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  EXCEEDED
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Within Time
                </Badge>
              )}
            </div>
          </div>
        )}

        {data.statutoryBreaches.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-sm font-medium text-red-400">Possible Statutory Breaches Detected</p>
            </div>
            <ul className="space-y-1">
              {data.statutoryBreaches.map((breach, idx) => (
                <li key={idx} className="text-xs text-red-300">
                  • {breach}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

