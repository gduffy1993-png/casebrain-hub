"use client";

import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import type { RiskFlagRecord } from "@/types";

type ApiResponse = {
  flags: (RiskFlagRecord & { cases?: { title?: string } })[];
};

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to load risk alerts");
  }
  return res.json();
};

const severityStyles: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-danger/10 text-danger",
  critical: "bg-danger text-white",
};

export function RiskList() {
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved">("open");
  const { data, error, isLoading, mutate } = useSWR(
    `/api/risk-flags?status=${statusFilter}`,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const pushToast = useToast((state) => state.push);

  const updateFlag = async (flagId: string, resolved: boolean) => {
    const res = await fetch(`/api/risk-flags/${flagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      pushToast(payload?.error ?? "Failed to update flag");
      return;
    }
    pushToast(resolved ? "Risk marked as resolved." : "Risk reopened.");
    void mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 rounded-full border border-primary/20 bg-white p-1 text-xs font-semibold uppercase tracking-wide text-accent/60">
          <button
            type="button"
            onClick={() => setStatusFilter("open")}
            className={`rounded-full px-3 py-1 transition ${
              statusFilter === "open" ? "bg-primary text-white shadow-sm" : "hover:bg-primary/10"
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("resolved")}
            className={`rounded-full px-3 py-1 transition ${
              statusFilter === "resolved"
                ? "bg-primary text-white shadow-sm"
                : "hover:bg-primary/10"
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-accent/60">Loading risk alerts…</p>
      ) : error ? (
        <p className="text-sm text-danger">
          {error instanceof Error ? error.message : "Unable to load risk alerts."}
        </p>
      ) : !data?.flags?.length ? (
        <p className="text-sm text-accent/60">
          No {statusFilter === "open" ? "open" : "resolved"} risk alerts to display.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.flags.map((flag) => (
            <li
              key={flag.id}
              className="rounded-3xl border border-primary/10 bg-surface-muted/60 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${severityStyles[flag.severity] ?? "bg-primary/10 text-primary"}`}
                    >
                      {flag.severity}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-accent/40">
                      {flag.flag_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-accent/40">
                      {new Date(flag.detected_at).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-accent">
                    {flag.description}
                  </p>
                  <p className="text-xs text-accent/50">
                    Case: {flag.cases?.title ?? "Unknown"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {flag.resolved ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateFlag(flag.id, false)}
                    >
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => updateFlag(flag.id, true)}
                    >
                      Mark resolved
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

