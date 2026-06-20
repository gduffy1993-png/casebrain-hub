"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import {
  workflowTable,
  workflowTableWrap,
  workflowTd,
  workflowTh,
  workflowTrHover,
} from "@/components/criminal/workflow/workflowUi";
import { CourtTodayReadinessBadge } from "./CourtTodayReadinessBadge";
import { buildDefaultCriminalCaseHref } from "@/lib/criminal/case-workflow-zones";
import { buildCaseControlRoomHref } from "./courtCaseBrief";
import type { CourtCaseBrief } from "./types";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

function ChaseCell({ brief }: { brief: CourtCaseBrief }) {
  const n = brief.chaseItems.length;
  if (n === 0) return <span className="text-slate-500 text-xs">On file</span>;
  return (
    <span className="text-xs text-amber-800 font-medium">
      {n} item{n === 1 ? "" : "s"}
    </span>
  );
}

function SafeLineButton({ brief }: { brief: CourtCaseBrief }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen((v) => !v)}>
        <MessageSquare className="h-3 w-3 mr-1" />
        Safe line
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 shadow-lg">
          <p className="font-semibold text-slate-900 mb-1">Safe court line (provisional)</p>
          <p className="leading-relaxed">{brief.safeCourtLine}</p>
        </div>
      )}
    </div>
  );
}

function CourtTodayRow({ brief, pilotMode }: { brief: CourtCaseBrief; pilotMode?: boolean }) {
  if (pilotMode) {
    return (
      <tr className={workflowTrHover}>
        <td className={`${workflowTd} tabular-nums font-medium text-slate-900 w-[4.5rem]`}>
          {brief.hearingTimeLabel ?? "—"}
        </td>
        <td className={`${workflowTd} min-w-[8rem]`}>
          <p className="font-medium text-slate-900 line-clamp-1">{brief.clientLabel}</p>
        </td>
        <td className={`${workflowTd} max-w-[10rem]`}>
          <span className="line-clamp-2 text-xs">{brief.allegation}</span>
        </td>
        <td className={`${workflowTd} max-w-[8rem]`}>
          <span className="line-clamp-2 text-xs text-slate-600">{brief.courtLabel}</span>
        </td>
        <td className={`${workflowTd} max-w-[8rem]`}>
          <span className="line-clamp-2 text-xs text-slate-600">{brief.stage}</span>
        </td>
        <td className={workflowTd}>
          <CourtTodayReadinessBadge readiness={brief.readiness} pilotMode />
        </td>
        <td className={workflowTd}>
          <ChaseCell brief={brief} />
        </td>
        <td className={`${workflowTd} whitespace-nowrap`}>
          <Link href={buildDefaultCriminalCaseHref(brief.caseId)}>
            <Button type="button" size="sm" className="h-7 text-xs">
              Open matter
            </Button>
          </Link>
        </td>
      </tr>
    );
  }

  return (
    <tr className={workflowTrHover}>
      <td className={`${workflowTd} tabular-nums font-medium text-slate-900 w-[4.5rem]`}>
        {brief.hearingTimeLabel ?? "—"}
      </td>
      <td className={`${workflowTd} min-w-[8rem]`}>
        <p className="font-medium text-slate-900 line-clamp-1">{brief.clientLabel}</p>
        <p className="text-[11px] text-slate-500 line-clamp-1">{brief.caseTitle}</p>
      </td>
      <td className={`${workflowTd} max-w-[10rem]`}>
        <span className="line-clamp-2 text-xs">{brief.allegation}</span>
      </td>
      <td className={`${workflowTd} max-w-[8rem]`}>
        <span className="line-clamp-2 text-xs text-slate-600">{brief.stage}</span>
      </td>
      <td className={workflowTd}>
        <CourtTodayReadinessBadge readiness={brief.readiness} />
      </td>
      <td className={`${workflowTd} max-w-[11rem]`}>
        <span className="line-clamp-2 text-xs font-medium">{brief.primaryRouteTitle}</span>
      </td>
      <td className={`${workflowTd} max-w-[9rem]`}>
        <span className="line-clamp-2 text-xs text-slate-600">{brief.biggestRisk}</span>
      </td>
      <td className={workflowTd}>
        <ChaseCell brief={brief} />
      </td>
      <td className={`${workflowTd} whitespace-nowrap`}>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          <Link href={buildCaseControlRoomHref(brief.caseId)}>
            <Button type="button" size="sm" className="h-7 text-xs">
              Open
            </Button>
          </Link>
          <SafeLineButton brief={brief} />
        </div>
      </td>
    </tr>
  );
}

export function CourtTodayDiaryTable({
  items,
  pilotMode = isCriminalPilotMode(),
}: {
  items: CourtCaseBrief[];
  pilotMode?: boolean;
}) {
  if (items.length === 0) return null;

  return (
  <>
      <div className={`hidden md:block ${workflowTableWrap}`}>
        <table className={workflowTable}>
          <thead>
            <tr>
              <th className={workflowTh}>Time</th>
              <th className={workflowTh}>{pilotMode ? "Client" : "Client / matter"}</th>
              <th className={workflowTh}>{pilotMode ? "Charge" : "Offence"}</th>
              {pilotMode ? (
                <>
                  <th className={workflowTh}>Court</th>
                  <th className={workflowTh}>Stage</th>
                  <th className={workflowTh}>Risk</th>
                  <th className={workflowTh}>Missing</th>
                </>
              ) : (
                <>
                  <th className={workflowTh}>Stage</th>
                  <th className={workflowTh}>Readiness</th>
                  <th className={workflowTh}>Best pressure route</th>
                  <th className={workflowTh}>Key risk</th>
                  <th className={workflowTh}>Disclosure</th>
                </>
              )}
              <th className={workflowTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((brief) => (
              <CourtTodayRow key={brief.caseId} brief={brief} pilotMode={pilotMode} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden grid gap-2">
        {items.map((brief) => (
          <CourtTodayMobileRow key={brief.caseId} brief={brief} pilotMode={pilotMode} />
        ))}
      </div>
    </>
  );
}

function CourtTodayMobileRow({
  brief,
  pilotMode,
}: {
  brief: CourtCaseBrief;
  pilotMode?: boolean;
}) {
  if (pilotMode) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{brief.clientLabel}</p>
            <p className="text-xs text-slate-600 line-clamp-1">{brief.allegation}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {brief.hearingTimeLabel ?? brief.hearingLabel} · {brief.courtLabel}
            </p>
          </div>
          <CourtTodayReadinessBadge readiness={brief.readiness} pilotMode />
        </div>
        <p className="text-xs text-slate-600">{brief.stage}</p>
        <Link href={buildDefaultCriminalCaseHref(brief.caseId)} className="block">
          <Button type="button" size="sm" className="w-full h-8">
            Open matter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-sm">
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{brief.clientLabel}</p>
          <p className="text-xs text-slate-500">{brief.hearingTimeLabel ?? brief.hearingLabel}</p>
        </div>
        <CourtTodayReadinessBadge readiness={brief.readiness} />
      </div>
      <p className="text-xs text-slate-700 line-clamp-2">{brief.primaryRouteTitle}</p>
      <div className="flex gap-2">
        <Link href={buildCaseControlRoomHref(brief.caseId)} className="flex-1">
          <Button type="button" size="sm" className="w-full h-8">
            Open Control Room
          </Button>
        </Link>
      </div>
    </div>
  );
}
