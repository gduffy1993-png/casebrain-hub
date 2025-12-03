"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, AlertTriangle, User, Baby } from "lucide-react";
import { Loader2 } from "lucide-react";

type HealthSymptomsPanelProps = {
  caseId: string;
};

type HealthSymptomsData = {
  detected: boolean;
  symptoms: string[];
  vulnerableOccupants: string[];
  respiratoryIssues: boolean;
  childUnder5: boolean;
  enhancedDuty: boolean;
  severity: "low" | "medium" | "high" | "critical";
};

export function HealthSymptomsPanel({ caseId }: HealthSymptomsPanelProps) {
  const [data, setData] = useState<HealthSymptomsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/cases/${caseId}/housing/health-symptoms`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch health symptoms data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Health Symptoms & Vulnerability">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!data || !data.detected) {
    return (
      <Card title="Health Symptoms & Vulnerability">
        <p className="text-sm text-accent/60">No health symptoms or vulnerability indicators detected.</p>
      </Card>
    );
  }

  const severityColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <Card title="Health Symptoms & Vulnerability">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-red-400" />
          <Badge className={severityColors[data.severity]}>
            {data.severity.toUpperCase()} Risk
          </Badge>
          {data.enhancedDuty && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Enhanced Duty
            </Badge>
          )}
        </div>

        {data.childUnder5 && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-warning" />
              <p className="text-sm font-medium text-warning">Child Under 5 Present</p>
            </div>
            <p className="text-xs text-accent/70 mt-1">
              Awaab's Law applies. Statutory deadlines: 14 days investigation, 7 days work start.
            </p>
          </div>
        )}

        {data.respiratoryIssues && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-sm font-medium text-red-400">Respiratory Issues Detected</p>
            </div>
            <p className="text-xs text-accent/70 mt-1">
              Combined with damp/mould, this represents a serious health risk.
            </p>
          </div>
        )}

        {data.symptoms.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-accent/50 mb-2">Reported Symptoms</p>
            <ul className="space-y-1">
              {data.symptoms.map((symptom, idx) => (
                <li key={idx} className="text-sm text-accent/80 flex items-start gap-2">
                  <Heart className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.vulnerableOccupants.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-accent/50 mb-2">Vulnerable Occupants</p>
            <div className="flex flex-wrap gap-2">
              {data.vulnerableOccupants.map((vuln, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {vuln}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

