"use client";

import { Card } from "@/components/ui/card";
import { Clock, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

type StrategyTimelineSectionProps = {
  /** One-line strategy (headline for "now") */
  strategyInOneLine?: string | null;
  /** Next 72 hours actions: first 1–2 = doing now, rest = doing next */
  next72Hours?: string[];
  /** Outstanding disclosure items we're waiting for */
  waitingFor?: string[];
  /** If things change: risks and pivots */
  risksPivotsShort?: string[];
};

const NOW_COUNT = 2;

export function StrategyTimelineSection({
  strategyInOneLine,
  next72Hours = [],
  waitingFor = [],
  risksPivotsShort = [],
}: StrategyTimelineSectionProps) {
  const hasAny =
    (strategyInOneLine?.trim()?.length ?? 0) > 0 ||
    next72Hours.length > 0 ||
    waitingFor.length > 0 ||
    risksPivotsShort.length > 0;

  if (!hasAny) return null;

  const doingNow = next72Hours.slice(0, NOW_COUNT);
  const doingNext = next72Hours.slice(NOW_COUNT);

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Strategy timeline
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        What we're doing now, what we're waiting for, what we'll do next, and what changes if evidence changes.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Doing now
          </p>
          <ul className="space-y-1">
            {strategyInOneLine?.trim() && (
              <li className="font-medium text-foreground">{strategyInOneLine.trim()}</li>
            )}
            {doingNow.map((a, i) => (
              <li key={i} className="text-foreground">• {a}</li>
            ))}
            {!strategyInOneLine?.trim() && doingNow.length === 0 && (
              <li className="text-muted-foreground">—</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Waiting for
          </p>
          {waitingFor.length > 0 ? (
            <ul className="space-y-1 text-foreground">
              {waitingFor.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No outstanding disclosure from Safety.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <ArrowRight className="h-3.5 w-3.5" />
            Next
          </p>
          {doingNext.length > 0 ? (
            <ul className="space-y-1 text-foreground">
              {doingNext.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            If things change
          </p>
          {risksPivotsShort.length > 0 ? (
            <ul className="space-y-1 text-foreground">
              {risksPivotsShort.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </Card>
  );
}
