"use client";

/**
 * Phase 5.5: Generate a hearing prep checklist (PTPH, trial, etc.).
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Calendar } from "lucide-react";

const HEARING_TYPES = [
  { value: "PTPH", label: "PTPH" },
  { value: "trial", label: "Trial" },
  { value: "case_management", label: "Case management" },
  { value: "disclosure_directions", label: "Disclosure directions" },
  { value: "sentencing", label: "Sentencing" },
];

type HearingPrepGeneratorProps = {
  caseId: string;
  planSummary?: string | null;
  evidenceSummary?: string | null;
  timelineSummary?: string | null;
};

export function HearingPrepGenerator({
  caseId,
  planSummary,
  evidenceSummary,
  timelineSummary,
}: HearingPrepGeneratorProps) {
  const [hearingType, setHearingType] = useState("PTPH");
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setText(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/hearing-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hearingType,
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
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Hearing prep checklist</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Generate a checklist for the selected hearing type. Verify and adapt before use.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={hearingType}
          onChange={(e) => setHearingType(e.target.value)}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {HEARING_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate checklist"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      {text && (
        <div className="rounded-md border border-border/50 bg-muted/30 p-3">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
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
