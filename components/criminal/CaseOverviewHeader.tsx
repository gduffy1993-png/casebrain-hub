"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  User,
  FileText,
  Gavel,
  Upload,
  MessageSquarePlus,
  CalendarPlus,
  Mail,
  StickyNote,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  FolderOpen,
  FileCheck,
} from "lucide-react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type MatterStation = {
  clientInitials: string | null;
  policeStationName: string | null;
  dateOfArrest: string | null;
  allegedOffence: string | null;
};

export type CaseOverviewHeaderProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  isStrategyCommitted: boolean;
  onUploadEvidence?: () => void;
  onAddClientInstructions?: () => void;
  onAddHearing?: () => void;
  onGenerateLetter?: () => void;
  onAddNote?: () => void;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function deriveCaseStatus(
  matterState: string | null,
  isStrategyCommitted: boolean
): string {
  if (isStrategyCommitted) return "Strategy committed";
  if (!matterState) return "—";
  switch (matterState) {
    case "at_station":
    case "bailed":
    case "rui":
      return "At station";
    case "charged":
    case "before_first_hearing":
      return "Awaiting disclosure";
    case "before_ptph":
    case "before_trial":
    case "trial":
    case "sentencing":
      return "Pre-PTPH";
    case "disposed":
      return "Disposed";
    default:
      return "—";
  }
}

function strategyLabel(position: string | undefined): string {
  if (!position) return "—";
  switch (position) {
    case "fight_charge":
      return "Fight charge";
    case "charge_reduction":
      return "Charge reduction";
    case "outcome_management":
      return "Mitigate";
    default:
      return position.replace(/_/g, " ");
  }
}

