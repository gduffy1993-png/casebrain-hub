"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ListChecks,
  MessageSquareQuote,
  Scale,
  Target,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { AboveFoldSummaryProps } from "./AboveFoldSummary";

export type ControlRoomCockpitProps = AboveFoldSummaryProps & {
  caseTitle: string;
  clientLabel: string;
  riskLabel: string;
  safeCourtLine: string;
  onRecordPosition: () => void;
  onUploadEvidence: () => void;
  onExitClassic: () => void;
  hearingWarRoomHref?: string;
  battleboardSection: ReactNode;
  furtherActionsSection?: ReactNode;
};

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-800"
      : tone === "warning"
        ? "text-amber-800"
        : tone === "danger"
          ? "text-red-800"
          : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
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
  caseTitle,
  clientLabel,
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
  onRecordPosition,
  onUploadEvidence,
  onExitClassic,
  hearingWarRoomHref,
  battleboardSection,
  furtherActionsSection,
}: ControlRoomCockpitProps) {
  const topActions = immediateActions.slice(0, 3);
  const biggestRisk =
    defenceRisks[0] ??
    "Review served material — risks are provisional until solicitor confirms position.";

  return (
    <div className="space-y-4">
      <header className={`${workflowCard} overflow-hidden`}>
        <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Scale className="h-5 w-5 text-blue-700 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900 truncate">{caseTitle}</h1>
              <Badge variant="secondary" size="sm" className="bg-slate-100 text-slate-700">
                Control Room
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{clientLabel}</p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {loading ? "Loading allegation…" : allegation}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onExitClassic} className="bg-white">
              Classic workspace
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onUploadEvidence} className="bg-white">
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload
            </Button>
            <Button type="button" size="sm" onClick={onRecordPosition}>
              Record position
            </Button>
          </div>
        </div>
        <p className="px-4 pb-3 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="font-medium text-slate-600">Stage:</span> {loading ? "—" : stage}
          </span>
          <span>
            <span className="font-medium text-slate-600">Next hearing:</span> {loading ? "—" : nextHearing}
          </span>
        </p>
      </header>

      {(positionNotice || strategyBasisNotice) && (
        <div className="space-y-1">
          {positionNotice && (
            <p className="text-xs text-amber-900 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
              {positionNotice}
            </p>
          )}
          {strategyBasisNotice && (
            <p className={`text-xs ${workflowMuted} border border-slate-200 bg-white rounded-lg px-3 py-2`}>
              {strategyBasisNotice.label}
              {strategyBasisNotice.reason ? ` — ${strategyBasisNotice.reason}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatTile label="Bundle health" value={loading ? "—" : bundleLabel} />
        <StatTile label="Position status" value={loading ? "—" : positionLabel} />
        <StatTile label="Readiness" value={loading ? "—" : riskLabel} tone={readinessTone(riskLabel)} />
        <StatTile label="Disclosure chase" value={loading ? "—" : disclosureLabel} />
      </div>

      <div className={`${workflowCard} p-4 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white`}>
        <p className={`${workflowSectionTitle} flex items-center gap-1 text-blue-800/80`}>
          <Target className="h-3.5 w-3.5" />
          Primary defence pressure route
        </p>
        <p className="text-lg font-semibold text-slate-900 mt-1 leading-snug">{bestRouteTitle}</p>
        {routeStatus && (
          <Badge variant="secondary" size="sm" className="mt-2 bg-white/80">
            {routeStatus} — conditional on served material
          </Badge>
        )}
        {prosecutionWeakness.length > 0 && (
          <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-3">
            {prosecutionWeakness[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className={`${workflowCard} p-4 border-red-200/50 bg-red-50/30`}>
          <p className={`${workflowSectionTitle} text-red-800/80 flex items-center gap-1`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            Biggest risk / what could hurt us
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-800 list-disc pl-4">
            {(defenceRisks.length ? defenceRisks : [biggestRisk]).slice(0, 4).map((item, i) => (
              <li key={i} className="line-clamp-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={`${workflowCard} p-4`}>
          <p className={`${workflowSectionTitle} flex items-center gap-1`}>
            <ListChecks className="h-3.5 w-3.5" />
            Next 3 solicitor actions
          </p>
          <ol className="mt-2 space-y-2 text-sm text-slate-800 list-decimal pl-4">
            {topActions.map((item, i) => (
              <li key={i} className="line-clamp-3 pl-0.5">
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className={`${workflowCard} p-4 border-emerald-200/50 bg-emerald-50/40`}>
          <p className={`${workflowSectionTitle} text-emerald-900/80 flex items-center gap-1`}>
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Safe court line (today)
          </p>
          <blockquote className="mt-2 text-sm text-slate-800 leading-relaxed border-l-2 border-emerald-500/50 pl-3 italic">
            {loading ? "Loading provisional wording…" : safeCourtLine}
          </blockquote>
          <p className="text-[10px] text-slate-500 mt-2">Provisional · solicitor review · do not overstate</p>
          {hearingWarRoomHref ? (
            <div className="mt-3">
              <Link href={hearingWarRoomHref}>
                <Button type="button" size="sm" variant="outline" className="gap-1 text-emerald-900 border-emerald-300">
                  Open Hearing War Room
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {furtherActionsSection}

      {battleboardSection}
    </div>
  );
}
