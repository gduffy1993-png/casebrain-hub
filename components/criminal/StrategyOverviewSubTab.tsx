"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Target, AlertTriangle, ListChecks, XCircle } from "lucide-react";

const STRATEGY_LABELS: Record<string, string> = {
  fight_charge: "Fight charge (trial)",
  charge_reduction: "Charge reduction",
  outcome_management: "Outcome management (plea / mitigation)",
};

type StrategyOverviewSubTabProps = {
  caseId: string;
  onOpenFullOutput?: () => void;
};

type Route = {
  id?: string;
  type?: string;
  title?: string;
  rationale?: string;
  winConditions?: string[];
  risks?: string[];
  nextActions?: string[];
  viability?: { status?: string; reasons?: string[] };
};

type Recommendation = {
  recommended?: string;
  confidence?: string;
  rationale?: string;
  solicitorNarrative?: string;
  ranking?: string[];
  flipConditions?: Array<{ evidenceEvent?: string; flipsTo?: string; why?: string }>;
};

export function StrategyOverviewSubTab({ caseId, onOpenFullOutput }: StrategyOverviewSubTabProps) {
  const [data, setData] = useState<{
    recommendation: Recommendation | null;
    routes: Route[];
    selectedRoute: string | null;
    resolvedOffence: { offenceType: string; label: string; source: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/criminal/${caseId}/strategy-analysis`, { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (!body?.data) {
          setData(null);
          return;
        }
        const d = body.data;
        setData({
          recommendation: d.recommendation ?? null,
          routes: Array.isArray(d.routes) ? d.routes : [],
          selectedRoute: d.selectedRoute ?? null,
          resolvedOffence: d.resolvedOffence ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load strategy");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading strategy overview...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">{error}</p>
        {onOpenFullOutput && (
          <button
            type="button"
            onClick={onOpenFullOutput}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Open Full output
          </button>
        )}
      </Card>
    );
  }

  if (!data?.recommendation && (!data?.routes || data.routes.length === 0)) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Run analysis to see strategy overview. Primary, secondary, risks and next actions will appear here.
        </p>
        {onOpenFullOutput && (
          <button
            type="button"
            onClick={onOpenFullOutput}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Open Full output
          </button>
        )}
      </Card>
    );
  }

  const rec = data.recommendation;
  const primary = rec?.recommended ?? data.selectedRoute ?? data.routes?.[0]?.type;
  const primaryLabel = primary ? (STRATEGY_LABELS[primary] ?? primary.replace(/_/g, " ")) : null;
  const secondary = (rec?.ranking ?? []).filter((r: string) => r !== primary);
  const rationale = rec?.solicitorNarrative ?? rec?.rationale ?? null;
  const selectedRoute = data.routes.find((r) => r.type === primary || r.id === primary);
  const risks = selectedRoute?.risks ?? [];
  const nextActions = selectedRoute?.nextActions ?? [];
  const blocked = data.routes.filter(
    (r) => r.viability?.status === "UNSAFE" || r.viability?.status === "WEAKENING"
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Strategy overview</h3>
          </div>

          {data.resolvedOffence?.label && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Offence</p>
              <p className="text-sm font-medium text-foreground">{data.resolvedOffence.label}</p>
            </div>
          )}

          {primaryLabel && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Primary</p>
              <p className="text-sm font-medium text-foreground">{primaryLabel}</p>
            </div>
          )}

          {secondary.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Secondary</p>
              <p className="text-sm text-foreground">
                {secondary.map((s) => STRATEGY_LABELS[s] ?? s.replace(/_/g, " ")).join(" · ")}
              </p>
            </div>
          )}

          {rationale && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rationale</p>
              <p className="text-sm text-foreground">{rationale}</p>
            </div>
          )}

          {risks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risks
              </p>
              <ul className="text-sm text-foreground list-disc list-inside space-y-0.5">
                {risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {nextActions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                Next actions
              </p>
              <ul className="text-sm text-foreground list-disc list-inside space-y-0.5">
                {nextActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {blocked.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" />
                Blocked / weakening routes
              </p>
              <ul className="text-sm text-foreground space-y-1">
                {blocked.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.title ?? r.type ?? "Route"}</span>
                    {r.viability?.reasons?.length ? (
                      <span className="text-muted-foreground"> — {r.viability.reasons[0]}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onOpenFullOutput && (
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={onOpenFullOutput}
                className="text-sm text-primary hover:underline"
              >
                Open Full engine output
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
