"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type KillShotStrategy = {
  primaryStrategy: {
    name: string;
    winProbability: number;
    whyThisWins: string;
    exactSteps: string[];
    readyToUseSubmissions: string[];
    crossExaminationQuestions: string[];
    fallbackStrategy: string | null;
  };
  supportingAngles: Array<{
    angle: string;
    probability: number;
    howItSupports: string;
  }>;
  combinedProbability: number;
  executionOrder: string[];
};

type KillShotPanelProps = {
  caseId: string;
};

export function KillShotPanel({ caseId }: KillShotPanelProps) {
  const [strategy, setStrategy] = useState<KillShotStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStrategy() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/criminal/${caseId}/kill-shot`);
        if (!response.ok) {
          throw new Error("Failed to fetch kill shot strategy");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<KillShotStrategy>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate strategy.");
          setStrategy(null);
          return;
        }

        setStrategy(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch kill shot strategy:", err);
        setError("Kill shot strategy not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchStrategy();
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
          <span>Generating kill shot strategy…</span>
        </div>
      </Card>
    );
  }

  if (error || !strategy) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Kill shot strategy not available yet."}
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

  return (
    <Card className="p-6 border-2 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Kill Shot Strategy</h2>
        <Badge className={`ml-auto ${getProbabilityColor(strategy.combinedProbability)}`}>
          {strategy.combinedProbability}% Win
        </Badge>
      </div>

      {/* Primary Strategy */}
      <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Primary Winning Strategy</h3>
          <Badge className={getProbabilityColor(strategy.primaryStrategy.winProbability)}>
            {strategy.primaryStrategy.winProbability}% probability
          </Badge>
        </div>
        <p className="text-sm font-medium mb-2">{strategy.primaryStrategy.name}</p>
        <p className="text-xs text-muted-foreground mb-4">{strategy.primaryStrategy.whyThisWins}</p>

        {/* Exact Steps */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">Exact Steps:</h4>
          <ol className="space-y-1 text-sm">
            {strategy.primaryStrategy.exactSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary font-bold">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Fallback */}
        {strategy.primaryStrategy.fallbackStrategy && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm">
            <span className="font-semibold">Fallback: </span>
            {strategy.primaryStrategy.fallbackStrategy}
          </div>
        )}
      </div>

      {/* Ready-to-Use Submissions */}
      {strategy.primaryStrategy.readyToUseSubmissions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Ready-to-Use Submissions:</h3>
          <div className="space-y-2">
            {strategy.primaryStrategy.readyToUseSubmissions.map((submission, idx) => (
              <div key={idx} className="p-3 bg-muted/50 border border-border rounded">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1 whitespace-pre-wrap">{submission}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(submission, `submission-${idx}`)}
                  >
                    {copied === `submission-${idx}` ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Examination Questions */}
      {strategy.primaryStrategy.crossExaminationQuestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Cross-Examination Questions:</h3>
          <div className="p-3 bg-muted/50 border border-border rounded max-h-64 overflow-y-auto">
            <ol className="space-y-2 text-sm">
              {strategy.primaryStrategy.crossExaminationQuestions.map((question, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold">{idx + 1}.</span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              copyToClipboard(
                strategy.primaryStrategy.crossExaminationQuestions.join("\n"),
                "questions"
              )
            }
          >
            {copied === "questions" ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy All Questions
              </>
            )}
          </Button>
        </div>
      )}

      {/* Execution Order */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Execution Order:</h3>
        <div className="space-y-1">
          {strategy.executionOrder.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supporting Angles */}
      {strategy.supportingAngles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Supporting Angles:</h3>
          <div className="space-y-2">
            {strategy.supportingAngles.map((angle, idx) => (
              <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{angle.angle}</span>
                  <Badge variant="secondary" className="text-xs">
                    {angle.probability}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{angle.howItSupports}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
