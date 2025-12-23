"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type Loophole = {
  id: string;
  loopholeType: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  exploitability: "low" | "medium" | "high";
  successProbability: number | null;
  suggestedAction: string | null;
  legalArgument: string | null;
};

type LoopholesPanelProps = {
  caseId: string;
};

export function LoopholesPanel({ caseId }: LoopholesPanelProps) {
  const [loopholes, setLoopholes] = useState<Loophole[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppression, setSuppression] = useState<{ reason?: string | null } | null>(null);
  const [gatedResponse, setGatedResponse] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  useEffect(() => {
    async function fetchLoopholes() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/loopholes`);
        if (res.ok) {
          const result = await res.json();
          const normalized = normalizeApiResponse<{ loopholes: Loophole[] }>(result);
          
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
            setLoopholes([]);
            return;
          }

          const data = normalized.data || result; // Fallback to old shape
          setLoopholes(data.loopholes || []);
          if (data?.probabilitiesSuppressed) {
            setSuppression({ reason: data?.suppressionReason });
          } else {
            setSuppression(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch loopholes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLoopholes();
  }, [caseId]);

  if (loading) {
    return (
      <Card
        title="Loopholes & Weaknesses"
        description="Analyzing case for loopholes..."
        className="animate-pulse"
      >
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 border-red-500/50 text-red-400";
      case "HIGH":
        return "bg-orange-500/20 border-orange-500/50 text-orange-400";
      case "MEDIUM":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
      case "LOW":
        return "bg-blue-500/20 border-blue-500/50 text-blue-400";
      default:
        return "bg-muted border-border text-foreground";
    }
  };

  const sortedLoopholes = [...loopholes].sort((a, b) => {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <span>Loopholes & Weaknesses</span>
          {loopholes.length > 0 && (
            <Badge variant="danger" className="ml-2">
              {loopholes.length} found
            </Badge>
          )}
        </div>
      }
      description="Identified loopholes, weaknesses, and opportunities to challenge the prosecution case"
    >
      {suppression?.reason && (
        <div className="mb-3 text-xs text-muted-foreground">
          {suppression.reason}
        </div>
      )}
      {loopholes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No loopholes identified yet</p>
          <p className="text-xs mt-1">Upload case documents to begin analysis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLoopholes.map((loophole) => (
            <div
              key={loophole.id}
              className={`p-4 rounded-lg border ${getSeverityColor(loophole.severity)}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{loophole.title}</h4>
                    <Badge
                      variant={
                        loophole.severity === "CRITICAL"
                          ? "danger"
                          : loophole.severity === "HIGH"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {loophole.severity}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-80 mb-2">{loophole.description}</p>
                  {loophole.suggestedAction && (
                    <p className="text-xs font-medium mt-2">
                      💡 {loophole.suggestedAction}
                    </p>
                  )}
                </div>
              </div>
              {loophole.legalArgument && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    View Legal Argument
                  </summary>
                  <div className="mt-2 p-3 rounded bg-muted/50 border border-border">
                    <p className="text-xs whitespace-pre-wrap">{loophole.legalArgument}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(loophole.legalArgument || "");
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

