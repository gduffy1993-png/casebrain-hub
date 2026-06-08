"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target } from "lucide-react";
import { StrategicInsightMetaDisplay } from "./StrategicInsightMeta";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type StrategicInsightMeta = {
  whyRecommended: string;
  triggeredBy: string[];
  alternatives: Array<{
    label: string;
    description: string;
    unlockedBy?: string[];
  }>;
  riskIfIgnored: string;
  bestStageToUse: string;
  howThisHelpsYouWin: string;
  useThisTo?: string[];
  useAt?: string[];
};

type StrategyPath = {
  id: string;
  route: "A" | "B" | "C" | "D" | "E";
  title: string;
  description: string;
  approach: string;
  pros: string[];
  cons: string[];
  estimatedTimeframe: string;
  estimatedCost: string;
  successProbability: "HIGH" | "MEDIUM" | "LOW";
  recommendedFor: string;
  meta?: StrategicInsightMeta;
};

type StrategicRoutesPanelProps = {
  caseId: string;
};

export function StrategicRoutesPanel({ caseId }: StrategicRoutesPanelProps) {
  const [strategies, setStrategies] = useState<StrategyPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatedResponse, setGatedResponse] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  useEffect(() => {
    async function fetchStrategies() {
      try {
        setLoading(true);
        setError(null);
        setGatedResponse(null);
        const response = await fetch(`/api/strategic/${caseId}/strategies`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch strategies");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<{ strategies: StrategyPath[] }>(result);
        
        // Check if gated
        if (isGated(normalized)) {
          setGatedResponse({
            banner: normalized.banner || {
              severity: "warning",
              title: "Insufficient text extracted",
              message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
            },
            diagnostics: normalized.diagnostics,
          });
          setStrategies([]);
          return;
        }

        setStrategies(normalized.data?.strategies || result.strategies || []);
      } catch (err) {
        console.error("Failed to fetch strategies:", err);
        setError("No strategic routes available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchStrategies();
  }, [caseId]);

  // Show minimal placeholder if analysis is blocked (parent may show full banner)
  if (gatedResponse) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Analysis unavailable. {gatedResponse.banner?.message || "Not enough extractable text to generate reliable analysis."}
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading strategic routes…</span>
        </div>
      </Card>
    );
  }

  if (error || strategies.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Strategic Routes</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {error || "No strategic routes available yet. Run analysis again after more documents are uploaded."}
        </p>
      </Card>
    );
  }

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case "HIGH":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Strategic Routes</h3>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Route {strategy.route}
                </Badge>
                <h4 className="text-sm font-medium text-foreground">
                  {strategy.title.replace(`Route ${strategy.route}: `, "")}
                </h4>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{strategy.description}</p>

            {/* Detailed Approach Steps */}
            {strategy.approach && strategy.approach.includes("Step") && (
              <div className="mt-3 p-3 rounded bg-cyan-950/30 border border-cyan-800/30">
                <p className="text-xs font-medium text-cyan-300 mb-2">Tactical Approach:</p>
                <div className="text-xs text-cyan-200/90 whitespace-pre-line leading-relaxed space-y-1">
                  {strategy.approach.split(/(?=Step \d+:)/).filter(Boolean).map((step, idx) => (
                    <div key={idx} className="mb-1.5">
                      {step.trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-foreground mb-1">When to use:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{strategy.recommendedFor}</p>
              </div>
              
              {/* Use this at - Stage-specific guidance (use meta.useAt if available, otherwise skip) */}
              {strategy.meta?.useAt && strategy.meta.useAt.length > 0 && (
                <div className="mt-3 p-2 rounded bg-amber-950/20 border border-amber-800/30">
                  <p className="text-xs font-medium text-amber-300 mb-1.5">Use this at:</p>
                  <ul className="text-xs text-amber-200/90 space-y-1">
                    {strategy.meta.useAt.map((stage, idx) => {
                      // Parse stage text (e.g., "Pre-Action Protocol (PAP) – press for admissions")
                      const [label, description] = stage.split(" – ");
                      return (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>
                            {label && <span className="font-medium">{label}</span>}
                            {description && ` – ${description}`}
                            {!label && <span>{stage}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {strategy.pros.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Pros:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {strategy.pros.slice(0, 3).map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-green-400 mt-0.5">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Timeframe: {strategy.estimatedTimeframe}</span>
              </div>
            </div>

            {/* Meta Information */}
            {strategy.meta && (
              <StrategicInsightMetaDisplay meta={strategy.meta} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

