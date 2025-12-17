"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

type GetOffProbabilityMeterProps = {
  caseId: string;
};

type ProbabilityData = {
  overall: number | null; // 0-100
  topStrategy: string;
  topStrategyProbability: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  probabilitiesSuppressed?: boolean;
  suppressionReason?: string | null;
  bundleCompleteness?: number;
  criticalMissingCount?: number;
};

export function GetOffProbabilityMeter({ caseId }: GetOffProbabilityMeterProps) {
  const [data, setData] = useState<ProbabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProbability() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/probability`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch probability:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProbability();
  }, [caseId]);

  if (loading) {
    return (
      <Card
        title="Get Off Probability"
        description="Calculating success probability..."
        className="animate-pulse"
      >
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card
        title="Get Off Probability"
        description="Unable to calculate probability. Upload case documents to begin analysis."
      >
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No data available</p>
        </div>
      </Card>
    );
  }
  
  if (data.probabilitiesSuppressed || data.overall === null) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Get Off Probability</span>
          </div>
        }
        description={data.suppressionReason || "Insufficient bundle for probabilistic output. Disclosure-first actions only."}
      >
        <div className="text-sm text-muted-foreground">
          <div className="font-medium text-foreground">N/A</div>
          {typeof data.bundleCompleteness === "number" && (
            <div className="text-xs mt-1">
              Bundle completeness: {data.bundleCompleteness}%{typeof data.criticalMissingCount === "number" ? ` • Critical missing: ${data.criticalMissingCount}` : ""}
            </div>
          )}
        </div>
      </Card>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "text-green-400";
      case "MEDIUM":
        return "text-yellow-400";
      case "HIGH":
        return "text-orange-400";
      case "CRITICAL":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBadgeVariant = (risk: string): "success" | "warning" | "danger" | "secondary" => {
    switch (risk) {
      case "LOW":
        return "success";
      case "MEDIUM":
        return "warning";
      case "HIGH":
      case "CRITICAL":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>Get Off Probability</span>
        </div>
      }
      description="Overall success probability based on evidence analysis and loopholes"
    >
      <div className="space-y-4">
        {/* Overall Probability */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Overall Success</span>
            <Badge variant={data.overall >= 70 ? "success" : data.overall >= 40 ? "warning" : "danger"}>
              {data.overall}%
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all ${
                data.overall >= 70
                  ? "bg-green-500"
                  : data.overall >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${data.overall}%` }}
            />
          </div>
        </div>

        {/* Top Strategy */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Top Strategy</span>
            <Badge variant={data.topStrategyProbability >= 70 ? "success" : data.topStrategyProbability >= 40 ? "warning" : "secondary"}>
              {data.topStrategyProbability}% success
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{data.topStrategy}</p>
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2">
            {data.riskLevel === "LOW" ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertTriangle className={`h-4 w-4 ${getRiskColor(data.riskLevel)}`} />
            )}
            <span className="text-sm font-medium text-foreground">Risk Level</span>
          </div>
          <Badge variant={getRiskBadgeVariant(data.riskLevel)}>{data.riskLevel}</Badge>
        </div>
      </div>
    </Card>
  );
}

