"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Search } from "lucide-react";
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

type LeveragePoint = {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  suggestedEscalation: string;
  escalationText: string;
  leverage: string;
  cprRule?: string;
  meta?: StrategicInsightMeta;
};

type WeakSpot = {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  impact: string;
  suggestedAction: string;
  meta?: StrategicInsightMeta;
};

type LeverageAndWeakSpotsPanelProps = {
  caseId: string;
};

export function LeverageAndWeakSpotsPanel({ caseId }: LeverageAndWeakSpotsPanelProps) {
  const [leveragePoints, setLeveragePoints] = useState<LeveragePoint[]>([]);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatedResponse, setGatedResponse] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        setGatedResponse(null);

        const [leverageRes, weakSpotsRes] = await Promise.all([
          fetch(`/api/strategic/${caseId}/leverage`),
          fetch(`/api/strategic/${caseId}/weak-spots`),
        ]);

        if (!leverageRes.ok || !weakSpotsRes.ok) {
          throw new Error("Failed to fetch leverage or weak spots");
        }

        const [leverageResult, weakSpotsResult] = await Promise.all([
          leverageRes.json(),
          weakSpotsRes.json(),
        ]);

        const leverageNormalized = normalizeApiResponse<{ leveragePoints: LeveragePoint[] }>(leverageResult);
        const weakSpotsNormalized = normalizeApiResponse<{ weakSpots: WeakSpot[] }>(weakSpotsResult);

        // Check if either is gated
        if (isGated(leverageNormalized) || isGated(weakSpotsNormalized)) {
          const gated = isGated(leverageNormalized) ? leverageNormalized : weakSpotsNormalized;
          setGatedResponse({
            banner: gated.banner || {
              severity: "warning",
              title: "Insufficient text extracted",
              message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
            },
            diagnostics: gated.diagnostics,
          });
          setLeveragePoints([]);
          setWeakSpots([]);
          return;
        }

        setLeveragePoints(leverageNormalized.data?.leveragePoints || leverageResult.leveragePoints || []);
        setWeakSpots(weakSpotsNormalized.data?.weakSpots || weakSpotsResult.weakSpots || []);
      } catch (err) {
        console.error("Failed to fetch leverage/weak spots:", err);
        setError("No leverage points or weak spots available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  // Show gate banner if analysis is blocked
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
          <span>Loading leverage analysis…</span>
        </div>
      </Card>
    );
  }

  if (error || (leveragePoints.length === 0 && weakSpots.length === 0)) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Leverage & Weak Spots</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {error || "No leverage points or weak spots available yet. Run analysis again after more documents are uploaded."}
        </p>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  // Group weak spots by type
  const contradictions = weakSpots.filter(w => w.type === "CONTRADICTION");
  const missingEvidence = weakSpots.filter(w => w.type === "MISSING_EVIDENCE");
  const otherWeakSpots = weakSpots.filter(w => 
    w.type !== "CONTRADICTION" && w.type !== "MISSING_EVIDENCE"
  );

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Leverage & Weak Spots</h3>
      </div>

      <div className="space-y-4">
        {/* Procedural Leverage */}
        {leveragePoints.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">Procedural Leverage</h4>
            <div className="space-y-2">
              {leveragePoints.slice(0, 3).map((point) => (
                <div
                  key={point.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(point.severity)}>
                      {point.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{point.description}</span>
                  </div>
                  
                  {/* How this helps you win */}
                  <div className="p-2 rounded bg-green-950/20 border border-green-800/30">
                    <p className="text-xs font-medium text-green-300 mb-1">How this helps you win:</p>
                    <p className="text-xs text-green-200/90 leading-relaxed">{point.leverage}</p>
                  </div>
                  
                  <div className="mt-2 p-2 rounded bg-cyan-950/30 border border-cyan-800/30">
                    <p className="text-xs font-medium text-cyan-300 mb-1">Tactical Steps:</p>
                    <p className="text-xs text-cyan-200/90 whitespace-pre-line leading-relaxed">{point.escalationText}</p>
                  </div>
                  
                  {point.cprRule && (
                    <div className="flex items-start gap-1.5 text-xs">
                      <span className="text-muted-foreground/70 font-medium">Legal basis:</span>
                      <span className="text-cyan-300/80">{point.cprRule}</span>
                    </div>
                  )}

                  {/* Meta Information */}
                  {point.meta && (
                    <StrategicInsightMetaDisplay meta={point.meta} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contradictions */}
        {contradictions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">Contradictions</h4>
            <div className="space-y-2">
              {contradictions.slice(0, 2).map((spot) => (
                <div
                  key={spot.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(spot.severity)}>
                      {spot.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{spot.description}</span>
                  </div>
                  
                  {/* How this helps you win */}
                  <div className="p-2 rounded bg-red-950/20 border border-red-800/30">
                    <p className="text-xs font-medium text-red-300 mb-1">How this helps you win:</p>
                    <p className="text-xs text-red-200/90 leading-relaxed">
                      {spot.impact.includes("contradiction") || spot.impact.includes("credibility")
                        ? spot.impact
                        : `This contradiction undermines their credibility and creates doubt about their version of events – use this in cross-examination to attack their reliability.`}
                    </p>
                  </div>
                  
                  {spot.suggestedAction && (
                    <div className="mt-2 p-2 rounded bg-cyan-950/30 border border-cyan-800/30">
                      <p className="text-xs font-medium text-cyan-300 mb-1">Recommended Action:</p>
                      <p className="text-xs text-cyan-200/90 leading-relaxed">{spot.suggestedAction}</p>
                    </div>
                  )}

                  {/* Meta Information */}
                  {spot.meta && (
                    <StrategicInsightMetaDisplay meta={spot.meta} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Weaknesses */}
        {missingEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">Evidence Weaknesses</h4>
            <div className="space-y-2">
              {missingEvidence.slice(0, 2).map((spot) => (
                <div
                  key={spot.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(spot.severity)}>
                      {spot.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{spot.description}</span>
                  </div>
                  
                  {/* How this helps you win */}
                  <div className="p-2 rounded bg-red-950/20 border border-red-800/30">
                    <p className="text-xs font-medium text-red-300 mb-1">How this helps you win:</p>
                    <p className="text-xs text-red-200/90 leading-relaxed">
                      {spot.impact.includes("cannot discharge") || spot.impact.includes("burden") 
                        ? spot.impact 
                        : `Without this document, they cannot discharge their burden on ${spot.description.toLowerCase()} – you can attack their case as having no credible foundation.`}
                    </p>
                  </div>
                  
                  <div className="mt-2 p-2 rounded bg-cyan-950/30 border border-cyan-800/30">
                    <p className="text-xs font-medium text-cyan-300 mb-1">Recommended Action:</p>
                    <p className="text-xs text-cyan-200/90 whitespace-pre-line leading-relaxed mb-2">{spot.suggestedAction}</p>
                    {spot.meta?.useThisTo && spot.meta.useThisTo.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-cyan-800/30">
                        <p className="text-xs font-medium text-cyan-300 mb-1">Use this to:</p>
                        <ul className="text-xs text-cyan-200/90 space-y-0.5">
                          {spot.meta.useThisTo.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Meta Information */}
                  {spot.meta && (
                    <StrategicInsightMetaDisplay meta={spot.meta} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Weak Spots */}
        {otherWeakSpots.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">Other Weaknesses</h4>
            <div className="space-y-2">
              {otherWeakSpots.slice(0, 2).map((spot) => (
                <div
                  key={spot.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(spot.severity)}>
                      {spot.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{spot.description}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{spot.impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

