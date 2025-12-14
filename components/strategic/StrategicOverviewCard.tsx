"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

type MomentumState = "STRONG" | "STRONG (Expert Pending)" | "BALANCED" | "WEAK";

type StrategyPath = {
  id: string;
  route: "A" | "B" | "C" | "D" | "E";
  title: string;
  description: string;
  successProbability: "HIGH" | "MEDIUM" | "LOW";
};

type MomentumShift = {
  factor: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  description: string;
  weight: number;
};

type StrategicOverview = {
  momentum: {
    state: MomentumState;
    score: number;
    explanation: string;
    shifts?: MomentumShift[];
  };
  strategies: StrategyPath[];
};

type StrategicOverviewCardProps = {
  caseId: string;
};

export function StrategicOverviewCard({ caseId }: StrategicOverviewCardProps) {
  const [data, setData] = useState<StrategicOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/strategic/${caseId}/overview`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch strategic overview");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch strategic overview:", err);
        setError("Strategic analysis not available yet for this case.");
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing case strategy…</span>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Strategic analysis not available yet for this case."}
        </p>
      </Card>
    );
  }

  const { momentum, strategies } = data;

  const getMomentumIcon = () => {
    switch (momentum.state) {
      case "STRONG":
        return <TrendingUp className="h-5 w-5 text-green-400" />;
      case "STRONG (Expert Pending)":
        return <TrendingUp className="h-5 w-5 text-blue-400" />;
      case "WEAK":
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Minus className="h-5 w-5 text-amber-400" />;
    }
  };

  const getMomentumColor = () => {
    switch (momentum.state) {
      case "STRONG":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "STRONG (Expert Pending)":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "WEAK":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Strategic Overview</h3>
        <Badge variant="outline" className="text-xs">BETA</Badge>
      </div>

      {/* Case Momentum */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {getMomentumIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Case Momentum:</span>
              <Badge className={getMomentumColor()}>
                {momentum.state}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {momentum.explanation}
            </p>
            {data.momentum.shifts && data.momentum.shifts.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground">Key Factors:</p>
                {data.momentum.shifts.slice(0, 4).map((shift, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className={`shrink-0 ${shift.impact === "POSITIVE" ? "text-green-400" : shift.impact === "NEGATIVE" ? "text-red-400" : "text-amber-400"}`}>
                      {shift.impact === "POSITIVE" ? "↑" : shift.impact === "NEGATIVE" ? "↓" : "→"}
                    </span>
                    <span className="text-muted-foreground">
                      {shift.factor}: {shift.description}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strategic Routes */}
      {strategies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Available Strategic Routes:</h4>
          <div className="space-y-2">
            {strategies.slice(0, 3).map((strategy) => (
              <div
                key={strategy.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border/50"
              >
                <Badge variant="outline" className="text-xs shrink-0">
                  Route {strategy.route}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {strategy.title.replace(`Route ${strategy.route}: `, "")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {strategy.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

