"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ListChecks,
  MessageSquareQuote,
  Scale,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  workflowCard,
  workflowMuted,
  workflowPilotSurfaceCard,
  workflowSectionTitle,
} from "@/components/criminal/workflow/workflowUi";
import { pilotRouteStatusBadgeLabel } from "@/lib/criminal/pilot-workflow";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import type { AboveFoldSummaryProps } from "./AboveFoldSummary";

export type ControlRoomCockpitProps = AboveFoldSummaryProps & {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  courtLabel?: string;
  riskLabel: string;
  safeCourtLine: string;
  onExitClassic?: () => void;
  hideClassicWorkspace?: boolean;
  battleboardSection: ReactNode;
  furtherActionsSection?: ReactNode;
  metadataNote?: string;
  bundlePositionNote?: string | null;
  pilotDark?: boolean;
};

function StatTile({
  label,
  value,
  tone = "default",
  pilotDark = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  pilotDark?: boolean;
}) {
  const valueClass = pilotDark
    ? tone === "success"
      ? "text-emerald-400"
      : tone === "warning"
        ? "text-amber-400"
        : tone === "danger"
          ? "text-rose-400"
          : "text-slate-100"
    : tone === "success"
      ? "text-emerald-800"
      : tone === "warning"
        ? "text-amber-800"
        : tone === "danger"
          ? "text-red-800"
          : "text-slate-900";
  const shell = pilotDark
    ? "rounded-lg border border-slate-600/70 bg-slate-900/70 px-3 py-2.5"
    : "rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm";
  return (
    <div className={shell}>
      <p className={workflowSectionTitle}>{label}</p>
      <p className={`text-sm font-semibold mt-1 leading-snug line-clamp-2 ${valueClass}`}>{value}</p>
    </div>
  );
}

function readinessTone(riskLabel: string): "default" | "success" | "warning" | "danger" {
  const l = riskLabel.toLowerCase();
  if (l.includes("unsafe") || l.includes("collapse")) return "danger";
  if (l.includes("conditional") || l.includes("thin") || l.includes("review")) return "warning";
  if (l.includes("standard")) return "success";
  return "default";
}

