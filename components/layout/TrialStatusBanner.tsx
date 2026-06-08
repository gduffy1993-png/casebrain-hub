"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

type TrialStatusResponse = {
  isBlocked: boolean;
  reason?: "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT";
  plan?: "free" | "pro" | "starter";
  daysLeft?: number | null;
  casesUsed?: number;
  casesLimit?: number;
  docsUsed?: number;
  docsLimit?: number;
};

export function TrialStatusBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<TrialStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch("/api/trial-status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !status) return null;

  const isPro = status.plan === "pro" || status.plan === "starter";
  const limitIsFinite =
    typeof status.casesLimit === "number" && Number.isFinite(status.casesLimit);
  if (isPro && !limitIsFinite) return null;

  const casesUsed = status.casesUsed ?? 0;
  const casesLimit = status.casesLimit ?? 2;
  const docsUsed = status.docsUsed ?? 0;
  const docsLimit = status.docsLimit ?? 10;
  const daysLeft = status.daysLeft;
  const trialEnded = status.isBlocked && status.reason === "TRIAL_EXPIRED";

  const label = trialEnded
    ? "Trial ended"
    : daysLeft != null
      ? `${daysLeft}d left · ${casesUsed}/${casesLimit} cases · ${docsUsed}/${docsLimit} docs`
      : `${casesUsed}/${casesLimit} cases · ${docsUsed}/${docsLimit} docs`;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-500/20 bg-amber-500/5 px-6 py-2 text-sm">
      <span className="text-amber-200/90">
        Trial: {label}
      </span>
      <button
        type="button"
        onClick={() => router.push("/upgrade")}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
      >
        <Zap className="h-4 w-4" />
        Upgrade
      </button>
    </div>
  );
}
