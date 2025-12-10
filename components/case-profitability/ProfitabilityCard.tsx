"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";

type CaseProfitability = {
  caseId: string;
  caseTitle: string;
  practiceArea: string;
  feeType: string;
  profitabilityScore: number;
  recoveryRate: number;
  status: "profitable" | "at_risk" | "unprofitable" | "unknown";
  alert?: string;
  totalBilled: number;
  totalRecovered: number;
};

type ProfitabilityCardProps = {
  caseId: string;
};

export function ProfitabilityCard({ caseId }: ProfitabilityCardProps) {
  const [profitability, setProfitability] = useState<CaseProfitability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfitability() {
      try {
        setLoading(true);
        const response = await fetch(`/api/case-profitability/${caseId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch profitability");
        }
        
        const data = await response.json();
        setProfitability(data);
      } catch (error) {
        console.error("Failed to fetch profitability:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfitability();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Calculating profitability…</span>
        </div>
      </Card>
    );
  }

  if (!profitability) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No profitability data available.</p>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "profitable":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "at_risk":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "unprofitable":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Case Profitability</h3>
        </div>
        <Badge className={getStatusColor(profitability.status)}>
          {profitability.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            {profitability.profitabilityScore >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-xs text-muted-foreground">Profitability Score</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {profitability.profitabilityScore >= 0 ? "+" : ""}{profitability.profitabilityScore.toFixed(1)}%
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Recovery Rate</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {profitability.recoveryRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Billed:</span>
          <span className="font-medium text-foreground">{formatCurrency(profitability.totalBilled)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Recovered:</span>
          <span className="font-medium text-foreground">{formatCurrency(profitability.totalRecovered)}</span>
        </div>
      </div>

      {profitability.alert && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-200/90">{profitability.alert}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