export function CaseOverviewHeader({
  caseId,
  snapshot,
  snapshotLoading,
  isStrategyCommitted,
  onUploadEvidence,
  onAddClientInstructions,
  onAddHearing,
  onGenerateLetter,
  onAddNote,
}: CaseOverviewHeaderProps) {
  const [matter, setMatter] = useState<{
    matterState: string | null;
    station: MatterStation | null;
  } | null>(null);
  const [matterLoading, setMatterLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setMatterLoading(true);
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMatter({
          matterState: data.matterState ?? null,
          station: data.station ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setMatter(null);
      })
      .finally(() => {
        if (!cancelled) setMatterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const station = matter?.station ?? null;
  const matterState = matter?.matterState ?? null;
  const caseStatusLabel = deriveCaseStatus(matterState, isStrategyCommitted);

  // Offence: charges first, else matter allegedOffence
  const offenceFromCharges = snapshot?.charges?.[0]?.offence?.trim();
  const offence = offenceFromCharges || station?.allegedOffence?.trim() || "—";

  const dateOfIncident = station?.dateOfArrest ?? null;
  const clientInitials = station?.clientInitials?.trim() || "—";
  const policeStation = station?.policeStationName?.trim() || "—";

  const nextHearingAt = snapshot?.caseMeta?.hearingNextAt ?? null;
  const nextHearingType = snapshot?.caseMeta?.hearingNextType?.trim();
  const nextHearing = nextHearingAt
    ? nextHearingType
      ? `${nextHearingType} ${formatDate(nextHearingAt)}`
      : formatDate(nextHearingAt)
    : "—";

  // Disclosure: Critical, High, Satisfied (received)
  const missing = snapshot?.evidence?.missingEvidence ?? [];
  const criticalCount = missing.filter((m) => m.priority === "CRITICAL").length;
  const highCount = missing.filter((m) => m.priority === "HIGH").length;
  const disclosureItems = snapshot?.evidence?.disclosureItems ?? [];
  const satisfiedCount =
    disclosureItems.filter((d) => d.status === "Received").length +
    missing.filter((m) => m.status === "RECEIVED").length;

  const loading = snapshotLoading || matterLoading;

  // Expandable second row (Phase 3)
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const missingCriticalHigh = (snapshot?.evidence?.missingEvidence ?? []).filter(
    (m) => m.priority === "CRITICAL" || m.priority === "HIGH"
  );
  const primaryStrategy = snapshot?.strategy?.primary;
  const fallbacks = snapshot?.strategy?.fallbacks ?? [];
  const pivotTriggers = snapshot?.strategy?.pivotTriggers ?? [];
  const nextSteps = snapshot?.actions?.nextSteps ?? [];
  const documents = snapshot?.evidence?.documents ?? [];

  return (
    <div className="space-y-3">
      {/* Case Snapshot row */}
      <Card className="rounded-xl border border-border/80 bg-muted/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading case overview...</span>
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 shrink-0">
                <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Offence:</span>
                <span className="font-medium text-foreground truncate max-w-[180px]" title={String(offence)}>
                  {offence}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Incident:</span>
                <span className="font-medium text-foreground">{formatDate(dateOfIncident)}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium text-foreground">{clientInitials}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Station:</span>
                <span className="font-medium text-foreground truncate max-w-[120px]" title={policeStation}>
                  {policeStation}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Next:</span>
                <span className="font-medium text-foreground">{nextHearing}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-primary/5 text-primary border-primary/20"
                >
                  {caseStatusLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Disclosure:</span>
                <span className="font-medium text-foreground">
                  Critical: {criticalCount} · High: {highCount} · Satisfied: {satisfiedCount}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Quick Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        {onUploadEvidence && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onUploadEvidence}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload evidence
          </Button>
        )}
        {onAddClientInstructions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onAddClientInstructions}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Add client instructions
          </Button>
        )}
        {onAddHearing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onAddHearing}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Add hearing
          </Button>
        )}
        {onGenerateLetter && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onGenerateLetter}
          >
            <Mail className="h-3.5 w-3.5" />
            Generate letter
          </Button>
        )}
        {onAddNote && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onAddNote}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Add note
          </Button>
        )}
      </div>

      {/* Phase 3: Expandable overview (Strategy Snapshot, Missing Disclosure, Missing Evidence, Key Evidence) */}
      <Card className="rounded-xl border border-border/80 bg-muted/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setOverviewExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/20 transition-colors"
          aria-expanded={overviewExpanded}
        >
          <span>Overview (detail)</span>
          {overviewExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        {overviewExpanded && (
          <div className="border-t border-border/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategy Snapshot */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Strategy snapshot
              </h4>
              <div className="text-sm space-y-1.5">
                <p>
                  <span className="text-muted-foreground">Primary: </span>
                  <span className="font-medium text-foreground">
                    {primaryStrategy ? strategyLabel(primaryStrategy) : "—"}
                  </span>
                </p>
                {fallbacks.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Secondary: </span>
                    <span className="font-medium text-foreground">
                      {fallbacks.map((f) => strategyLabel(f)).join(", ")}
                    </span>
                  </p>
                )}
                {pivotTriggers.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Triggers: </span>
                    <span className="text-foreground">{pivotTriggers.join(", ")}</span>
                  </p>
                )}
                {nextSteps.length > 0 ? (
                  <p>
                    <span className="text-muted-foreground">Next actions: </span>
                    <span className="text-foreground">{nextSteps.map((s) => s.title).join("; ")}</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">Next actions: See Strategy tab.</p>
                )}
              </div>
            </div>

            {/* Missing Disclosure summary (Critical & High) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Missing disclosure (Critical & High)
              </h4>
              {missingCriticalHigh.length === 0 ? (
                <p className="text-sm text-muted-foreground">None listed.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {missingCriticalHigh.map((m, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          m.priority === "CRITICAL"
                            ? "bg-red-500/10 text-red-700 border-red-500/30"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        }`}
                      >
                        {m.priority}
                      </Badge>
                      <span className="text-foreground">{m.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Missing Evidence (case file) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                Case file gaps
              </h4>
              {missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outstanding items.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {missing
                    .filter((m) => m.status !== "RECEIVED")
                    .map((m, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-foreground">{m.label}</span>
                        {m.status === "REQUESTED" && (
                          <span className="text-xs text-muted-foreground">(requested)</span>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Key Evidence Summary (placeholder until doc-type available) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5" />
                Key evidence / documents
              </h4>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents in bundle yet.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? "s" : ""} in bundle.
                  <span className="block mt-1 text-xs">
                    {documents.slice(0, 5).map((d) => d.name).join(", ")}
                    {documents.length > 5 ? ` +${documents.length - 5} more` : ""}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
