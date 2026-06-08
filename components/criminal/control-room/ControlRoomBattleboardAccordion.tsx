"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Loader2, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StrategyBattleboard } from "@/components/criminal/StrategyBattleboard";
import { workflowCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

export type ControlRoomBattleboardAccordionProps = {
  caseId: string;
  battleboard: BattleboardOutput | null;
  battleboardLoading: boolean;
  riskOverviewSection?: ReactNode;
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
}: ControlRoomBattleboardAccordionProps) {
  const [open, setOpen] = useState(false);
  const pilotMode = isCriminalPilotMode();
  const sectionTitle = pilotMode ? "Route detail" : "Full Battleboard";
  const sectionSubtitle = pilotMode
    ? "Detailed route reasoning — optional"
    : "Deep strategy — optional detail";
  const openLabel = pilotMode ? "Open route detail" : "Open Full Battleboard";
  const collapseLabel = pilotMode ? "Collapse route detail" : "Collapse Battleboard";

  const backupRoutes =
    battleboard?.routes.filter((r) => r.id !== battleboard.primary_route?.id).slice(0, 2) ?? [];
  const totalBackups =
    battleboard?.routes.filter((r) => r.id !== battleboard.primary_route?.id).length ?? 0;

  return (
    <section
      id="full-battleboard"
      className={workflowCard}
      aria-label={sectionTitle}
      data-testid="control-room-battleboard-accordion"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Swords className="h-4 w-4 text-blue-700 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{sectionTitle}</h2>
            <p className="text-[11px] text-slate-500">{sectionSubtitle}</p>
          </div>
        </div>
        {!open && battleboard && (
          <Badge variant="secondary" size="sm" className="bg-white text-slate-700 shrink-0">
            {overallStatusLabel(battleboard.overall_status)}
          </Badge>
        )}
      </div>

      {!open && (
        <div className="px-4 py-3 space-y-3">
          {battleboardLoading ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading route detail…
            </p>
          ) : battleboard ? (
            <>
              {battleboard.solicitor_safe_summary && (
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {battleboard.solicitor_safe_summary}
                </p>
              )}
              {backupRoutes.length > 0 && (
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
                  {totalBackups > backupRoutes.length && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      +{totalBackups - backupRoutes.length} more route
                      {totalBackups - backupRoutes.length === 1 ? "" : "s"} on file
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Route cards not loaded yet — open to review backup routes and collapse risks.
            </p>
          )}

          {!pilotMode && (
            <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              {openLabel}
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-2 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              {collapseLabel}
            </Button>
          </div>
          <div className="px-4 pb-4 space-y-4">
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
          </div>
        </div>
      )}
    </section>
  );
}
