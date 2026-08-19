"use client";

import Link from "next/link";
import type { CaseWorkflowTabId } from "@/components/criminal/criminalCaseNavigation";
import { usePilotMatterTabHref } from "@/components/criminal/workflow/pilotDeskNavContext";
import { useCaseWorkflowActiveTab } from "@/components/criminal/workflow/useCaseWorkflowActiveTab";

const TABS: { id: CaseWorkflowTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "today", label: "Court Position" },
  { id: "papers", label: "Papers & Evidence" },
  { id: "summary", label: "Client Summary" },
  { id: "disclosure-chase", label: "CPS Chase" },
  { id: "file", label: "File & Preparation" },
];

export function SolicitorDashboardTabs({ caseId }: { caseId: string }) {
  const active = useCaseWorkflowActiveTab();
  const buildTabHref = usePilotMatterTabHref();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4"
      aria-label="Case workspace tabs"
      data-testid="solicitor-dashboard-tabs"
    >
      {TABS.map((t) => {
        const isActive = active === t.id || (t.id === "today" && active === "hearing-war-room");
        return (
          <Link
            key={t.id}
            href={buildTabHref(caseId, t.id)}
            className={`shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium transition ${
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
