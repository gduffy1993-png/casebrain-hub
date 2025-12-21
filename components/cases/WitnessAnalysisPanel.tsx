"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type WitnessCredibilityAttack = {
  witness: string;
  attacks: Array<{
    type: string;
    description: string;
    questions: string[];
    underminingStrategy: string;
  }>;
  readyToUseQuestions: string[];
  overallStrategy: string;
};

type WitnessAnalysis = {
  witnesses: WitnessCredibilityAttack[];
  topTargets: string[];
};

type WitnessAnalysisPanelProps = {
  caseId: string;
};

export function WitnessAnalysisPanel({ caseId }: WitnessAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<WitnessAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/witness-analysis`);
        if (!response.ok) {
          throw new Error("Failed to fetch witness analysis");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<WitnessAnalysis>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate analysis.");
          setAnalysis(null);
          return;
        }

        setAnalysis(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch witness analysis:", err);
        setError("Witness analysis not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
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
          <span>Analyzing witnesses…</span>
        </div>
      </Card>
    );
  }

  if (error || !analysis) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Witness analysis not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Witness Destroyer</h2>
        {analysis.topTargets.length > 0 && (
          <Badge variant="danger" className="ml-auto">
            {analysis.topTargets.length} priority targets
          </Badge>
        )}
      </div>

      {analysis.witnesses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No witnesses identified yet</p>
          <p className="text-xs mt-1">Upload case documents to begin analysis</p>
        </div>
      ) : (
        <div className="space-y-4">
          {analysis.witnesses.map((witness, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                analysis.topTargets.includes(witness.witness)
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-muted/30 border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{witness.witness}</h3>
                  {analysis.topTargets.includes(witness.witness) && (
                    <Badge variant="danger" className="text-xs">Priority Target</Badge>
                  )}
                </div>
              </div>

              {/* Attacks */}
              <div className="mb-3">
                <h4 className="text-sm font-medium mb-2">Credibility Attacks:</h4>
                <div className="space-y-2">
                  {witness.attacks.map((attack, attackIdx) => (
                    <div key={attackIdx} className="p-2 bg-muted/50 rounded text-sm">
                      <div className="font-medium mb-1">{attack.description}</div>
                      <div className="text-xs text-muted-foreground">{attack.underminingStrategy}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ready-to-Use Questions */}
              {witness.readyToUseQuestions.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-2">Ready-to-Use Questions:</h4>
                  <div className="p-3 bg-muted/50 border border-border rounded max-h-48 overflow-y-auto">
                    <ol className="space-y-1 text-sm">
                      {witness.readyToUseQuestions.map((question, qIdx) => (
                        <li key={qIdx} className="flex items-start gap-2">
                          <span className="text-primary font-bold">{qIdx + 1}.</span>
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
                      copyToClipboard(witness.readyToUseQuestions.join("\n"), `witness-${idx}`)
                    }
                  >
                    {copied === `witness-${idx}` ? (
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

              {/* Overall Strategy */}
              <div className="mt-3 p-2 bg-primary/10 border border-primary/30 rounded text-sm">
                <span className="font-medium">Strategy: </span>
                {witness.overallStrategy}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
