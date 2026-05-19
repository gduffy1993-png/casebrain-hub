"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileSearch,
  Gavel,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import type { CourtCaseBrief } from "./types";
import {
  buildCaseControlRoomHref,
  buildDisclosureChaseHref,
  buildStrategyHref,
  readinessLabel,
} from "./courtCaseBrief";

function readinessVariant(
  readiness: CourtCaseBrief["readiness"],
): "success" | "warning" | "danger" | "secondary" {
  switch (readiness) {
    case "green":
      return "success";
    case "amber":
      return "warning";
    case "red":
      return "danger";
    case "review":
      return "secondary";
  }
}

export function CourtTodayCaseCard({ brief }: { brief: CourtCaseBrief }) {
  const [showLine, setShowLine] = useState(false);

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {brief.hearingTimeLabel && brief.hearingBucket !== "no_hearing" && (
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {brief.hearingTimeLabel}
                </span>
              )}
              <Badge variant={readinessVariant(brief.readiness)} size="sm">
                {readinessLabel(brief.readiness)}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-1 line-clamp-2">{brief.clientLabel}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{brief.allegation}</p>
          </div>
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Hearing</dt>
            <dd className="font-medium text-foreground line-clamp-2">{brief.hearingLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stage</dt>
            <dd className="font-medium text-foreground line-clamp-2">{brief.stage}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Primary pressure route</dt>
            <dd className="font-medium text-foreground line-clamp-2">{brief.primaryRouteTitle}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Biggest risk
            </dt>
            <dd className="text-foreground line-clamp-2">{brief.biggestRisk}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Next action</dt>
            <dd className="text-foreground line-clamp-2">{brief.nextAction}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Chase / missing</dt>
            <dd className="text-foreground line-clamp-2">{brief.chaseSummary}</dd>
          </div>
        </dl>

        {showLine && (
          <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 text-xs text-foreground">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <Gavel className="h-3.5 w-3.5" />
              Safe court line (provisional)
            </p>
            <p className="leading-relaxed">{brief.safeCourtLine}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          <Link href={brief.controlRoomHref}>
            <Button type="button" size="sm" className="gap-1">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Open Control Room
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setShowLine((v) => !v)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Safe Court Line
          </Button>
          <Link href={buildDisclosureChaseHref(brief.caseId)}>
            <Button type="button" size="sm" variant="outline" className="gap-1">
              <FileSearch className="h-3.5 w-3.5" />
              Disclosure Chase
            </Button>
          </Link>
          <Link href={buildStrategyHref(brief.caseId)} className="ml-auto">
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
              Classic strategy
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
