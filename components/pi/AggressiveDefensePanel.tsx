"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, AlertTriangle, BookOpen, MessageSquare, FileText } from "lucide-react";

type DefenseAngle = {
  id: string;
  angleType: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  winProbability: number;
  whyThisMatters: string;
  legalBasis: string;
  caseLaw: string[];
  opponentWeakness: string;
  howToExploit: string;
  specificArguments: string[];
  crossExaminationPoints: string[];
  submissions: string[];
  ifSuccessful: string;
  ifUnsuccessful: string;
  combinedWith: string[];
  evidenceNeeded: string[];
  disclosureRequests: string[];
};

type AggressiveDefenseAnalysis = {
  overallWinProbability: number;
  criticalAngles: DefenseAngle[];
  allAngles: DefenseAngle[];
  recommendedStrategy: {
    primaryAngle: DefenseAngle;
    supportingAngles: DefenseAngle[];
    combinedProbability: number;
    tacticalPlan: string[];
  };
  opponentVulnerabilities: {
    criticalWeaknesses: string[];
    evidenceGaps: string[];
    proceduralErrors: string[];
  };
};

type AggressiveDefensePanelProps = {
  caseId: string;
};

export function AggressiveDefensePanel({ caseId }: AggressiveDefensePanelProps) {
  const [analysis, setAnalysis] = useState<AggressiveDefenseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAngle, setExpandedAngle] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/pi/${caseId}/aggressive-defense`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch aggressive defense analysis");
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (err) {
        console.error("Failed to fetch aggressive defense analysis:", err);
        setError("Aggressive defense analysis not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing every possible defense angle…</span>
        </div>
      </Card>
    );
  }

  if (error || !analysis) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Aggressive defense analysis not available yet."}
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
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getWinProbabilityColor = (probability: number) => {
    if (probability >= 80) return "text-green-400";
    if (probability >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Aggressive Defense Analysis</h3>
        </div>
        <Badge className={`${getWinProbabilityColor(analysis.overallWinProbability)} bg-${getWinProbabilityColor(analysis.overallWinProbability).replace('text-', '')}/20 border-${getWinProbabilityColor(analysis.overallWinProbability).replace('text-', '')}/30`}>
          {analysis.overallWinProbability}% Win Probability
        </Badge>
      </div>

      {/* Overall Win Probability */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className={`text-2xl font-bold ${getWinProbabilityColor(analysis.overallWinProbability)}`}>
            {analysis.overallWinProbability}%
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Overall Win Probability</p>
            <p className="text-xs text-muted-foreground">
              Based on {analysis.allAngles.length} defense angles identified
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Strategy */}
      {analysis.recommendedStrategy && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-foreground">Recommended Strategy</h4>
          </div>
          <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-800/30 space-y-3">
            <div>
              <p className="text-sm font-medium text-cyan-300 mb-1">
                Primary Angle: {analysis.recommendedStrategy.primaryAngle.title}
              </p>
              <p className="text-xs text-cyan-200/90">
                Win Probability: {analysis.recommendedStrategy.primaryAngle.winProbability}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-cyan-300">Tactical Plan:</p>
              <div className="text-xs text-cyan-200/90 space-y-1 whitespace-pre-line">
                {analysis.recommendedStrategy.tacticalPlan.map((step, idx) => (
                  <div key={idx}>{step}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Defense Angles */}
      {analysis.criticalAngles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Critical Defense Angles</h4>
          </div>
          <div className="space-y-3">
            {analysis.criticalAngles.map((angle) => (
              <div
                key={angle.id}
                className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(angle.severity)}>
                        {angle.severity}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{angle.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${getWinProbabilityColor(angle.winProbability)}`}>
                        {angle.winProbability}% Win Chance
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedAngle(expandedAngle === angle.id ? null : angle.id)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {expandedAngle === angle.id ? "Collapse" : "Expand"}
                  </button>
                </div>

                {expandedAngle === angle.id && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    {/* Why This Matters */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Why This Matters:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{angle.whyThisMatters}</p>
                    </div>

                    {/* Legal Basis */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Legal Basis:
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{angle.legalBasis}</p>
                    </div>

                    {/* Case Law */}
                    {angle.caseLaw.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Case Law:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {angle.caseLaw.map((caseLaw, idx) => (
                            <li key={idx}>• {caseLaw}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Opponent Weakness */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Opponent Weakness:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{angle.opponentWeakness}</p>
                    </div>

                    {/* How To Exploit */}
                    <div className="p-3 rounded bg-cyan-950/30 border border-cyan-800/30">
                      <p className="text-xs font-medium text-cyan-300 mb-2">How To Exploit:</p>
                      <div className="text-xs text-cyan-200/90 whitespace-pre-line leading-relaxed">
                        {angle.howToExploit}
                      </div>
                    </div>

                    {/* Specific Arguments */}
                    {angle.specificArguments.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Ready-to-Use Arguments:
                        </p>
                        <div className="space-y-2">
                          {angle.specificArguments.map((arg, idx) => (
                            <div key={idx} className="p-2 rounded bg-muted/50 border border-border/30">
                              <p className="text-xs text-muted-foreground leading-relaxed">{arg}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cross-Examination Points */}
                    {angle.crossExaminationPoints.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Cross-Examination Questions:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {angle.crossExaminationPoints.map((q, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-cyan-400 mt-0.5">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* If Successful */}
                    <div className="p-2 rounded bg-green-950/30 border border-green-800/30">
                      <p className="text-xs font-medium text-green-300 mb-1">If Successful:</p>
                      <p className="text-xs text-green-200/90">{angle.ifSuccessful}</p>
                    </div>

                    {/* If Unsuccessful */}
                    <div className="p-2 rounded bg-amber-950/30 border border-amber-800/30">
                      <p className="text-xs font-medium text-amber-300 mb-1">If Unsuccessful:</p>
                      <p className="text-xs text-amber-200/90">{angle.ifUnsuccessful}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opponent Vulnerabilities */}
      {analysis.opponentVulnerabilities && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h4 className="text-sm font-semibold text-foreground">Opponent Vulnerabilities</h4>
          </div>
          <div className="p-4 rounded-lg bg-red-950/20 border border-red-800/30 space-y-2">
            {analysis.opponentVulnerabilities.criticalWeaknesses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-300 mb-1">Critical Weaknesses:</p>
                <ul className="text-xs text-red-200/90 space-y-0.5">
                  {analysis.opponentVulnerabilities.criticalWeaknesses.map((weakness, idx) => (
                    <li key={idx}>• {weakness}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.opponentVulnerabilities.evidenceGaps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-300 mb-1">Evidence Gaps:</p>
                <ul className="text-xs text-red-200/90 space-y-0.5">
                  {analysis.opponentVulnerabilities.evidenceGaps.map((gap, idx) => (
                    <li key={idx}>• {gap}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.opponentVulnerabilities.proceduralErrors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-300 mb-1">Procedural Errors:</p>
                <ul className="text-xs text-red-200/90 space-y-0.5">
                  {analysis.opponentVulnerabilities.proceduralErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

