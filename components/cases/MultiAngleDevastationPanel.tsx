"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type MultiAngleDevastation = {
  angles: Array<{
    angle: string;
    probability: number;
    howItSupports: string;
  }>;
  combinedAttack: string;
  winProbability: number;
  readyToUseCombinedSubmission: string;
  evidenceStrengthWarnings?: string[];
  evidenceStrength?: number;
  realisticOutcome?: string;
};

type MultiAngleDevastationPanelProps = {
  caseId: string;
};

export function MultiAngleDevastationPanel({ caseId }: MultiAngleDevastationPanelProps) {
  const [devastation, setDevastation] = useState<MultiAngleDevastation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchDevastation() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/multi-angle-devastation`);
        if (!response.ok) {
          throw new Error("Failed to fetch multi-angle devastation");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<MultiAngleDevastation>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate analysis.");
          setDevastation(null);
          return;
        }

        setDevastation(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch multi-angle devastation:", err);
        setError("Multi-angle devastation not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchDevastation();
  }, [caseId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Planning multi-angle devastation…</span>
        </div>
      </Card>
    );
  }

  if (error || !devastation) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Multi-angle devastation not available yet."}
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
    <>
      {/* Evidence Strength Warnings */}
      {devastation?.evidenceStrengthWarnings && devastation.evidenceStrengthWarnings.length > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="font-semibold">Professional Judgment Warnings</span>
          </div>
          <ul className="space-y-1">
            {devastation.evidenceStrengthWarnings.map((warning, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
          {devastation.realisticOutcome && (
            <div className="mt-2 pt-2 border-t border-amber-500/20">
              <p className="text-sm text-muted-foreground">
                <strong>Realistic Outcome:</strong> {devastation.realisticOutcome}
              </p>
            </div>
          )}
        </div>
      )}

      <Card className="p-6 border-2 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Multi-Angle Devastation</h2>
        <Badge className={getProbabilityColor(devastation.winProbability)}>
          {devastation.winProbability}% Combined Win
        </Badge>
      </div>

      {/* Combined Attack */}
      <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Combined Attack Strategy</h3>
        <p className="text-sm">{devastation.combinedAttack}</p>
      </div>

      {/* Angles */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Angles to Combine</h3>
        <div className="space-y-2">
          {devastation.angles.map((angle, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/30"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{angle.angle}</span>
                <Badge variant="secondary" className={getProbabilityColor(angle.probability)}>
                  {angle.probability}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{angle.howItSupports}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ready-to-Use Combined Submission */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded">
        <h3 className="text-sm font-semibold mb-2">Ready-to-Use Combined Submission</h3>
        <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded border border-border max-h-96 overflow-y-auto">
          {devastation.readyToUseCombinedSubmission}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => copyToClipboard(devastation.readyToUseCombinedSubmission)}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Combined Submission
            </>
          )}
        </Button>
      </div>
    </Card>
    </>
  );
}
