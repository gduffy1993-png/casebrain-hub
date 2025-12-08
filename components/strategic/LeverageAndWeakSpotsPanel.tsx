"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Search } from "lucide-react";

type LeveragePoint = {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  suggestedEscalation: string;
  escalationText: string;
  leverage: string;
};

type WeakSpot = {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  impact: string;
  suggestedAction: string;
};

type LeverageAndWeakSpotsPanelProps = {
  caseId: string;
};

export function LeverageAndWeakSpotsPanel({ caseId }: LeverageAndWeakSpotsPanelProps) {
  const [leveragePoints, setLeveragePoints] = useState<LeveragePoint[]>([]);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [leverageRes, weakSpotsRes] = await Promise.all([
          fetch(`/api/strategic/${caseId}/leverage`),
          fetch(`/api/strategic/${caseId}/weak-spots`),
        ]);

        if (!leverageRes.ok || !weakSpotsRes.ok) {
          throw new Error("Failed to fetch leverage or weak spots");
        }

        const [leverageData, weakSpotsData] = await Promise.all([
          leverageRes.json(),
          weakSpotsRes.json(),
        ]);

        setLeveragePoints(leverageData.leveragePoints || []);
        setWeakSpots(weakSpotsData.weakSpots || []);
      } catch (err) {
        console.error("Failed to fetch leverage/weak spots:", err);
        setError("No leverage points or weak spots available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

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
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(point.severity)}>
                      {point.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{point.description}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{point.leverage}</p>
                  <p className="text-xs text-cyan-400">{point.escalationText}</p>
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

        {/* Evidence Weaknesses */}
        {missingEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">Evidence Weaknesses</h4>
            <div className="space-y-2">
              {missingEvidence.slice(0, 2).map((spot) => (
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
                  <p className="text-xs text-cyan-400">{spot.suggestedAction}</p>
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

