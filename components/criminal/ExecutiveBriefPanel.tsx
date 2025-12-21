"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, AlertTriangle, CheckCircle, Calendar, Gavel } from "lucide-react";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";
import { AnalysisGateBanner } from "@/components/AnalysisGateBanner";

type ExecutiveBrief = {
  caseInfo: {
    caseTitle: string;
    charge: string;
    court: string;
    hearingDate: string | null;
  };
  winningAngle: {
    strategy: string;
    winProbability: number;
    whyThisWins: string;
  };
  criticalWeakness: {
    weakness: string;
    attackPoint: string;
  };
  keyFacts: string[];
  redFlags: Array<{
    type: "PACE_BREACH" | "DISCLOSURE_GAP" | "EVIDENCE_ISSUE" | "OTHER";
    description: string;
  }>;
  actionItems: Array<{
    priority: "CRITICAL" | "HIGH" | "MEDIUM";
    action: string;
  }>;
};

type ExecutiveBriefPanelProps = {
  caseId: string;
};

export function ExecutiveBriefPanel({ caseId }: ExecutiveBriefPanelProps) {
  const [brief, setBrief] = useState<ExecutiveBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatedResponse, setGatedResponse] = useState<any>(null);

  useEffect(() => {
    async function fetchBrief() {
      try {
        setLoading(true);
        setError(null);
        setGatedResponse(null);

        const response = await fetch(`/api/criminal/${caseId}/executive-brief`);
        if (!response.ok) {
          throw new Error("Failed to fetch executive brief");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<ExecutiveBrief>(result);

        if (isGated(normalized)) {
          setGatedResponse(normalized);
          setBrief(null);
          return;
        }

        setBrief(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch executive brief:", err);
        setError("Executive brief not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchBrief();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating executive brief…</span>
        </div>
      </Card>
    );
  }

  if (gatedResponse) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Analysis unavailable. {gatedResponse.banner?.message || "Not enough extractable text to generate reliable analysis."}
        </p>
      </Card>
    );
  }

  if (error || !brief) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Executive brief not available yet."}
        </p>
      </Card>
    );
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "text-green-400";
    if (prob >= 50) return "text-yellow-400";
    if (prob >= 30) return "text-orange-400";
    return "text-red-400";
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "CRITICAL") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (priority === "HIGH") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const getRedFlagIcon = (type: string) => {
    if (type === "PACE_BREACH") return "🚨";
    if (type === "DISCLOSURE_GAP") return "📋";
    if (type === "EVIDENCE_ISSUE") return "🔍";
    return "⚠️";
  };

  return (
    <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Executive Brief</h2>
        <Badge variant="outline" className="ml-auto">30-Minute Court Prep</Badge>
      </div>

      {/* Case Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{brief.caseInfo.caseTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{brief.caseInfo.court}</span>
        </div>
        <div className="col-span-2">
          <span className="text-sm font-medium">Charge: </span>
          <span className="text-sm">{brief.caseInfo.charge}</span>
        </div>
        {brief.caseInfo.hearingDate && (
          <div className="col-span-2 text-xs text-muted-foreground">
            Next hearing: {new Date(brief.caseInfo.hearingDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Winning Angle */}
      <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold">Winning Angle</span>
          </div>
          <Badge className={getProbabilityColor(brief.winningAngle.winProbability)}>
            {brief.winningAngle.winProbability}% Win
          </Badge>
        </div>
        <p className="text-sm font-medium mb-1">{brief.winningAngle.strategy}</p>
        <p className="text-xs text-muted-foreground">{brief.winningAngle.whyThisWins}</p>
      </div>

      {/* Critical Weakness */}
      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="font-semibold text-red-400">Critical Weakness</span>
        </div>
        <p className="text-sm font-medium mb-1">{brief.criticalWeakness.weakness}</p>
        <p className="text-xs text-muted-foreground">🔥 Attack: {brief.criticalWeakness.attackPoint}</p>
      </div>

      {/* Key Facts */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Key Facts</h3>
        <ul className="space-y-1">
          {brief.keyFacts.map((fact, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Red Flags */}
      {brief.redFlags.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Red Flags</h3>
          <div className="space-y-2">
            {brief.redFlags.map((flag, idx) => (
              <div key={idx} className="text-sm p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                <span className="mr-2">{getRedFlagIcon(flag.type)}</span>
                <span>{flag.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Action Items</h3>
        <div className="space-y-2">
          {brief.actionItems.map((item, idx) => (
            <div
              key={idx}
              className={`text-sm p-2 rounded border ${getPriorityColor(item.priority)}`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span className="font-medium">{item.priority}:</span>
                <span>{item.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
