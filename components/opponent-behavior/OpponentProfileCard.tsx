"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";

type OpponentStrategy = {
  opponentName: string;
  profile: {
    totalCases: number;
    settlementRate: number;
    averageSettlementStage: string | null;
    part36AcceptanceRate: number | null;
    averageResponseTimeDays: number | null;
    trialRate: number | null;
  };
  recommendedStrategy: string;
  settlementLikelihood: "HIGH" | "MEDIUM" | "LOW";
  bestSettlementStage: string;
  part36Strategy: string;
  trialPreparation: string;
};

type OpponentProfileCardProps = {
  opponentName: string;
};

export function OpponentProfileCard({ opponentName }: OpponentProfileCardProps) {
  const [strategy, setStrategy] = useState<OpponentStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStrategy() {
      try {
        setLoading(true);
        setError(null);
        const encodedName = encodeURIComponent(opponentName);
        const response = await fetch(`/api/opponent-behavior/${encodedName}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Insufficient data for this opponent");
            return;
          }
          throw new Error("Failed to fetch opponent strategy");
        }
        
        const data = await response.json();
        setStrategy(data);
      } catch (err) {
        console.error("Failed to fetch opponent strategy:", err);
        setError("Failed to load opponent profile");
      } finally {
        setLoading(false);
      }
    }

    if (opponentName) {
      fetchStrategy();
    }
  }, [opponentName]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading opponent profile…</span>
        </div>
      </Card>
    );
  }

  if (error || !strategy) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "No opponent profile data available. Track more cases with this opponent to build a profile."}
        </p>
      </Card>
    );
  }

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "HIGH":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "LOW":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Opponent Profile</h3>
        </div>
        <Badge className={getLikelihoodColor(strategy.settlementLikelihood)}>
          {strategy.settlementLikelihood} Settlement Likelihood
        </Badge>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-1">{strategy.opponentName}</p>
        <p className="text-xs text-muted-foreground">
          Based on {strategy.profile.totalCases} case{strategy.profile.totalCases !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Settlement Rate</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {strategy.profile.settlementRate.toFixed(0)}%
          </p>
        </div>

        {strategy.profile.part36AcceptanceRate !== null && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Part 36 Acceptance</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {strategy.profile.part36AcceptanceRate.toFixed(0)}%
            </p>
          </div>
        )}

        {strategy.profile.averageResponseTimeDays !== null && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Response Time</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {strategy.profile.averageResponseTimeDays.toFixed(0)} days
            </p>
          </div>
        )}

        {strategy.profile.trialRate !== null && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Trial Rate</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {strategy.profile.trialRate.toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Strategy Recommendation */}
      <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
        <p className="text-sm font-medium text-cyan-300 mb-2">Recommended Strategy:</p>
        <p className="text-sm text-cyan-200/90 leading-relaxed mb-3">{strategy.recommendedStrategy}</p>
        
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-medium text-cyan-300">Best Settlement Stage:</span>
            <span className="text-cyan-200/90 ml-2">{strategy.bestSettlementStage}</span>
          </div>
          <div>
            <span className="font-medium text-cyan-300">Part 36 Strategy:</span>
            <span className="text-cyan-200/90 ml-2">{strategy.part36Strategy}</span>
          </div>
          <div>
            <span className="font-medium text-cyan-300">Trial Preparation:</span>
            <span className="text-cyan-200/90 ml-2">{strategy.trialPreparation}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

