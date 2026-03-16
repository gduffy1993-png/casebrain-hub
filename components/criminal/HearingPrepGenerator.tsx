"use client";

/**
 * Phase 5.5 / D2: Hearing prep — structured (what to say, ask, challenge, request; disclosure to push; risks; fallbacks).
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Calendar, MessageSquare, HelpCircle, ShieldAlert, FileQuestion, FileWarning, AlertTriangle, RotateCcw } from "lucide-react";
import type { CriminalHearingPrepStructured } from "@/lib/types/casebrain";

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
  /** Outstanding disclosure items from Safety — fed into generator for disclosure-to-push and context */
  outstandingDisclosure?: string[] | null;
};

function formatStructuredForCopy(s: CriminalHearingPrepStructured): string {
  const lines: string[] = [];
  if (s.whatToSay.length) lines.push("What to say:\n" + s.whatToSay.map((x) => `• ${x}`).join("\n"));
  if (s.whatToAsk.length) lines.push("\nWhat to ask:\n" + s.whatToAsk.map((x) => `• ${x}`).join("\n"));
  if (s.whatToChallenge.length) lines.push("\nWhat to challenge:\n" + s.whatToChallenge.map((x) => `• ${x}`).join("\n"));
  if (s.whatToRequest.length) lines.push("\nWhat to request:\n" + s.whatToRequest.map((x) => `• ${x}`).join("\n"));
  if (s.disclosureToPush.length) lines.push("\nDisclosure to push:\n" + s.disclosureToPush.map((x) => `• ${x}`).join("\n"));
  if (s.risksToFlag.length) lines.push("\nRisks to flag:\n" + s.risksToFlag.map((x) => `• ${x}`).join("\n"));
  if (s.fallbacks.length) lines.push("\nFallbacks:\n" + s.fallbacks.map((x) => `• ${x}`).join("\n"));
  return lines.join("\n");
}

export function HearingPrepGenerator({
  caseId,
  planSummary,
  evidenceSummary,
  timelineSummary,
  outstandingDisclosure,
}: HearingPrepGeneratorProps) {
  const [hearingType, setHearingType] = useState("PTPH");
  const [text, setText] = useState<string | null>(null);
  const [structured, setStructured] = useState<CriminalHearingPrepStructured | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setText(null);
    setStructured(null);
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
          outstandingDisclosure: outstandingDisclosure ?? [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        if (typeof data.text === "string") setText(data.text);
        if (data.structured) setStructured(data.structured);
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
    const toCopy = structured ? formatStructuredForCopy(structured) : text;
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const hasStructured = structured && (
    structured.whatToSay.length ||
    structured.whatToAsk.length ||
    structured.whatToChallenge.length ||
    structured.whatToRequest.length ||
    structured.disclosureToPush.length ||
    structured.risksToFlag.length ||
    structured.fallbacks.length
  );

  const sections: { key: keyof CriminalHearingPrepStructured; label: string; icon: React.ReactNode }[] = [
    { key: "whatToSay", label: "What to say", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { key: "whatToAsk", label: "What to ask", icon: <HelpCircle className="h-3.5 w-3.5" /> },
    { key: "whatToChallenge", label: "What to challenge", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { key: "whatToRequest", label: "What to request", icon: <FileQuestion className="h-3.5 w-3.5" /> },
    { key: "disclosureToPush", label: "Disclosure to push", icon: <FileWarning className="h-3.5 w-3.5" /> },
    { key: "risksToFlag", label: "Risks to flag", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    { key: "fallbacks", label: "Fallbacks", icon: <RotateCcw className="h-3.5 w-3.5" /> },
  ];

  return (
    <Card className="p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Hearing prep</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Generate what to say, ask, challenge, request; disclosure to push; risks; fallbacks. Uses Strategy + Summary + Safety.
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
            "Generate"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      {hasStructured && (
        <div className="space-y-3 rounded-md border border-border/50 bg-muted/20 p-3">
          {sections.map(({ key, label, icon }) => {
            const items = structured![key];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  {icon}
                  {label}
                </p>
                <ul className="text-sm text-foreground space-y-0.5 list-disc list-inside">
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-border/50">
            <Button type="button" variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy all"}
            </Button>
            <span className="text-[11px] text-muted-foreground">Verify and adapt before use.</span>
          </div>
        </div>
      )}
      {!hasStructured && text && (
        <div className="rounded-md border border-border/50 bg-muted/30 p-3">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
            {text}
          </pre>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy and adapt"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
