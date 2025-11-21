"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { Copy, Check } from "lucide-react";

export function ConditionalPortalShare({ caseId }: { caseId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pushToast = useToast((state) => state.push);

  const createLink = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/portal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create portal link");
      }
      const base =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const url = `${base}/portal/${payload.token}`;
      setLink(url);
      pushToast("Portal link generated.");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    pushToast("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 text-sm text-accent/60">
      <Button
        variant="primary"
        size="sm"
        onClick={createLink}
        disabled={loading}
      >
        {loading ? "Generating…" : "Create client portal link"}
      </Button>
      {link ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 rounded-2xl border border-primary/10 bg-surface-muted/70 px-3 py-2 text-xs text-accent"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={copyLink}
              className="gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

