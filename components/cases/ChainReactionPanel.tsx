"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ArrowDown, Copy, CheckCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type ChainReaction = {
  triggerPoint: string;
  chain: Array<{
    step: number;
    action: string;
    result: string;
  }>;
  finalOutcome: string;
  exploitationPlan: string[];
  readyToUseSequence: string;
};

type ChainReactionPanelProps = {
  caseId: string;
};

export function ChainReactionPanel({ caseId }: ChainReactionPanelProps) {
  const [reaction, setReaction] = useState<ChainReaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchReaction() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/chain-reaction`);
        if (!response.ok) {
          throw new Error("Failed to fetch chain reaction");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<ChainReaction>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate analysis.");
          setReaction(null);
          return;
        }

        setReaction(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch chain reaction:", err);
        setError("Chain reaction not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchReaction();
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
          <span>Finding chain reaction…</span>
        </div>
      </Card>
    );
  }

  if (error || !reaction) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Chain reaction not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-yellow-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-yellow-400" />
        <h2 className="text-xl font-bold">Chain Reaction Exploiter</h2>
        <Badge variant="warning" className="ml-auto">DOMINO EFFECT</Badge>
      </div>

      {/* Trigger Point */}
      <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="font-semibold">Trigger Point</span>
        </div>
        <p className="text-sm font-medium">{reaction.triggerPoint}</p>
      </div>

      {/* Chain */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Chain Reaction</h3>
        <div className="space-y-2">
          {reaction.chain.map((link, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                  {link.step}
                </div>
                {idx < reaction.chain.length - 1 && (
                  <ArrowDown className="h-4 w-4 text-primary my-1" />
                )}
              </div>
              <div className="flex-1 p-3 bg-muted/30 border border-border rounded">
                <div className="font-medium text-sm mb-1">{link.action}</div>
                <div className="text-xs text-muted-foreground">→ {link.result}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Outcome */}
      <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-green-400" />
          <span className="font-semibold">Final Outcome</span>
        </div>
        <p className="text-sm font-medium text-green-400">{reaction.finalOutcome}</p>
      </div>

      {/* Exploitation Plan */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Exploitation Plan</h3>
        <div className="space-y-1">
          {reaction.exploitationPlan.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
              <span className="text-primary font-bold">{idx + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ready-to-Use Sequence */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded">
        <h3 className="text-sm font-semibold mb-2">Ready-to-Use Sequence</h3>
        <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded border border-border max-h-96 overflow-y-auto">
          {reaction.readyToUseSequence}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => copyToClipboard(reaction.readyToUseSequence)}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Sequence
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
