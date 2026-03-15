"use client";

/**
 * Phase 5.4: Generate a draft disclosure request from case context + CPIA.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, FileText } from "lucide-react";

type DisclosureRequestGeneratorProps = {
  caseId: string;
  planSummary?: string | null;
  evidenceSummary?: string | null;
  timelineSummary?: string | null;
};

export function DisclosureRequestGenerator({
  caseId,
  planSummary,
  evidenceSummary,
  timelineSummary,
}: DisclosureRequestGeneratorProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setText(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/disclosure-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planSummary: planSummary ?? "",
          evidenceSummary: evidenceSummary ?? "",
          timelineSummary: timelineSummary ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && typeof data.text === "string") {
        setText(data.text);
      } else {
        setError(data.error ?? "Failed to generate");
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Generate disclosure request</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Draft a disclosure request based on this case’s plan, evidence and CPIA. Verify and adapt before use.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className="mb-3"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            Generating…
          </>
        ) : (
          "Generate draft"
        )}
      </Button>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      {text && (
        <div className="rounded-md border border-border/50 bg-muted/30 p-3">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
            {text}
          </pre>
          <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
    </Card>
  );
}
