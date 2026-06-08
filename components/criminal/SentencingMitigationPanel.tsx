"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scale, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type SentencingMitigation = {
  personalMitigation: string[];
  legalMitigation: string[];
  reductionFactors: string[];
  readyToUseSubmission: string;
  authorities: string[];
};

type SentencingMitigationPanelProps = {
  caseId: string;
};

export function SentencingMitigationPanel({ caseId }: SentencingMitigationPanelProps) {
  const [mitigation, setMitigation] = useState<SentencingMitigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchMitigation() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/criminal/${caseId}/sentencing-mitigation`);
        if (!response.ok) {
          throw new Error("Failed to fetch sentencing mitigation");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<SentencingMitigation>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate mitigation.");
          setMitigation(null);
          return;
        }

        setMitigation(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch sentencing mitigation:", err);
        setError("Sentencing mitigation not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchMitigation();
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
          <span>Generating sentencing mitigation…</span>
        </div>
      </Card>
    );
  }

  if (error || !mitigation) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Sentencing mitigation not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Sentencing Mitigation Generator</h2>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => copyToClipboard(mitigation.readyToUseSubmission)}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Full Submission
            </>
          )}
        </Button>
      </div>

      {/* Personal Mitigation */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Personal Mitigation</h3>
        <ul className="space-y-1">
          {mitigation.personalMitigation.map((item, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Legal Mitigation */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Legal Mitigation</h3>
        <ul className="space-y-1">
          {mitigation.legalMitigation.map((item, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reduction Factors */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Reduction Factors</h3>
        <ul className="space-y-1">
          {mitigation.reductionFactors.map((factor, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Authorities */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Authorities</h3>
        <div className="space-y-1">
          {mitigation.authorities.map((authority, idx) => (
            <div key={idx} className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
              {authority}
            </div>
          ))}
        </div>
      </div>

      {/* Ready-to-Use Submission */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded">
        <h3 className="text-sm font-semibold mb-2">Ready-to-Use Submission</h3>
        <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded border border-border max-h-96 overflow-y-auto">
          {mitigation.readyToUseSubmission}
        </pre>
      </div>
    </Card>
  );
}
