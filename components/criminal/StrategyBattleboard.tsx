"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, Shield, Swords } from "lucide-react";
import type { BattleboardOutput, BattleboardRoute, BattleboardRouteStatus } from "@/lib/criminal/strategy-battleboard";

export type StrategyBattleboardProps = {
  caseId: string;
  /** Compact layout for Case Control Room — primary route + shortened backups. */
  compact?: boolean;
  maxBackupRoutes?: number;
  maxUrgentMoves?: number;
  maxCollapseRisks?: number;
  /** Suppress duplicate position banner when Control Room shows it above the fold. */
  hidePositionNotice?: boolean;
  /** Control Room cockpit already shows primary route — omit duplicate card. */
  hidePrimaryRoute?: boolean;
  /** Light court-diary cards (Control Room expanded Battleboard). */
  lightWorkflow?: boolean;
  /** Omit outer Card wrapper when parent provides a panel shell. */
  bare?: boolean;
  /** When set, skips internal fetch (parent already loaded battleboard). */
  battleboardData?: BattleboardOutput | null;
  battleboardLoading?: boolean;
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

function overallStatusLabel(status: BattleboardOutput["overall_status"]): string {
  switch (status) {
    case "usable":
      return "Routes available";
    case "thin_bundle":
      return "Thin bundle — provisional";
    case "needs_review":
      return "Needs solicitor review";
    default:
      return "Routes available";
  }
}

function BattleboardShell({
  children,
  title = "Strategy Battleboard",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <Card
      className="overflow-hidden border-slate-200 bg-white shadow-sm"
      data-testid="strategy-battleboard"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <Swords className="h-4 w-4 text-blue-700" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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

function CompactPrimaryRoute({
  route,
  lightWorkflow,
}: {
  route: BattleboardRoute;
  lightWorkflow?: boolean;
}) {
  return (
    <Card
      className={
        lightWorkflow
          ? "p-4 border-blue-200/60 bg-blue-50/40 shadow-sm"
          : "p-4 border-primary/40 bg-primary/5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Best route</p>
          <h4 className="text-sm font-semibold text-foreground">{route.title}</h4>
        </div>
        <Badge variant={statusBadgeVariant(route.status)} size="md">
          {statusLabel(route.status)}
        </Badge>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <BulletSection title="Why it helps" items={route.why_it_helps.slice(0, 2)} />
        <BulletSection title="Evidence anchors" items={route.evidence_anchors.slice(0, 3)} />
        <div className="rounded-md border border-border/50 bg-muted/30 p-2.5">
          <p className="text-xs font-semibold text-foreground mb-1">Safe hearing line</p>
          <p className="text-sm text-foreground line-clamp-3">{route.hearing_line}</p>
        </div>
        {route.safety_note && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span className="font-medium text-foreground">Safety: </span>
            {route.safety_note}
          </p>
        )}
      </div>
    </Card>
  );
}

function RouteCard({
  route,
  isPrimary,
  lightWorkflow,
}: {
  route: BattleboardRoute;
  isPrimary?: boolean;
  lightWorkflow?: boolean;
}) {
  const cardClass = lightWorkflow
    ? isPrimary
      ? "p-4 border-blue-200/60 bg-blue-50/40 shadow-sm"
      : "p-4 border-slate-200 bg-white shadow-sm"
    : isPrimary
      ? "p-4 border-primary/40 bg-primary/5"
      : "p-4 border-border/60 bg-card";
  return (
    <Card className={cardClass}>
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

function CompactBackupRoute({
  route,
  lightWorkflow,
}: {
  route: BattleboardRoute;
  lightWorkflow?: boolean;
}) {
  return (
    <div
      className={
        lightWorkflow
          ? "rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2"
          : "rounded-md border border-border/50 bg-card/80 px-3 py-2"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{route.title}</p>
        <Badge variant={statusBadgeVariant(route.status)} size="sm">
          {statusLabel(route.status)}
        </Badge>
      </div>
      {route.evidence_anchors[0] && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{route.evidence_anchors[0]}</p>
      )}
      {route.collapse_risks[0] && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 line-clamp-1">
          {route.collapse_risks[0]}
        </p>
      )}
    </div>
  );
}

function BattleboardBody({
  data,
  compact,
  maxBackupRoutes,
  maxUrgentMoves,
  maxCollapseRisks,
  hidePositionNotice,
  hidePrimaryRoute,
  lightWorkflow,
  showFull,
  onToggleFull,
}: {
  data: BattleboardOutput;
  compact: boolean;
  maxBackupRoutes: number;
  maxUrgentMoves: number;
  maxCollapseRisks: number;
  hidePositionNotice: boolean;
  hidePrimaryRoute: boolean;
  lightWorkflow: boolean;
  showFull: boolean;
  onToggleFull: () => void;
}) {
  const backupRoutes = data.routes.filter((r) => r.id !== data.primary_route?.id);
  const compactBackups = backupRoutes.slice(0, maxBackupRoutes);
  const useCompactLayout = compact && !showFull;
  const collapseRisks = data.global_collapse_risks.slice(
    0,
    useCompactLayout ? maxCollapseRisks : data.global_collapse_risks.length,
  );
  const urgentMoves = data.urgent_next_moves.slice(
    0,
    useCompactLayout ? maxUrgentMoves : data.urgent_next_moves.length,
  );

  return (
    <>
      {compact && !lightWorkflow && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-3 -mx-4 -mt-4 mb-4">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Strategy Battleboard</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overallBadgeVariant(data.overall_status)} size="md">
            {overallStatusLabel(data.overall_status)}
          </Badge>
            <Button type="button" variant="outline" size="sm" onClick={onToggleFull}>
              {showFull ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Compact view
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Show full Battleboard
                </>
              )}
            </Button>
        </div>
      </div>
      )}

      <div className="space-y-4">
        <div
          className={`flex items-start gap-2 ${
            lightWorkflow
              ? "rounded-md border border-slate-200 bg-slate-50/80 p-3"
              : "rounded-md border border-border/50 bg-muted/20 p-3"
          }`}
        >
          <Shield
            className={`h-4 w-4 shrink-0 mt-0.5 ${lightWorkflow ? "text-slate-500" : "text-muted-foreground"}`}
          />
          <p className={`text-sm ${lightWorkflow ? "text-slate-800" : "text-foreground"}`}>
            {data.solicitor_safe_summary}
          </p>
        </div>

        {data.position_notice &&
          !hidePositionNotice &&
          data.position_notice !== data.solicitor_safe_summary && (
            <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2">
              {data.position_notice}
            </p>
          )}

        {!hidePrimaryRoute &&
          (data.primary_route ? (
            useCompactLayout ? (
              <CompactPrimaryRoute route={data.primary_route} lightWorkflow={lightWorkflow} />
            ) : (
              <RouteCard route={data.primary_route} isPrimary lightWorkflow={lightWorkflow} />
            )
          ) : (
            <Card
              className={
                lightWorkflow
                  ? "p-4 border-dashed border-slate-200 bg-white"
                  : "p-4 border-dashed border-border/60"
              }
            >
              <p className={`text-sm ${lightWorkflow ? "text-slate-600" : "text-muted-foreground"}`}>
                No primary route ranked yet. Review backup routes below or add bundle material.
              </p>
            </Card>
          ))}

        {useCompactLayout ? (
          <>
            {compactBackups.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Backup routes{backupRoutes.length > maxBackupRoutes ? ` (top ${maxBackupRoutes})` : ""}
                </p>
                {compactBackups.map((route) => (
                  <CompactBackupRoute key={route.id} route={route} lightWorkflow={lightWorkflow} />
                ))}
              </div>
            )}
          </>
        ) : (
          backupRoutes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Backup routes</p>
              {backupRoutes.map((route) => (
                <RouteCard key={route.id} route={route} lightWorkflow={lightWorkflow} />
              ))}
            </div>
          )
        )}

        {collapseRisks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">
              Global collapse risks
              {useCompactLayout && data.global_collapse_risks.length > maxCollapseRisks
                ? ` (top ${maxCollapseRisks})`
                : ""}
            </p>
            <ul
              className={`text-muted-foreground list-disc pl-4 space-y-0.5 ${useCompactLayout ? "text-xs" : "text-sm"}`}
            >
              {collapseRisks.map((r, i) => (
                <li key={i} className={useCompactLayout ? "line-clamp-2" : undefined}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {urgentMoves.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">
              Urgent next moves
              {useCompactLayout && data.urgent_next_moves.length > maxUrgentMoves
                ? ` (top ${maxUrgentMoves})`
                : ""}
            </p>
            <ul
              className={`text-foreground list-disc pl-4 space-y-0.5 ${useCompactLayout ? "text-xs" : "text-sm"}`}
            >
              {urgentMoves.map((m, i) => (
                <li key={i} className={useCompactLayout ? "line-clamp-2" : undefined}>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Read-only control panel. Conditional pressure only — not a prediction of outcome. Needs solicitor
          review before court.
        </p>
      </div>
    </>
  );
}

export function StrategyBattleboard({
  caseId,
  compact = false,
  maxBackupRoutes = 2,
  maxUrgentMoves = 6,
  maxCollapseRisks = 5,
  hidePositionNotice = false,
  hidePrimaryRoute = false,
  lightWorkflow = false,
  bare = false,
  battleboardData,
  battleboardLoading,
}: StrategyBattleboardProps) {
  const parentOwnsData = battleboardData !== undefined;
  const [internalData, setInternalData] = useState<BattleboardOutput | null>(null);
  const [internalLoading, setInternalLoading] = useState(!parentOwnsData);
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  const data = parentOwnsData ? battleboardData : internalData;
  const loading = parentOwnsData ? Boolean(battleboardLoading) : internalLoading;

  useEffect(() => {
    if (parentOwnsData || !caseId) return;
    let cancelled = false;
    setInternalLoading(true);
    setError(null);
    fetch(`/api/criminal/${caseId}/strategy-battleboard`, { cache: "no-store", credentials: "include" })
      .then(async (r) => {
        const res = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setInternalData(null);
          setError(res?.error || `Request failed (${r.status})`);
          return;
        }
        if (res?.ok && res?.data) {
          setInternalData(res.data as BattleboardOutput);
          setError(null);
        } else {
          setInternalData(null);
          setError(res?.error || "Failed to load battleboard");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load battleboard");
          setInternalData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setInternalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, parentOwnsData]);

  useEffect(() => {
    if (!caseId && !parentOwnsData) {
      setInternalLoading(false);
      setError("No case selected.");
      setInternalData(null);
    }
  }, [caseId, parentOwnsData]);

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

  const body = (
    <BattleboardBody
      data={data}
      compact={compact}
      maxBackupRoutes={maxBackupRoutes}
      maxUrgentMoves={maxUrgentMoves}
      maxCollapseRisks={maxCollapseRisks}
      hidePositionNotice={hidePositionNotice}
      hidePrimaryRoute={hidePrimaryRoute}
      lightWorkflow={lightWorkflow}
      showFull={showFull}
      onToggleFull={() => setShowFull((v) => !v)}
    />
  );

  if (bare) {
    return (
      <div className="min-w-0" data-testid="strategy-battleboard">
        {body}
      </div>
    );
  }

  return (
    <Card
      className="overflow-hidden border-slate-200 bg-white shadow-sm"
      data-testid="strategy-battleboard"
    >
      {!compact && !lightWorkflow && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <Swords className="h-4 w-4 text-blue-700" />
          <h3 className="text-sm font-semibold text-slate-900">Strategy Battleboard</h3>
        </div>
      )}
      <div className={lightWorkflow ? "py-1" : "p-4"}>{body}</div>
    </Card>
  );
}
