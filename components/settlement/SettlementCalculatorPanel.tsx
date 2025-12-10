"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, TrendingUp, AlertTriangle, Target } from "lucide-react";

type SettlementRecommendation = {
  caseStrength: "STRONG" | "MODERATE" | "WEAK";
  quantumEstimate: number;
  costsToDate: number;
  estimatedCostsToTrial: number;
  recommendedSettlement: number;
  settlementRange: {
    min: number;
    max: number;
  };
  part36Recommendation: {
    amount: number;
    acceptanceLikelihood: number;
    strategy: string;
  };
  recommendation: "SETTLE_NOW" | "NEGOTIATE" | "FIGHT_TO_TRIAL";
  reasoning: string;
  costBenefit: {
    settleNow: {
      netValue: number;
      timeSaved: string;
    };
    fightToTrial: {
      netValue: number;
      risk: string;
    };
  };
};

type SettlementCalculatorPanelProps = {
  caseId: string;
  opponentName?: string;
};

export function SettlementCalculatorPanel({ caseId, opponentName }: SettlementCalculatorPanelProps) {
  const [recommendation, setRecommendation] = useState<SettlementRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendation() {
      try {
        setLoading(true);
        const url = opponentName
          ? `/api/settlement/${caseId}/calculate?opponentName=${encodeURIComponent(opponentName)}`
          : `/api/settlement/${caseId}/calculate`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch settlement recommendation");
        }
        
        const data = await response.json();
        setRecommendation(data);
      } catch (error) {
        console.error("Failed to fetch settlement recommendation:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendation();
  }, [caseId, opponentName]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Calculating settlement value…</span>
        </div>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No settlement recommendation available.</p>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "SETTLE_NOW":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "FIGHT_TO_TRIAL":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "STRONG":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "MODERATE":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Settlement Value Calculator</h3>
        </div>
        <Badge className={getRecommendationColor(recommendation.recommendation)}>
          {recommendation.recommendation.replace("_", " ")}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Quantum Estimate</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(recommendation.quantumEstimate)}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Recommended Settlement</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(recommendation.recommendedSettlement)}
          </p>
        </div>
      </div>

      {/* Case Strength */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Case Strength:</span>
        <Badge className={getStrengthColor(recommendation.caseStrength)}>
          {recommendation.caseStrength}
        </Badge>
      </div>

      {/* Recommendation */}
      <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
        <p className="text-sm font-medium text-cyan-300 mb-2">Recommendation:</p>
        <p className="text-sm text-cyan-200/90 leading-relaxed mb-3">{recommendation.reasoning}</p>
        
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="p-2 rounded bg-cyan-950/20 border border-cyan-800/20">
            <p className="text-xs font-medium text-cyan-300 mb-1">Settle Now:</p>
            <p className="text-xs text-cyan-200/90">
              Net Value: {formatCurrency(recommendation.costBenefit.settleNow.netValue)}
            </p>
            <p className="text-xs text-cyan-200/90">
              Time Saved: {recommendation.costBenefit.settleNow.timeSaved}
            </p>
          </div>
          <div className="p-2 rounded bg-cyan-950/20 border border-cyan-800/20">
            <p className="text-xs font-medium text-cyan-300 mb-1">Fight to Trial:</p>
            <p className="text-xs text-cyan-200/90">
              Net Value: {formatCurrency(recommendation.costBenefit.fightToTrial.netValue)}
            </p>
            <p className="text-xs text-cyan-200/90">
              Risk: {recommendation.costBenefit.fightToTrial.risk}
            </p>
          </div>
        </div>
      </div>

      {/* Part 36 Recommendation */}
      <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/30">
        <p className="text-sm font-medium text-amber-300 mb-2">Part 36 Strategy:</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-foreground">
            Recommended Offer: {formatCurrency(recommendation.part36Recommendation.amount)}
          </span>
          <Badge variant="outline" className="text-xs">
            {recommendation.part36Recommendation.acceptanceLikelihood}% acceptance likelihood
          </Badge>
        </div>
        <p className="text-xs text-amber-200/90">{recommendation.part36Recommendation.strategy}</p>
      </div>

      {/* Settlement Range */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs font-medium text-foreground mb-1">Settlement Range:</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(recommendation.settlementRange.min)} - {formatCurrency(recommendation.settlementRange.max)}
        </p>
      </div>
    </Card>
  );
}

