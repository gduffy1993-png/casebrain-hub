"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scale, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type BailApplication = {
  grounds: string[];
  bailArguments: string[];
  conditionsProposed: string[];
  authorities: string[];
  readyToUseApplication: string;
  evidenceBasis?: string[];
  solicitorInputRequired?: string[];
};

type BailApplicationPanelProps = {
  caseId: string;
};

export function BailApplicationPanel({ caseId }: BailApplicationPanelProps) {
  const [application, setApplication] = useState<BailApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchApplication() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/criminal/${caseId}/bail-application`);
        if (!response.ok) {
          throw new Error("Failed to fetch bail application");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<BailApplication>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate application.");
          setApplication(null);
          return;
        }

        setApplication(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch bail application:", err);
        setError("Bail application not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
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
          <span>Generating bail application…</span>
        </div>
      </Card>
    );
  }

  if (error || !application) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Bail application not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Template – solicitor approval required before use.</p>
        <p className="text-xs text-muted-foreground mt-1">Do not rely without confirmation. No facts are asserted without solicitor verification.</p>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Bail Application Generator</h2>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => copyToClipboard(application.readyToUseApplication)}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Full Application
            </>
          )}
        </Button>
      </div>

      {/* Grounds */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Grounds</h3>
        <ol className="space-y-1">
          {application.grounds.map((ground, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-primary font-bold">{idx + 1}.</span>
              <span>{ground}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Arguments */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Arguments</h3>
        <div className="space-y-2">
          {application.bailArguments.map((arg, idx) => (
            <div key={idx} className="p-3 bg-muted/50 border border-border rounded text-sm">
              <span className="font-medium">{idx + 1}. </span>
              {arg}
            </div>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Conditions Proposed</h3>
        <ul className="space-y-1">
          {application.conditionsProposed.map((condition, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{condition}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Authorities */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Authorities</h3>
        <div className="space-y-1">
          {application.authorities.map((authority, idx) => (
            <div key={idx} className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
              {authority}
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Basis */}
      {application.evidenceBasis && application.evidenceBasis.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
          <h3 className="text-sm font-semibold mb-2 text-green-400">Evidence Basis</h3>
          <ul className="space-y-1">
            {application.evidenceBasis.map((item, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Solicitor Input Required */}
      {application.solicitorInputRequired && application.solicitorInputRequired.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <h3 className="text-sm font-semibold mb-2 text-amber-400">Solicitor Input Required</h3>
          <ul className="space-y-1">
            {application.solicitorInputRequired.map((item, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400">⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ready-to-Use Application */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded">
        <h3 className="text-sm font-semibold mb-2">Ready-to-Use Application (template – solicitor approval required)</h3>
        <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded border border-border max-h-96 overflow-y-auto">
          {application.readyToUseApplication}
        </pre>
      </div>
    </Card>
  );
}
