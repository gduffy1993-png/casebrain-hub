"use client";

import { useState, useEffect } from "react";
import {
  AlertOctagon,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ComplaintRiskScore, ComplaintRiskFactor } from "@/lib/types/casebrain";

type ComplaintRiskPanelProps = {
  caseId: string;
};

const levelColors: Record<string, { bg: string; text: string; ring: string }> = {
  low: { bg: "bg-green-500", text: "text-green-400", ring: "ring-green-500/30" },
  medium: { bg: "bg-amber-500", text: "text-amber-400", ring: "ring-amber-500/30" },
  high: { bg: "bg-orange-500", text: "text-orange-400", ring: "ring-orange-500/30" },
  critical: { bg: "bg-red-500", text: "text-red-400", ring: "ring-red-500/30" },
};

export function ComplaintRiskPanel({ caseId }: ComplaintRiskPanelProps) {
  const [score, setScore] = useState<ComplaintRiskScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchScore = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/complaint-risk`);
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
      }
    } catch (error) {
      console.error("Failed to fetch complaint risk:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Complaint Risk">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card title="Complaint Risk">
        <p className="text-sm text-accent/60">Unable to calculate risk score.</p>
      </Card>
    );
  }

  const colors = levelColors[score.level];

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className={`h-5 w-5 ${colors.text}`} />
            <span>Complaint Risk</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchScore}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Score Meter */}
        <div className="flex items-center gap-6">
          {/* Circular score display */}
          <div className={`relative h-24 w-24 shrink-0`}>
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-surface-muted"
              />
              {/* Score ring */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(score.score / 100) * 264} 264`}
                className={colors.text}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${colors.text}`}>
                {score.score}
              </span>
              <span className="text-[10px] text-accent/50">/ 100</span>
            </div>
          </div>

          {/* Level and summary */}
          <div className="flex-1">
            <Badge className={`${colors.bg}/20 ${colors.text} mb-2`}>
              {score.level.toUpperCase()} RISK
            </Badge>
            <p className="text-sm text-accent/70">
              {score.level === "low" && "Case management appears satisfactory."}
              {score.level === "medium" && "Some areas may need attention."}
              {score.level === "high" && "Significant concerns detected."}
              {score.level === "critical" && "Immediate action recommended."}
            </p>
          </div>
        </div>

        {/* Reasons summary */}
        {score.reasons.length > 0 && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
            <p className="text-xs font-medium text-danger">Key concerns:</p>
            <ul className="mt-1 space-y-0.5">
              {score.reasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="text-xs text-accent/70">
                  • {reason}
                </li>
              ))}
              {score.reasons.length > 3 && (
                <li className="text-xs text-accent/50">
                  ... and {score.reasons.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between rounded-lg border border-primary/10 bg-surface-muted/50 px-3 py-2 text-sm text-accent/70 hover:bg-primary/5 transition-colors"
        >
          <span>Risk Factors</span>
          {showDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showDetails && (
          <div className="space-y-2">
            {score.factors.map((factor, idx) => (
              <FactorRow key={idx} factor={factor} />
            ))}
          </div>
        )}

        {/* Suggestions toggle */}
        {score.suggestions.length > 0 && (
          <>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex w-full items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm text-success hover:bg-success/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span>How to reduce risk</span>
              </div>
              {showSuggestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showSuggestions && (
              <ul className="rounded-lg border border-success/20 bg-success/5 p-3 space-y-1">
                {score.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-accent/70">
                    <span className="text-success">✓</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-accent/40 italic">
          This is an internal risk indicator only, not legal advice.
          Based on available case data as of {new Date(score.calculatedAt).toLocaleString("en-GB")}.
        </p>
      </div>
    </Card>
  );
}

function FactorRow({ factor }: { factor: ComplaintRiskFactor }) {
  const isPositive = factor.impact === "positive";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-2 ${
        isPositive
          ? "border-green-500/20 bg-green-500/5"
          : "border-red-500/20 bg-red-500/5"
      }`}
    >
      {isPositive ? (
        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
      ) : (
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {factor.factor}
        </p>
        <p className="text-xs text-accent/60 truncate">{factor.description}</p>
      </div>
      {factor.weight > 0 && (
        <Badge variant="outline" className="text-[10px] shrink-0">
          +{factor.weight}
        </Badge>
      )}
    </div>
  );
}

