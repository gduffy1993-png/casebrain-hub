"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Skull, Target, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type CaseElement = {
  element: string;
  currentStrength: number;
  attackPlan: string[];
  result: string;
  readyToUseAttacks: string[];
};

type CaseDestroyer = {
  elements: CaseElement[];
  overallStrength: number;
  destructionSequence: string[];
  readyToUseCombinedAttack: string;
};

type CaseDestroyerPanelProps = {
  caseId: string;
};

export function CaseDestroyerPanel({ caseId }: CaseDestroyerPanelProps) {
  const [destroyer, setDestroyer] = useState<CaseDestroyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchDestroyer() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/case-destroyer`);
        if (!response.ok) {
          throw new Error("Failed to fetch case destroyer");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<CaseDestroyer>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate analysis.");
          setDestroyer(null);
          return;
        }

        setDestroyer(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch case destroyer:", err);
        setError("Case destroyer not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchDestroyer();
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
          <span>Analyzing case for destruction plan…</span>
        </div>
      </Card>
    );
  }

  if (error || !destroyer) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Case destroyer not available yet."}
        </p>
      </Card>
    );
  }

  const getStrengthColor = (strength: number) => {
    if (strength < 30) return "text-green-400";
    if (strength < 50) return "text-yellow-400";
    if (strength < 70) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <Card className="p-6 border-2 border-red-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Skull className="h-5 w-5 text-red-400" />
        <h2 className="text-xl font-bold">Prosecution Case Destroyer</h2>
        <Badge className={getStrengthColor(destroyer.overallStrength)}>
          {destroyer.overallStrength}% Strength
        </Badge>
      </div>

      {/* Overall Strength */}
      <div className="mb-4 p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Overall Case Strength:</span>
          <Badge className={getStrengthColor(destroyer.overallStrength)} variant="secondary">
            {destroyer.overallStrength}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {destroyer.overallStrength < 30
            ? "No case to answer / Not guilty"
            : destroyer.overallStrength < 50
              ? "Very weak case"
              : "Weak case"}
        </p>
      </div>

      {/* Case Elements */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Case Elements (Destroy These)</h3>
        <div className="space-y-3">
          {destroyer.elements.map((element, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border bg-muted/30 border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{element.element}</h4>
                <Badge className={getStrengthColor(element.currentStrength)}>
                  {element.currentStrength}% strength
                </Badge>
              </div>
              <div className="text-sm mb-2">
                <span className="font-medium">Attack Plan:</span>
                <ol className="ml-4 mt-1 space-y-1">
                  {element.attackPlan.map((step, stepIdx) => (
                    <li key={stepIdx} className="flex items-start gap-2">
                      <span className="text-primary">{stepIdx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="text-sm mb-2">
                <span className="font-medium">Result: </span>
                <span className="text-green-400">{element.result}</span>
              </div>
              {element.readyToUseAttacks.length > 0 && (
                <div className="text-xs bg-background/50 p-2 rounded border border-border">
                  <span className="font-medium">Ready-to-Use: </span>
                  {element.readyToUseAttacks[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Destruction Sequence */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Destruction Sequence</h3>
        <div className="space-y-1">
          {destroyer.destructionSequence.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-red-500/10 border border-red-500/30 rounded">
              <Target className="h-4 w-4 text-red-400 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Combined Attack */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded">
        <h3 className="text-sm font-semibold mb-2">Ready-to-Use Combined Attack</h3>
        <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded border border-border max-h-96 overflow-y-auto">
          {destroyer.readyToUseCombinedAttack}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => copyToClipboard(destroyer.readyToUseCombinedAttack)}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Combined Attack
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
