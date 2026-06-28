"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

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
  const pilotMode = isCriminalPilotMode();
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
    ? "Trial ended — upgrade to upload more cases"
    : daysLeft != null
      ? `${daysLeft}d left · ${casesUsed}/${casesLimit} cases · ${docsUsed}/${docsLimit} docs`
      : `${casesUsed}/${casesLimit} cases · ${docsUsed}/${docsLimit} docs`;

  if (pilotMode) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/90 px-6 py-1.5 text-xs">
        <span className="text-slate-500 truncate">Trial: {label}</span>
        <button
          type="button"
          onClick={() => router.push("/upgrade")}
          className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
        >
          <Zap className="h-3 w-3" />
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm">
      <span className="text-amber-900">Trial: {label}</span>
      <button
        type="button"
        onClick={() => router.push("/upgrade")}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100"
      >
        <Zap className="h-4 w-4" />
        Upgrade
      </button>
    </div>
  );
}
