"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Copy } from "lucide-react";

type FirstDisclosureRequestCardProps = { caseId: string };

export function FirstDisclosureRequestCard({ caseId }: FirstDisclosureRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDraft = async () => {
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/letters/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: "initial_disclosure_request" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.subject && data?.body) setDraft({ subject: data.subject, body: data.body });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!draft) return;
    const text = `Subject: ${draft.subject}\n\n${draft.body}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Request initial disclosure
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        One-click draft for a letter/email requesting initial disclosure (CPIA). Edit as needed before sending.
      </p>
      {!draft ? (
        <Button variant="outline" size="sm" onClick={fetchDraft} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
          Generate draft
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="rounded border border-border bg-muted/20 p-3 text-xs overflow-auto max-h-48">
            <p className="font-medium text-foreground mb-1">{draft.subject}</p>
            <pre className="whitespace-pre-wrap text-muted-foreground font-sans">{draft.body}</pre>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-3 w-3 mr-1" />
              {copied ? "Copied" : "Copy to clipboard"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              New draft
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
