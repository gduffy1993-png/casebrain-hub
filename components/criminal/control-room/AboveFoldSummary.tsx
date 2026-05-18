"use client";

import { Calendar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlanceItem, SummaryBlock } from "./GlanceGrid";

export type AboveFoldSummaryProps = {
  allegation: string;
  stage: string;
  bundleLabel: string;
  positionLabel: string;
  nextHearing: string;
  disclosureLabel: string;
  bestRouteTitle: string;
  routeStatus?: string | null;
  prosecutionWeakness: string[];
  defenceRisks: string[];
  immediateActions: string[];
  strategyBasisNotice?: { label: string; reason?: string } | null;
  positionNotice?: string | null;
  loading?: boolean;
};

export function AboveFoldSummary({
  allegation,
  stage,
  bundleLabel,
  positionLabel,
  nextHearing,
  disclosureLabel,
  bestRouteTitle,
  routeStatus,
  prosecutionWeakness,
  defenceRisks,
  immediateActions,
  strategyBasisNotice,
  positionNotice,
  loading,
}: AboveFoldSummaryProps) {
  const topActions = immediateActions.slice(0, 3);

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      {positionNotice && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
          {positionNotice}
        </p>
      )}
      {strategyBasisNotice && (
        <p className="text-[11px] text-muted-foreground border-b border-border/40 bg-muted/20 px-3 py-1.5">
          {strategyBasisNotice.label}
          {strategyBasisNotice.reason ? ` — ${strategyBasisNotice.reason}` : ""}
        </p>
      )}

      <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <GlanceItem label="Allegation" value={loading ? "Loading…" : allegation} />
          <GlanceItem label="Stage" value={loading ? "—" : stage} />
          <GlanceItem label="Bundle health" value={loading ? "—" : bundleLabel} />
          <GlanceItem label="Position" value={loading ? "—" : positionLabel} />
          <GlanceItem label="Next hearing" value={loading ? "—" : nextHearing} />
          <GlanceItem label="Disclosure / chase" value={loading ? "—" : disclosureLabel} />
        </dl>

        <div className="space-y-2.5">
          <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Target className="h-3 w-3" />
              Best route
            </p>
            <p className="text-base font-semibold text-foreground mt-0.5 leading-snug line-clamp-2">
              {bestRouteTitle}
            </p>
            {routeStatus && (
              <Badge variant="secondary" size="sm" className="mt-1.5">
                {routeStatus} — conditional on served material
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SummaryBlock label="Prosecution weakness" items={prosecutionWeakness} compact />
            <SummaryBlock label="Defence risk" items={defenceRisks} compact />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Next 3 actions
            </p>
            <ul className="list-disc pl-3.5 space-y-0.5 text-xs text-foreground">
              {topActions.map((item, i) => (
                <li key={i} className="line-clamp-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
