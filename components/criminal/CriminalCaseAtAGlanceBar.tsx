"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Shield, FileSearch, Loader2, CheckCircle2, AlertTriangle, Minus } from "lucide-react";
import { computeProceduralSafety } from "@/lib/criminal/procedural-safety";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

const JUMP_LINKS = [
  { id: "section-safety", label: "Safety" },
  { id: "section-strategy", label: "Strategy" },
  { id: "section-next-steps", label: "Next steps" },
  { id: "section-disclosure", label: "Disclosure" },
  { id: "section-bail", label: "Bail" },
] as const;

type CriminalCaseAtAGlanceBarProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  primaryStrategyLabel?: string | null;
};

export function CriminalCaseAtAGlanceBar({
  caseId,
  snapshot,
  snapshotLoading,
  primaryStrategyLabel,
}: CriminalCaseAtAGlanceBarProps) {
  const [safetyStatus, setSafetyStatus] = useState<"SAFE" | "CONDITIONALLY_UNSAFE" | "UNSAFE_TO_PROCEED" | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);

  // Derive disclosure counts from snapshot
  const criticalCount = snapshot?.evidence?.missingEvidence?.filter((m) => m.priority === "CRITICAL").length ?? 0;
  const highCount = snapshot?.evidence?.missingEvidence?.filter((m) => m.priority === "HIGH").length ?? 0;
  const outstandingCount =
    snapshot?.evidence?.disclosureItems?.filter((d) => d.status === "Outstanding").length ?? 0;

  // Fetch procedural safety when we have a snapshot (from strategy-analysis evidenceImpactMap)
  useEffect(() => {
    if (!caseId || !snapshot || snapshotLoading) {
      setSafetyStatus(null);
      return;
    }
    let cancelled = false;
    setSafetyLoading(true);
    fetch(`/api/criminal/${caseId}/strategy-analysis`, { credentials: "include" })
      .then((res) => {
        if (!res.ok || cancelled) return null;
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const map = data?.data?.evidenceImpactMap;
        if (Array.isArray(map) && map.length > 0) {
          const result = computeProceduralSafety(map);
          setSafetyStatus(result.status);
        } else {
          setSafetyStatus(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSafetyStatus(null);
      })
      .finally(() => {
        if (!cancelled) setSafetyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, snapshot, snapshotLoading]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-0">
      {/* At-a-glance summary card - only when we have snapshot (or loading) */}
      {(snapshot !== undefined || snapshotLoading) && (
        <Card className="p-4 rounded-lg border border-border/80 bg-muted/30">
          {/* One-line supervisor summary when strategy is committed */}
          {primaryStrategyLabel && (
            <p className="text-sm font-medium text-foreground mb-3 pb-2 border-b border-border/50">
              Strategy: {primaryStrategyLabel}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Safety status */}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Procedural safety:</span>
              {safetyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : safetyStatus === "SAFE" ? (
                <span className="text-sm font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Safe to proceed
                </span>
              ) : safetyStatus === "CONDITIONALLY_UNSAFE" || safetyStatus === "UNSAFE_TO_PROCEED" ? (
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Not safe to proceed
                </span>
              ) : (
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Minus className="h-4 w-4" /> —
                </span>
              )}
              <a
                href="#section-safety"
                onClick={(e) => {
                  e.preventDefault();
                  handleJump("section-safety");
                }}
                className="text-xs text-primary hover:underline"
              >
                View safety
              </a>
            </div>

            {/* Disclosure hub: one place for "what's outstanding" */}
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Disclosure:</span>
              <span className="text-sm font-medium text-foreground">
                Critical: {criticalCount}
                {highCount > 0 ? ` · High: ${highCount}` : ""}
                {outstandingCount > 0 ? ` · Outstanding: ${outstandingCount}` : ""}
              </span>
              <a
                href="#section-disclosure"
                onClick={(e) => {
                  e.preventDefault();
                  handleJump("section-disclosure");
                }}
                className="text-xs text-primary hover:underline"
              >
                View full list
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* Sticky Jump to nav */}
      <div
        className="sticky top-0 z-10 -mx-0 mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/95 py-2 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        role="navigation"
        aria-label="Jump to section"
      >
        <span className="text-xs font-medium text-muted-foreground mr-1">Jump to:</span>
        {JUMP_LINKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleJump(id)}
            className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
