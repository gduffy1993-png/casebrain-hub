"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, AlertTriangle, Calendar, Home } from "lucide-react";
import { Loader2 } from "lucide-react";

type DampMouldPanelProps = {
  caseId: string;
};

type DampMouldData = {
  detected: boolean;
  severity: "low" | "medium" | "high" | "critical";
  indicators: string[];
  daysSinceFirstReport?: number;
  locations: string[];
  healthImpact: boolean;
  category1Hazard: boolean;
};

export function DampMouldPanel({ caseId }: DampMouldPanelProps) {
  const [data, setData] = useState<DampMouldData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/cases/${caseId}/housing/damp-mould`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch damp/mould data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Damp & Mould Analysis">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!data || !data.detected) {
    return (
      <Card title="Damp & Mould Analysis">
        <p className="text-sm text-accent/60">No damp or mould issues detected in case documents.</p>
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
    <Card title="Damp & Mould Analysis">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Droplets className="h-5 w-5 text-blue-400" />
          <Badge className={severityColors[data.severity]}>
            {data.severity.toUpperCase()} Severity
          </Badge>
          {data.category1Hazard && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              Category 1 Hazard
            </Badge>
          )}
        </div>

        {data.daysSinceFirstReport !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-accent/50" />
            <span className="text-accent/70">
              {data.daysSinceFirstReport} days since first report
            </span>
            {data.daysSinceFirstReport > 28 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                Awaab's Law trigger
              </Badge>
            )}
          </div>
        )}

        {data.locations.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-accent/50 mb-2">Affected Locations</p>
            <div className="flex flex-wrap gap-2">
              {data.locations.map((loc, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <Home className="h-3 w-3 mr-1" />
                  {loc}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.indicators.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-accent/50 mb-2">Detected Indicators</p>
            <ul className="space-y-1">
              {data.indicators.map((indicator, idx) => (
                <li key={idx} className="text-sm text-accent/80 flex items-start gap-2">
                  <Droplets className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                  <span>{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.healthImpact && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm font-medium text-warning">Health Impact Detected</p>
            </div>
            <p className="text-xs text-accent/70 mt-1">
              Health symptoms or respiratory issues mentioned. Enhanced duty may apply.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