export function ControlRoomCockpit({
  caseId,
  caseTitle,
  clientLabel,
  courtLabel,
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
  riskLabel,
  safeCourtLine,
  loading,
  onExitClassic,
  hideClassicWorkspace = false,
  battleboardSection,
  furtherActionsSection,
  metadataNote,
  bundlePositionNote,
  pilotDark = false,
}: ControlRoomCockpitProps) {
  const topActions = immediateActions.slice(0, 3);
  const biggestRisk =
    defenceRisks[0] ??
    "Review served material — risks are provisional until solicitor confirms position.";
  const cardShell = pilotDark ? workflowPilotSurfaceCard : workflowCard;
  const titleClass = pilotDark ? "text-lg font-semibold text-slate-100 truncate" : "text-lg font-semibold text-slate-900 truncate";
  const subClass = pilotDark ? "text-sm text-slate-300 mt-0.5" : "text-sm text-slate-600 mt-0.5";
  const metaClass = pilotDark ? "text-slate-400" : "text-slate-600";
  const bodyText = pilotDark ? "text-slate-200" : "text-slate-800";

  return (
    <div className="space-y-4">
      <header className={`${cardShell} overflow-hidden`}>
        <div
          className={`px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b ${
            pilotDark ? "border-slate-700/60 bg-slate-900/80" : "border-slate-100 bg-gradient-to-r from-slate-50 to-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Scale className={`h-5 w-5 shrink-0 ${pilotDark ? "text-blue-400" : "text-blue-700"}`} />
              <h1 className={titleClass}>{caseTitle}</h1>
              <Badge
                variant="secondary"
                size="sm"
                className={pilotDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}
              >
                Control Room
              </Badge>
            </div>
            <p className={subClass}>{clientLabel}</p>
            {allegation ? (
              <p className={`text-xs mt-1 line-clamp-2 ${pilotDark ? "text-slate-500" : "text-slate-500"}`}>
                {loading ? "Loading allegation…" : allegation}
              </p>
            ) : null}
          </div>
          {!hideClassicWorkspace ? (
            <div className="flex flex-wrap gap-2 shrink-0">
              {onExitClassic ? (
                <Button type="button" variant="ghost" size="sm" onClick={onExitClassic} className="text-slate-500">
                  Classic workspace
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className={`px-4 pb-3 text-xs flex flex-wrap gap-x-4 gap-y-1 ${pilotDark ? "text-slate-400" : "text-slate-500"}`}>
          {/* Pilot shell strip already owns court/hearing — omit duplicate meta when classic workspace is hidden. */}
          {!hideClassicWorkspace ? (
            <>
              <span>
                <span className={`font-medium ${metaClass}`}>Court:</span>{" "}
                {loading ? "—" : courtLabel ?? "Court not safely extracted"}
              </span>
              <span>
                <span className={`font-medium ${metaClass}`}>Stage:</span> {loading ? "—" : stage}
              </span>
              <span>
                <span className={`font-medium ${metaClass}`}>Next hearing:</span>{" "}
                {loading ? "—" : nextHearing}
              </span>
            </>
          ) : (
            <span>
              <span className={`font-medium ${metaClass}`}>Stage:</span> {loading ? "—" : stage}
            </span>
          )}
        </p>
        {metadataNote ? (
          <p className={`px-4 pb-2 text-[10px] border-t ${pilotDark ? "text-slate-500 border-slate-700/60" : "text-slate-400 border-slate-100"}`}>
            {metadataNote}
          </p>
        ) : null}
      </header>

      {(positionNotice || strategyBasisNotice) && (
        <div className="space-y-1">
          {positionNotice && (
            <p
              className={`text-xs rounded-lg px-3 py-2 ${
                pilotDark
                  ? "text-amber-200 border border-amber-700/50 bg-amber-950/40"
                  : "text-amber-900 border border-amber-200 bg-amber-50"
              }`}
            >
              {positionNotice}
            </p>
          )}
          {strategyBasisNotice && (
            <p
              className={`text-xs rounded-lg px-3 py-2 ${
                pilotDark
                  ? "text-slate-300 border border-slate-700/70 bg-slate-900/60"
                  : `${workflowMuted} border border-slate-200 bg-white`
              }`}
            >
              {strategyBasisNotice.label}
              {strategyBasisNotice.reason ? ` — ${strategyBasisNotice.reason}` : ""}
            </p>
          )}
        </div>
      )}

      {bundlePositionNote && !loading ? (
        <p className={`text-[11px] px-1 ${pilotDark ? "text-slate-500" : "text-slate-500"}`}>{bundlePositionNote}</p>
      ) : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatTile label="Bundle health" value={loading ? "—" : bundleLabel} pilotDark={pilotDark} />
        <StatTile label="Position status" value={loading ? "—" : positionLabel} pilotDark={pilotDark} />
        <StatTile label="Readiness" value={loading ? "—" : riskLabel} tone={readinessTone(riskLabel)} pilotDark={pilotDark} />
        <StatTile label="Disclosure chase" value={loading ? "—" : disclosureLabel} pilotDark={pilotDark} />
      </div>
      <div
        className={`${cardShell} p-4 ${
          pilotDark
            ? "border-blue-700/40 bg-gradient-to-br from-blue-950/50 to-slate-900/60"
            : "border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white"
        }`}
      >
        <p className={`${workflowSectionTitle} flex items-center gap-1 ${pilotDark ? "text-blue-300/90" : "text-blue-800/80"}`}>
          <Target className="h-3.5 w-3.5" />
          Primary defence pressure route
        </p>
        <p className={`text-lg font-semibold mt-1 leading-snug ${pilotDark ? "text-slate-100" : "text-slate-900"}`}>
          {bestRouteTitle}
        </p>
        {routeStatus && (
          <Badge variant="secondary" size="sm" className={`mt-2 ${pilotDark ? "bg-slate-800/80 text-slate-200" : "bg-white/80"}`}>
            {isCriminalPilotMode()
              ? pilotRouteStatusBadgeLabel(routeStatus)
              : `${routeStatus} — conditional on served material`}
          </Badge>
        )}
        {prosecutionWeakness.length > 0 && (
          <p className={`text-xs mt-3 leading-relaxed line-clamp-3 ${pilotDark ? "text-slate-400" : "text-slate-600"}`}>
            {prosecutionWeakness[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div
          className={`${cardShell} p-4 ${
            pilotDark ? "border-red-800/40 bg-red-950/25" : "border-red-200/50 bg-red-50/30"
          }`}
        >
          <p className={`${workflowSectionTitle} flex items-center gap-1 ${pilotDark ? "text-red-300/90" : "text-red-800/80"}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            Biggest risk / what could hurt us
          </p>
          <ul className={`mt-2 space-y-1.5 text-sm list-disc pl-4 ${bodyText}`}>
            {(defenceRisks.length ? defenceRisks : [biggestRisk]).slice(0, 4).map((item, i) => (
              <li key={i} className="line-clamp-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={`${cardShell} p-4`}>
          <p className={`${workflowSectionTitle} flex items-center gap-1`}>
            <ListChecks className="h-3.5 w-3.5" />
            Next 3 solicitor actions
          </p>
          <ol className={`mt-2 space-y-2 text-sm list-decimal pl-4 ${bodyText}`}>
            {topActions.map((item, i) => (
              <li key={i} className="line-clamp-3 pl-0.5">
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div
          className={`${cardShell} p-4 ${
            pilotDark ? "border-emerald-800/40 bg-emerald-950/20" : "border-emerald-200/50 bg-emerald-50/40"
          }`}
        >
          <p className={`${workflowSectionTitle} flex items-center gap-1 ${pilotDark ? "text-emerald-300/90" : "text-emerald-900/80"}`}>
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Safe court line (today)
          </p>
          <blockquote
            className={`mt-2 text-sm leading-relaxed border-l-2 pl-3 italic ${
              pilotDark ? "text-slate-200 border-emerald-600/50" : "text-slate-800 border-emerald-500/50"
            }`}
          >
            {loading ? "Loading provisional wording…" : safeCourtLine}
          </blockquote>
          <p className={`text-[10px] mt-2 ${pilotDark ? "text-slate-500" : "text-slate-500"}`}>
            Provisional · solicitor review · do not overstate
          </p>
        </div>
      </div>

      {furtherActionsSection}

      {battleboardSection}
    </div>
  );
}
