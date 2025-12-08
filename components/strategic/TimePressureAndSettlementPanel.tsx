"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, TrendingUp } from "lucide-react";

type TimePressurePoint = {
  id: string;
  issue: string;
  leverage: string;
  timing: string;
  action: string;
  riskToOpponent: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
};

type Scenario = {
  id: string;
  action: string;
  scenario: string;
  likelyOutcome: string;
  timeline: string;
};

type TimePressureAndSettlementPanelProps = {
  caseId: string;
};

export function TimePressureAndSettlementPanel({ caseId }: TimePressureAndSettlementPanelProps) {
  const [pressurePoints, setPressurePoints] = useState<TimePressurePoint[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [pressureRes, scenariosRes] = await Promise.all([
          fetch(`/api/strategic/${caseId}/time-pressure`),
          fetch(`/api/strategic/${caseId}/scenarios`),
        ]);

        if (!pressureRes.ok || !scenariosRes.ok) {
          throw new Error("Failed to fetch time pressure or scenarios");
        }

        const [pressureData, scenariosData] = await Promise.all([
          pressureRes.json(),
          scenariosRes.json(),
        ]);

        setPressurePoints(pressureData.pressurePoints || []);
        setScenarios(scenariosData.scenarios || []);
      } catch (err) {
        console.error("Failed to fetch time pressure/scenarios:", err);
        setError("No time pressure analysis available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading time pressure analysis…</span>
        </div>
      </Card>
    );
  }

  if (error || (pressurePoints.length === 0 && scenarios.length === 0)) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Time Pressure & Settlement</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {error || "No time pressure analysis available yet. Run analysis again after more documents are uploaded."}
        </p>
      </Card>
    );
  }

  // Calculate settlement pressure (simplified - based on scenarios)
  const settlementScenarios = scenarios.filter(s => 
    s.scenario.toLowerCase().includes("settlement")
  );
  const settlementPressure = settlementScenarios.length > 0 ? "MEDIUM" : "LOW";

  const getPressureColor = (pressure: string) => {
    switch (pressure) {
      case "HIGH":
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Time Pressure & Settlement</h3>
      </div>

      <div className="space-y-4">
        {/* Settlement Pressure Gauge */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-foreground">Settlement Pressure</h4>
            <Badge className={getPressureColor(settlementPressure)}>
              {settlementPressure}
            </Badge>
          </div>
          {settlementScenarios.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {settlementScenarios[0].likelyOutcome}
            </p>
          )}
        </div>

        {/* Time Pressure Points */}
        {pressurePoints.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">Time Pressure Windows</h4>
            <div className="space-y-2">
              {pressurePoints.slice(0, 3).map((point) => (
                <div
                  key={point.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getPressureColor(point.severity)}>
                      {point.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{point.issue}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{point.leverage}</p>
                  <p className="text-xs text-cyan-400">{point.timing}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Action:</span> {point.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

