"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  buildCourtTodayDeskHref,
  isValidCaseId,
} from "@/components/criminal/criminalCaseNavigation";
import { PilotMatterDesk } from "@/components/criminal/workflow/PilotMatterDesk";
import {
  workflowMuted,
  workflowPilotKpiTile,
  workflowSectionTitle,
} from "@/components/criminal/workflow/workflowUi";
import { CourtTodayReadinessBadge } from "./CourtTodayReadinessBadge";
import type { CourtCaseBrief } from "./types";

function MatterListItem({
  brief,
  selected,
  onSelect,
  testId = "court-today-matter-link",
}: {
  brief: CourtCaseBrief;
  selected: boolean;
  onSelect: () => void;
  testId?: string;
}) {
  const className = `w-full text-left rounded-lg border px-3 py-3 transition-colors ${
    selected
      ? "border-blue-500/70 bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30"
      : "border-slate-700/60 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/70"
  }`;

  return (
    <button type="button" onClick={onSelect} className={className} data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {brief.hearingTimeLabel ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-300 tabular-nums">
              {brief.hearingTimeLabel}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-slate-100 truncate">{brief.clientLabel}</p>
          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{brief.allegation}</p>
          <p className={`text-[11px] ${workflowMuted} mt-1 line-clamp-1`}>{brief.courtLabel}</p>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 ${selected ? "text-blue-400" : "text-slate-600"}`} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <CourtTodayReadinessBadge readiness={brief.readiness} pilotMode />
        {brief.chaseItems.length > 0 ? (
          <Badge variant="warning" size="sm">
            {brief.chaseItems.length} missing
          </Badge>
        ) : null}
        {brief.positionStatus.toLowerCase().includes("not recorded") ? (
          <Badge variant="danger" size="sm">
            Position not ready
          </Badge>
        ) : null}
      </div>
    </button>
  );
}

function DeskKpiRow({
  stats,
}: {
  stats: {
    today: number;
    red: number;
    missingItems: number;
    ready: number;
  };
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full">
      <div className={`${workflowPilotKpiTile} py-2 px-3 min-w-0`}>
        <p className={workflowSectionTitle}>Hearings today</p>
        <p className="text-lg font-semibold text-slate-100 tabular-nums mt-0.5">{stats.today}</p>
      </div>
      <div className={`${workflowPilotKpiTile} py-2 px-3 min-w-0`}>
        <p className={workflowSectionTitle}>At risk</p>
        <p className="text-lg font-semibold text-rose-400 tabular-nums mt-0.5">{stats.red}</p>
      </div>
      <div className={`${workflowPilotKpiTile} py-2 px-3 min-w-0`}>
        <p className={workflowSectionTitle}>Missing items</p>
        <p className="text-lg font-semibold text-amber-400 tabular-nums mt-0.5">{stats.missingItems}</p>
      </div>
      <div className={`${workflowPilotKpiTile} py-2 px-3 min-w-0`}>
        <p className={workflowSectionTitle}>Ready</p>
        <p className="text-lg font-semibold text-emerald-400 tabular-nums mt-0.5">{stats.ready}</p>
      </div>
    </div>
  );
}

export function CourtTodayPilotSplit({
  todayItems,
  tomorrowItems,
  allCaseItems,
  stats,
}: {
  todayItems: CourtCaseBrief[];
  tomorrowItems: CourtCaseBrief[];
  allCaseItems: CourtCaseBrief[];
  stats: {
    today: number;
    red: number;
    missingItems: number;
    ready: number;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const todaySectionItems = useMemo(() => {
    if (todayItems.length) return todayItems;
    return tomorrowItems;
  }, [todayItems, tomorrowItems]);

  const selectableBriefs = useMemo(
    () => [...todaySectionItems, ...allCaseItems],
    [todaySectionItems, allCaseItems],
  );

  const caseFromUrl = searchParams.get("case");
  const [selectedId, setSelectedId] = useState<string | null>(
    isValidCaseId(caseFromUrl) ? caseFromUrl : null,
  );

  useEffect(() => {
    if (!selectableBriefs.length) {
      setSelectedId(null);
      return;
    }
    const urlCase = searchParams.get("case");
    if (isValidCaseId(urlCase) && selectableBriefs.some((b) => b.caseId === urlCase)) {
      setSelectedId(urlCase);
      return;
    }
    const fallback = selectableBriefs[0]!.caseId;
    setSelectedId(fallback);
    router.replace(buildCourtTodayDeskHref(fallback, "overview"), { scroll: false });
  }, [selectableBriefs, searchParams, router]);

  const selectCase = useCallback(
    (caseId: string) => {
      setSelectedId(caseId);
      const tab = searchParams.get("tab");
      const deskTab =
        tab === "overview" ||
        tab === "today" ||
        tab === "papers" ||
        tab === "summary" ||
        tab === "disclosure-chase" ||
        tab === "file"
          ? tab
          : "overview";
      router.replace(buildCourtTodayDeskHref(caseId, deskTab), { scroll: false });
    },
    [router, searchParams],
  );

  const selected =
    selectableBriefs.find((b) => b.caseId === selectedId) ?? selectableBriefs[0] ?? null;

  return (
    <div
      className="flex flex-col md:flex-row md:items-stretch gap-0 rounded-xl border border-slate-700/70 bg-slate-950/50 min-h-[min(calc(100vh-10rem),920px)] overflow-hidden"
      data-testid="court-today-pilot-split"
    >
      <aside className="md:w-[min(300px,32%)] md:min-w-[248px] md:max-w-[320px] shrink-0 md:border-r border-slate-700/70 flex flex-col min-h-0 max-h-[42vh] md:max-h-none">
        <div className="flex-1 overflow-y-auto px-2 pb-3 md:sticky md:top-0 md:max-h-[calc(100vh-10rem)]">
          <div className="pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
              {todayItems.length ? "Today" : tomorrowItems.length ? "Next listed" : "Today"}
            </p>
          </div>
          <div className="space-y-2">
            {todaySectionItems.length ? (
              todaySectionItems.map((brief) => (
                <MatterListItem
                  key={brief.caseId}
                  brief={brief}
                  selected={brief.caseId === selected?.caseId}
                  onSelect={() => selectCase(brief.caseId)}
                />
              ))
            ) : (
              <p className="text-xs text-slate-500 px-2 py-2">No hearings listed for today.</p>
            )}
          </div>

          {allCaseItems.length > 0 ? (
            <>
              <div className="pt-4 pb-1 mt-2 border-t border-slate-700/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
                  All cases
                </p>
              </div>
              <div className="space-y-2 mt-1" data-testid="court-today-all-cases">
                {allCaseItems.map((brief) => (
                  <MatterListItem
                    key={brief.caseId}
                    brief={brief}
                    selected={brief.caseId === selected?.caseId}
                    onSelect={() => selectCase(brief.caseId)}
                    testId="court-today-all-case-link"
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col min-h-0 border-t md:border-t-0 border-slate-700/70">
        <div className="shrink-0 px-3 py-2 border-b border-slate-700/70 overflow-x-auto">
          <DeskKpiRow stats={stats} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-3">
          {selected ? (
            <PilotMatterDesk
              caseId={selected.caseId}
              deskSafeCourtLine={selected.safeCourtLine}
              deskChargeLine={selected.allegation}
            />
          ) : (
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              Select a matter from the list to open the workflow desk.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
