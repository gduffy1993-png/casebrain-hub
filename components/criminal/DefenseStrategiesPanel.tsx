"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type DefenseStrategy = {
  id: string;
  strategyName: string;
  strategyType: string;
  description: string;
  successProbability: number | null;
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  legalArgument: string | null;
  actionsRequired: string[];
  selected: boolean;
};

type DefenseStrategiesPanelProps = {
  caseId: string;
};

export function DefenseStrategiesPanel({ caseId }: DefenseStrategiesPanelProps) {
  const [strategies, setStrategies] = useState<DefenseStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppression, setSuppression] = useState<{ reason?: string | null } | null>(null);
  const [gatedResponse, setGatedResponse] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  useEffect(() => {
    async function fetchStrategies() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/strategies`);
        if (res.ok) {
          const result = await res.json();
          const normalized = normalizeApiResponse<{ strategies: DefenseStrategy[] }>(result);
          
          // Check if gated (ok: false or banner exists)
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

          const data = normalized.data || result; // Fallback to old shape
          setStrategies(data.strategies || []);
          if (data?.probabilitiesSuppressed) {
            setSuppression({ reason: data?.suppressionReason });
          } else {
            setSuppression(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch strategies:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStrategies();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Defense Strategies" description="Generating defense strategies..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

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

  const sortedStrategies = [...strategies].sort(
    (a, b) => (b.successProbability ?? 0) - (a.successProbability ?? 0),
  );

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span>Defense Strategies</span>
        </div>
      }
      description="Recommended defense strategies with success probabilities"
    >
      {suppression?.reason && (
        <div className="mb-3 text-xs text-muted-foreground">
          {suppression.reason}
        </div>
      )}
      {strategies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No strategies generated yet</p>
          <p className="text-xs mt-1">Upload case documents to begin analysis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedStrategies.map((strategy) => (
            <div
              key={strategy.id}
              className={`p-4 rounded-lg border ${
                strategy.selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{strategy.strategyName}</h4>
                    <Badge
                      variant={
                        (strategy.successProbability ?? 0) >= 70
                          ? "success"
                          : (strategy.successProbability ?? 0) >= 40
                            ? "warning"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {strategy.successProbability === null ? "N/A" : `${strategy.successProbability}% success`}
                    </Badge>
                    <Badge
                      variant={
                        strategy.impact === "CRITICAL"
                          ? "danger"
                          : strategy.impact === "HIGH"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {strategy.impact} impact
                    </Badge>
                    {strategy.selected && (
                      <Badge variant="primary" className="text-xs">SELECTED</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{strategy.description}</p>
                  {strategy.actionsRequired.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Actions Required:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {strategy.actionsRequired.map((action, i) => (
                          <li key={i}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {strategy.legalArgument && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    View Legal Argument
                  </summary>
                  <div className="mt-2 p-3 rounded bg-muted/50 border border-border">
                    <p className="text-xs whitespace-pre-wrap">{strategy.legalArgument}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(strategy.legalArgument || "");
                      }}
                    >
                      Copy Argument
                    </Button>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

