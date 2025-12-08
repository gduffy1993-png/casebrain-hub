"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";

type EvidenceAnalysisPanelProps = {
  caseId: string;
};

type EvidenceAnalysis = {
  prosecutionStrength: number;
  defenseStrength: number;
  prosecutionEvidence: Array<{
    type: string;
    title: string;
    strength: number;
  }>;
  defenseEvidence: Array<{
    type: string;
    title: string;
    strength: number;
  }>;
};

export function EvidenceAnalysisPanel({ caseId }: EvidenceAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<EvidenceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/evidence-analysis`);
        if (res.ok) {
          const result = await res.json();
          setAnalysis(result);
        }
      } catch (error) {
        console.error("Failed to fetch evidence analysis:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Evidence Analysis" description="Analyzing evidence..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card title="Evidence Analysis" description="Evidence analysis unavailable">
        <div className="text-center py-4 text-muted-foreground text-sm">
          No evidence data available
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span>Evidence Analysis</span>
        </div>
      }
      description="Prosecution vs Defense evidence strength comparison"
    >
      <div className="space-y-6">
        {/* Overall Strength Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Prosecution</span>
              <Badge
                variant={
                  analysis.prosecutionStrength >= 70
                    ? "danger"
                    : analysis.prosecutionStrength >= 40
                      ? "warning"
                      : "success"
                }
              >
                {analysis.prosecutionStrength}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-full ${
                  analysis.prosecutionStrength >= 70
                    ? "bg-red-500"
                    : analysis.prosecutionStrength >= 40
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${analysis.prosecutionStrength}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis.prosecutionStrength >= 70
                ? "STRONG ⚠️"
                : analysis.prosecutionStrength >= 40
                  ? "MODERATE"
                  : "WEAK ✅"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Defense</span>
              <Badge
                variant={
                  analysis.defenseStrength >= 70
                    ? "success"
                    : analysis.defenseStrength >= 40
                      ? "warning"
                      : "danger"
                }
              >
                {analysis.defenseStrength}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-full ${
                  analysis.defenseStrength >= 70
                    ? "bg-green-500"
                    : analysis.defenseStrength >= 40
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${analysis.defenseStrength}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis.defenseStrength >= 70
                ? "STRONG ✅"
                : analysis.defenseStrength >= 40
                  ? "MODERATE"
                  : "WEAK ⚠️"}
            </p>
          </div>
        </div>

        {/* Evidence Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <h4 className="text-sm font-semibold mb-2">Prosecution Evidence</h4>
            <div className="space-y-2">
              {analysis.prosecutionEvidence.map((evidence, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{evidence.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {evidence.strength}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Defense Evidence</h4>
            <div className="space-y-2">
              {analysis.defenseEvidence.map((evidence, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{evidence.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {evidence.strength}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

