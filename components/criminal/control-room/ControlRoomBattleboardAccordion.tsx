"use client";

import Link from "next/link";
import { ChevronRight, Loader2, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StrategyBattleboard } from "@/components/criminal/StrategyBattleboard";
import { buildCaseWorkflowTabHref } from "@/components/criminal/criminalCaseNavigation";
import { workflowCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { ReactNode } from "react";

export type ControlRoomBattleboardAccordionProps = {
  caseId: string;
  battleboard: BattleboardOutput | null;
  battleboardLoading: boolean;
  riskOverviewSection?: ReactNode;
  /** Preview = compact card in Control Room; full = Battleboard tab only. */
  variant?: "preview" | "full";
};

function overallStatusLabel(status: BattleboardOutput["overall_status"] | undefined): string {
  switch (status) {
    case "usable":
      return "Routes on file";
    case "thin_bundle":
      return "Thin bundle — provisional";
    case "needs_review":
      return "Needs review";
    default:
      return "Routes";
  }
}

export function ControlRoomBattleboardAccordion({
  caseId,
  battleboard,
  battleboardLoading,
  riskOverviewSection,
  variant = "preview",
}: ControlRoomBattleboardAccordionProps) {
  const pilotMode = isCriminalPilotMode();
  const isFull = variant === "full";
  const sectionTitle = pilotMode ? "Route detail" : isFull ? "Full Battleboard" : "Battleboard preview";
  const sectionSubtitle = pilotMode
    ? "Detailed route reasoning"
    : isFull
      ? "Deep strategy — route breakdown"
      : "Primary route and backups — open tab for full detail";

  const backupRoutes =
    battleboard?.routes.filter((r) => r.id !== battleboard.primary_route?.id).slice(0, 2) ?? [];
  const totalBackups =
    battleboard?.routes.filter((r) => r.id !== battleboard.primary_route?.id).length ?? 0;

  if (isFull) {
    return (
      <section
        className={workflowCard}
        aria-label={sectionTitle}
        data-testid="control-room-battleboard-full"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Swords className="h-4 w-4 text-blue-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">{sectionTitle}</h2>
              <p className="text-[11px] text-slate-500">{sectionSubtitle}</p>
            </div>
          </div>
          {battleboard ? (
            <Badge variant="secondary" size="sm" className="bg-white text-slate-700 shrink-0">
              {overallStatusLabel(battleboard.overall_status)}
            </Badge>
          ) : null}
        </div>
        <div className="px-4 py-4 space-y-4">
          {battleboardLoading ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading route detail…
            </p>
          ) : (
            <>
              <StrategyBattleboard
                caseId={caseId}
                battleboardData={battleboard}
                battleboardLoading={battleboardLoading}
                hidePositionNotice
                hidePrimaryRoute
                lightWorkflow
                bare
                compact={false}
              />
              {riskOverviewSection}
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={workflowCard}
      aria-label={sectionTitle}
      data-testid="control-room-battleboard-preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Swords className="h-4 w-4 text-blue-700 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{sectionTitle}</h2>
            <p className="text-[11px] text-slate-500">{sectionSubtitle}</p>
          </div>
        </div>
        {battleboard ? (
          <Badge variant="secondary" size="sm" className="bg-white text-slate-700 shrink-0">
            {overallStatusLabel(battleboard.overall_status)}
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-3">
        {battleboardLoading ? (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading routes…
          </p>
        ) : battleboard ? (
          <>
            {battleboard.primary_route ? (
              <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <p className={workflowSectionTitle}>Primary route</p>
                <p className="text-sm font-medium text-slate-900 mt-1 line-clamp-2">
                  {battleboard.primary_route.title}
                </p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">
                  {battleboard.primary_route.status}
                </p>
              </div>
            ) : battleboard.solicitor_safe_summary ? (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {battleboard.solicitor_safe_summary}
              </p>
            ) : null}

            {backupRoutes.length > 0 ? (
              <div>
                <p className={workflowSectionTitle}>Backup routes (preview)</p>
                <ul className="mt-1.5 space-y-1">
                  {backupRoutes.map((route) => (
                    <li
                      key={route.id}
                      className="text-xs text-slate-800 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="font-medium line-clamp-1">{route.title}</span>
                      <span className="text-[10px] text-slate-500 uppercase shrink-0">
                        {route.status}
                      </span>
                    </li>
                  ))}
                </ul>
                {totalBackups > backupRoutes.length ? (
                  <p className="text-[10px] text-slate-500 mt-1">
                    +{totalBackups - backupRoutes.length} more route
                    {totalBackups - backupRoutes.length === 1 ? "" : "s"} on file
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-slate-500">Route cards not loaded yet.</p>
        )}

        {!pilotMode ? (
          <Link
            href={buildCaseWorkflowTabHref(caseId, "battleboard")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-blue-700 text-white hover:bg-blue-800 w-full sm:w-auto"
          >
            <ChevronRight className="h-3.5 w-3.5 mr-1" />
            Open Full Battleboard
          </Link>
        ) : null}
      </div>
    </section>
  );
}
