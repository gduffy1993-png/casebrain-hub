"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OutcomeInsight } from "@/lib/types/casebrain";

type OutcomeInsightsPanelProps = {
  caseId: string;
};

const confidenceColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-green-500/20 text-green-400",
};

export function OutcomeInsightsPanel({ caseId }: OutcomeInsightsPanelProps) {
  const [insights, setInsights] = useState<OutcomeInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/outcome-insights`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to fetch outcome insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Outcome Insights">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card title="Outcome Insights">
        <p className="text-sm text-accent/60">Unable to generate insights.</p>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Outcome Insights</span>
            <Badge className={confidenceColors[insights.confidence]}>
              {insights.confidence} confidence
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInsights}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Disclaimer banner */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300">
            For internal guidance only. Not legal advice or a prediction of outcome.
          </p>
        </div>

        {/* Outcome Ranges */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
          <p className="text-xs uppercase tracking-wide text-accent/50">Typical Outcome Ranges</p>
          <div className="mt-2 space-y-1">
            {insights.outcomeRanges.map((range, idx) => (
              <p key={idx} className="text-sm text-accent">
                {range}
              </p>
            ))}
          </div>
        </div>

        {/* Time estimate */}
        {insights.timeToResolutionEstimate && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/10 bg-surface-muted/50 p-3">
            <Clock className="h-5 w-5 text-primary/70" />
            <div>
              <p className="text-xs text-accent/50">Estimated Timeline</p>
              <p className="text-sm font-medium text-accent">
                {insights.timeToResolutionEstimate}
              </p>
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Strengths */}
          {insights.strengths.length > 0 && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">Strengths</span>
              </div>
              <ul className="space-y-1">
                {insights.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-accent/70">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {insights.weaknesses.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">Weaknesses</span>
              </div>
              <ul className="space-y-1">
                {insights.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-xs text-accent/70">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Influencing Factors Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between rounded-lg border border-primary/10 bg-surface-muted/50 px-3 py-2 text-sm text-accent/70 hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Influencing Factors ({insights.influencingFactors.length})</span>
          </div>
          {showDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showDetails && insights.influencingFactors.length > 0 && (
          <ul className="rounded-lg border border-primary/10 bg-surface-muted/30 p-3 space-y-1">
            {insights.influencingFactors.map((factor, idx) => (
              <li key={idx} className="text-xs text-accent/70">
                • {factor}
              </li>
            ))}
          </ul>
        )}

        {/* Full disclaimer */}
        <div className="rounded-lg border border-slate-500/20 bg-slate-500/5 p-3">
          <p className="text-[10px] text-accent/50 leading-relaxed">
            {insights.disclaimer}
          </p>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-accent/40">
          Generated: {new Date(insights.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>
    </Card>
  );
}

