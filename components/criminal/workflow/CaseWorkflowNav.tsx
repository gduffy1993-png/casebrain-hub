"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CaseWorkflowTabId } from "@/components/criminal/criminalCaseNavigation";
import { workflowCard, workflowPilotCard, workflowPilotNavActive, workflowPilotNavIdle } from "./workflowUi";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { useCaseWorkflowActiveTab } from "./useCaseWorkflowActiveTab";
import { usePilotMatterTabHref } from "./pilotDeskNavContext";

const PILOT_TABS: { id: CaseWorkflowTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "today", label: "Today" },
  { id: "papers", label: "Papers" },
  { id: "summary", label: "Summary" },
  { id: "disclosure-chase", label: "Chase" },
  { id: "file", label: "File" },
];

const LEGACY_TABS: { id: CaseWorkflowTabId; label: string }[] = [
  { id: "control-room", label: "Control Room" },
  { id: "battleboard", label: "Battleboard" },
  { id: "hearing-war-room", label: "Hearing War Room" },
  { id: "disclosure-chase", label: "Disclosure Chase" },
  { id: "documents", label: "Documents" },
  { id: "position", label: "Position / Notes" },
];

export function CaseWorkflowNav({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pilotMode = isCriminalPilotMode();
  const active = useCaseWorkflowActiveTab();
  const buildTabHref = usePilotMatterTabHref();

  const visibleTabs = pilotMode ? PILOT_TABS : LEGACY_TABS.filter((t) => t.id !== "position" && t.id !== "battleboard");

  return (
    <nav
      className={`${pilotMode ? workflowPilotCard : workflowCard} px-2 py-2 flex flex-wrap gap-1 ${pilotMode ? "border-slate-700/70" : "border-slate-200"}`}
      aria-label="Case workflow"
      data-testid="case-workflow-nav"
      data-pilot-mode={pilotMode ? "true" : "false"}
      data-active-tab={active}
      data-url-tab={searchParams.get("tab") ?? ""}
    >
      {visibleTabs.map((t) => {
        const href = buildTabHref(caseId, t.id);
        const isActive = active === t.id;
        return (
          <Link
            key={t.id}
            href={href}
            scroll={t.id === "file" || t.id === "documents" ? false : undefined}
            className={isActive ? workflowPilotNavActive : workflowPilotNavIdle}
            aria-current={isActive ? "page" : undefined}
            prefetch={pathname.startsWith("/cases/") || pathname.startsWith("/court-today")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
