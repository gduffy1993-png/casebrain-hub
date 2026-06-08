"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronDown, ChevronUp, FileWarning, Loader2, ShieldAlert } from "lucide-react";
import type { PressureItem } from "@/lib/criminal/disclosure-pressure";

type DisclosurePressureDashboardProps = {
  caseId: string;
};

type ApiData = {
  missingItems: PressureItem[];
  status: string;
  rationale: string[];
  satisfiedCount: number;
};

export function DisclosurePressureDashboard({ caseId }: DisclosurePressureDashboardProps) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/criminal/${caseId}/disclosure-pressure`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.ok && res?.data) {
          setData(res.data);
        } else {
          setData(null);
          setError(res?.error || "Failed to load");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <Card className="p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading disclosure pressure…</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/30 bg-destructive/5">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  if (!data) return null;

  const { missingItems, status, rationale, satisfiedCount } = data;
  const hasMissing = missingItems.length > 0;

  return (
    <Card className="overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-100/50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/30">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Disclosure pressure
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={status === "safe" ? "secondary" : "danger"}
            className={
              status === "safe"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                : ""
            }
          >
            {status === "unsafe"
              ? "Unsafe"
              : status === "conditionally_unsafe"
                ? "Conditionally unsafe"
                : "Safe"}
          </Badge>
          {satisfiedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {satisfiedCount} satisfied
            </span>
          )}
        </div>
      </div>

      {rationale?.length > 0 && (
        <div className="border-b border-amber-200/60 px-4 py-2 dark:border-amber-800/40">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {rationale.join(" ")}
          </p>
        </div>
      )}

      {!hasMissing && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-amber-800 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>No missing disclosure items from this case’s checklist.</span>
        </div>
      )}

      {hasMissing && (
        <ul className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
          {missingItems.map((item) => (
            <li key={item.key} className="px-4 py-3">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 text-left"
                onClick={() => toggle(item.key)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-foreground">{item.label}</span>
                  <Badge
                    variant="outline"
                    className={
                      item.severity === "critical"
                        ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                        : "border-amber-400 text-amber-800 dark:border-amber-600 dark:text-amber-200"
                    }
                  >
                    {item.severity}
                  </Badge>
                </div>
                {expanded[item.key] ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {expanded[item.key] && (
                <div className="mt-2 space-y-2 pl-6 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Why it matters</p>
                    <p className="text-foreground">{item.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pressure step</p>
                    <p className="text-foreground">{item.pressureStep}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
