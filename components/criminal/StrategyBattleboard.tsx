"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Swords } from "lucide-react";
import type { BattleboardOutput, BattleboardRoute, BattleboardRouteStatus } from "@/lib/criminal/strategy-battleboard";

type StrategyBattleboardProps = {
  caseId: string;
};

function statusBadgeVariant(status: BattleboardRouteStatus): "success" | "warning" | "danger" {
  if (status === "viable") return "success";
  if (status === "conditional") return "warning";
  return "danger";
}

function statusLabel(status: BattleboardRouteStatus): string {
  if (status === "viable") return "Viable";
  if (status === "conditional") return "Conditional";
  return "Blocked";
}

function overallBadgeVariant(
  status: BattleboardOutput["overall_status"]
): "success" | "warning" | "secondary" {
  if (status === "usable") return "success";
  if (status === "thin_bundle") return "warning";
  return "secondary";
}

function BattleboardShell({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden border-primary/30 border-border/60" data-testid="strategy-battleboard">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
        <Swords className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Strategy Battleboard</h3>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function BulletSection({
  title,
  items,
  muted,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-1">{title}</p>
      <ul className={`list-disc pl-4 space-y-0.5 ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RouteCard({ route, isPrimary }: { route: BattleboardRoute; isPrimary?: boolean }) {
  return (
    <Card className={`p-4 ${isPrimary ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {isPrimary && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Best route</p>
          )}
          <h4 className="text-sm font-semibold text-foreground">{route.title}</h4>
        </div>
        <Badge variant={statusBadgeVariant(route.status)} size="md">
          {statusLabel(route.status)}
        </Badge>
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <BulletSection title="Why it helps" items={route.why_it_helps} />
        <BulletSection title="What hurts us" items={route.what_hurts_us} muted />
        <BulletSection title="Evidence anchors" items={route.evidence_anchors} />
        <BulletSection title="Collapse risk" items={route.collapse_risks} muted />
        <BulletSection title="Next move" items={route.next_moves} />
        <div className="rounded-md border border-border/50 bg-muted/30 p-2.5">
          <p className="text-xs font-semibold text-foreground mb-1">Safe hearing line</p>
          <p className="text-sm text-foreground">{route.hearing_line}</p>
        </div>
        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
          <span className="font-medium text-foreground">Safety: </span>
          {route.safety_note}
        </p>
      </div>
    </Card>
  );
}

export function StrategyBattleboard({ caseId }: StrategyBattleboardProps) {
  const [data, setData] = useState<BattleboardOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      setError("No case selected.");
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/criminal/${caseId}/strategy-battleboard`, { cache: "no-store", credentials: "include" })
      .then(async (r) => {
        const res = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setData(null);
          setError(res?.error || `Request failed (${r.status})`);
          return;
        }
        if (res?.ok && res?.data) {
          setData(res.data as BattleboardOutput);
          setError(null);
        } else {
          setData(null);
          setError(res?.error || "Failed to load battleboard");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load battleboard");
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

  if (loading) {
    return (
      <BattleboardShell>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading Strategy Battleboard…</span>
        </div>
      </BattleboardShell>
    );
  }

  if (error) {
    return (
      <BattleboardShell>
        <p className="text-sm text-destructive font-medium">Could not load route cards</p>
        <p className="text-sm text-destructive/90 mt-1">{error}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Defence Plan and chat below are unchanged. Retry by refreshing the page.
        </p>
      </BattleboardShell>
    );
  }

  if (!data || data.routes.length === 0) {
    return (
      <BattleboardShell>
        <p className="text-sm text-foreground">Not enough evidence to build route cards yet.</p>
        <p className="text-xs text-muted-foreground mt-2">
          Upload bundle material or open a case with served papers; routes are built from file wording only.
        </p>
        {data?.solicitor_safe_summary && (
          <p className="text-xs text-muted-foreground mt-2">{data.solicitor_safe_summary}</p>
        )}
      </BattleboardShell>
    );
  }

  const backupRoutes = data.routes.filter((r) => r.id !== data.primary_route?.id);

  return (
    <Card className="overflow-hidden border-primary/30 border-border/60" data-testid="strategy-battleboard">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Strategy Battleboard</h3>
        </div>
        <Badge variant={overallBadgeVariant(data.overall_status)} size="md">
          {data.overall_status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 p-3">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{data.solicitor_safe_summary}</p>
        </div>

        {data.position_notice && data.position_notice !== data.solicitor_safe_summary && (
          <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2">
            {data.position_notice}
          </p>
        )}

        {data.primary_route ? (
          <RouteCard route={data.primary_route} isPrimary />
        ) : (
          <Card className="p-4 border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">
              No primary route ranked yet. Review backup routes below or add bundle material.
            </p>
          </Card>
        )}

        {backupRoutes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Backup routes</p>
            {backupRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}

        {data.global_collapse_risks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Global collapse risks</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
              {data.global_collapse_risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {data.urgent_next_moves.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Urgent next moves</p>
            <ul className="text-sm text-foreground list-disc pl-4 space-y-0.5">
              {data.urgent_next_moves.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Read-only control panel. Conditional pressure only — not a prediction of outcome. Needs solicitor
          review before court.
        </p>
      </div>
    </Card>
  );
}
