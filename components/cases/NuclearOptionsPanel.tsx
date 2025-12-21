"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bomb, AlertTriangle, Copy, CheckCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type NuclearOption = {
  option: string;
  risk: "HIGH" | "VERY_HIGH" | "EXTREME";
  reward: string;
  whenToUse: string;
  riskRewardAnalysis: string;
  readyToUseSubmission: string;
  authorities: string[];
};

type NuclearOptions = {
  options: NuclearOption[];
  recommended: NuclearOption | null;
  warnings: string[];
};

type NuclearOptionsPanelProps = {
  caseId: string;
};

export function NuclearOptionsPanel({ caseId }: NuclearOptionsPanelProps) {
  const [nuclear, setNuclear] = useState<NuclearOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNuclear() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/nuclear-options`);
        if (!response.ok) {
          throw new Error("Failed to fetch nuclear options");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<NuclearOptions>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate nuclear options.");
          setNuclear(null);
          return;
        }

        setNuclear(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch nuclear options:", err);
        setError("Nuclear options not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchNuclear();
  }, [caseId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Finding nuclear options…</span>
        </div>
      </Card>
    );
  }

  if (error || !nuclear) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Nuclear options not available yet."}
        </p>
      </Card>
    );
  }

  const getRiskColor = (risk: string) => {
    if (risk === "EXTREME") return "bg-red-500/20 border-red-500/50 text-red-400";
    if (risk === "VERY_HIGH") return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
  };

  const getRewardColor = (reward: string) => {
    if (reward.includes("DISMISSED") || reward.includes("STAY")) return "text-green-400";
    if (reward.includes("EXCLUDED")) return "text-yellow-400";
    return "text-blue-400";
  };

  return (
    <Card className="p-6 border-2 border-red-500/20 bg-gradient-to-br from-background to-red-500/5">
      <div className="flex items-center gap-2 mb-4">
        <Bomb className="h-5 w-5 text-red-400" />
        <h2 className="text-xl font-bold">Nuclear Options</h2>
        <Badge variant="danger" className="ml-auto">EXTREME TACTICS</Badge>
      </div>

      {/* Warnings */}
      {nuclear.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="font-semibold text-sm">Warnings</span>
          </div>
          <ul className="space-y-1 text-xs">
            {nuclear.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Option */}
      {nuclear.recommended && (
        <div className="mb-4 p-4 bg-primary/10 border-2 border-primary/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-semibold">Recommended Nuclear Option</span>
            </div>
            <Badge className={getRewardColor(nuclear.recommended.reward)}>
              {nuclear.recommended.reward}
            </Badge>
          </div>
          <h3 className="font-bold mb-2">{nuclear.recommended.option}</h3>
          <div className={`p-2 rounded mb-2 ${getRiskColor(nuclear.recommended.risk)}`}>
            <span className="font-medium">Risk: </span>
            {nuclear.recommended.risk} | <span className="font-medium">Reward: </span>
            <span className={getRewardColor(nuclear.recommended.reward)}>
              {nuclear.recommended.reward}
            </span>
          </div>
          <p className="text-sm mb-2">
            <span className="font-medium">When to use: </span>
            {nuclear.recommended.whenToUse}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {nuclear.recommended.riskRewardAnalysis}
          </p>
          <div className="p-3 bg-background/50 border border-border rounded mb-2">
            <pre className="text-xs whitespace-pre-wrap">
              {nuclear.recommended.readyToUseSubmission}
            </pre>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(nuclear.recommended!.readyToUseSubmission, "recommended")}
          >
            {copied === "recommended" ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Submission
              </>
            )}
          </Button>
        </div>
      )}

      {/* All Options */}
      {nuclear.options.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">All Nuclear Options</h3>
          <div className="space-y-3">
            {nuclear.options.map((option, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${getRiskColor(option.risk)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{option.option}</h4>
                  <Badge className={getRewardColor(option.reward)}>{option.reward}</Badge>
                </div>
                <div className="text-xs mb-2">
                  <span className="font-medium">Risk: </span>
                  {option.risk} | <span className="font-medium">When: </span>
                  {option.whenToUse}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{option.riskRewardAnalysis}</p>
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    View Ready-to-Use Submission
                  </summary>
                  <div className="mt-2 p-3 bg-background/50 border border-border rounded">
                    <pre className="text-xs whitespace-pre-wrap">{option.readyToUseSubmission}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard(option.readyToUseSubmission, `option-${idx}`)}
                    >
                      {copied === `option-${idx}` ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
