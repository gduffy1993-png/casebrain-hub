"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

type TrialStatusResponse = {
  isBlocked: boolean;
  reason?: "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT";
  trialEndsAt?: string | null;
  docsUsed?: number;
  docsLimit?: number;
  casesUsed?: number;
  casesLimit?: number;
  plan?: "free" | "pro" | "starter";
  daysLeft?: number | null;
};

export function TrialStatusCard() {
  const router = useRouter();
  const [status, setStatus] = useState<TrialStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch("/api/trial-status");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card title="Trial status" description="Loading…">
        <p className="text-sm text-accent/60">Loading trial status…</p>
      </Card>
    );
  }

  if (error || !status) {
    return null;
  }

  const isPro = status.plan === "pro" || status.plan === "starter";
  const limitIsFinite =
    typeof status.casesLimit === "number" &&
    Number.isFinite(status.casesLimit);

  if (isPro && !limitIsFinite) {
    return (
      <Card
        title="Plan"
        description="Your current subscription."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/upgrade")}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Manage subscription
          </Button>
        }
      >
        <p className="text-sm text-accent">
          You’re on the <strong>Pro</strong> plan with full access.
        </p>
      </Card>
    );
  }

  const casesUsed = status.casesUsed ?? 0;
  const casesLimit = status.casesLimit ?? 2;
  const docsUsed = status.docsUsed ?? 0;
  const docsLimit = status.docsLimit ?? 10;
  const daysLeft = status.daysLeft;
  const trialEnded = status.isBlocked && status.reason === "TRIAL_EXPIRED";

  const statusLine = trialEnded
    ? "Trial ended"
    : daysLeft != null
      ? `Trial: ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left · ${casesUsed}/${casesLimit} cases · ${docsUsed}/${docsLimit} docs`
      : `${casesUsed}/${casesLimit} cases · ${docsUsed}/${docsLimit} docs`;

  return (
    <Card
      title="Trial status"
      description={statusLine}
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push("/upgrade")}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Upgrade
        </Button>
      }
    >
      {trialEnded && (
        <p className="text-sm text-amber-400/90">
          Your trial has ended. Upgrade to create new cases, upload more documents, and run analysis.
        </p>
      )}
      {status.isBlocked && !trialEnded && status.reason && (
        <p className="text-sm text-amber-400/90">
          Trial limit reached. Upgrade to continue.
        </p>
      )}
    </Card>
  );
}
