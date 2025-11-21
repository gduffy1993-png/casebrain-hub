"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

export function PortalShare({ caseId }: { caseId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="space-y-2 text-sm text-accent/60">
      <Button variant="primary" size="sm" onClick={createLink} disabled={loading}>
        {loading ? "Generating…" : "Create client portal link"}
      </Button>
      {link ? (
        <p className="break-all rounded-2xl border border-primary/10 bg-surface-muted/70 p-3 text-xs text-accent">
          {link}
        </p>
      ) : null}
    </div>
  );
}

